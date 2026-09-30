import os
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

from app.models.schemas import ChatCompletionRequest, ChatCompletionResponse
from app.services.providers.groq import GroqProvider
from app.services.providers.openrouter import OpenRouterProvider
from app.middleware.rate_limit import RateLimiter
from app.services.logger import log_request, get_recent_logs, get_stats, seed_demo_logs, clear_logs

router = APIRouter()
rate_limiter = RateLimiter()
security = HTTPBearer(auto_error=False)

TEAMS_CONFIG = {
    "team-alpha-key": {"id": "team-alpha", "name": "Alpha Tier (Strict Quotas)", "tpm": 150, "budget": 1.00}, 
    "team-beta-key":  {"id": "team-beta",  "name": "Beta Tier (Enterprise High-TPM)", "tpm": 50000, "budget": 50.00},
}

FALLBACK_MODEL_MAP = {
    "llama3-8b-8192": "qwen/qwen3.8-27b",
    "llama-3.1-8b-instant": "qwen/qwen3.8-27b",
    "llama3-70b-8192": "qwen/qwen3.8-27b",
    "mixtral-8x7b-32768": "qwen/qwen3.8-27b",
    "fail-test-model": "qwen/qwen3.8-27b",
    "primary-outage-simulation": "qwen/qwen3.8-27b"
}

AVAILABLE_MODELS = [
    {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen 3.8 27B (Groq LPU - Recommended)",
        "provider": "Groq",
        "description": "Blazing fast <0.5s inference for direct conversational generation",
        "status": "operational",
        "speed": "Ultra-Fast (~500 tok/s)",
        "recommended": True
    },
    {
        "id": "openai/gpt-oss-20b",
        "name": "GPT-OSS 20B (Groq LPU Reasoning)",
        "provider": "Groq",
        "description": "Deep reasoning model on Groq hardware",
        "status": "operational",
        "speed": "Ultra-Fast (~800 tok/s)",
        "recommended": False
    },
    {
        "id": "meta-llama/llama-3-8b-instruct:free",
        "name": "Llama 3 8B Instruct (OpenRouter Free Tier)",
        "provider": "OpenRouter",
        "description": "OpenRouter community free tier model",
        "status": "available",
        "speed": "Standard (~60 tok/s)",
        "recommended": False
    },
    {
        "id": "fail-test-model",
        "name": "⚠️ Simulate Primary Outage (Triggers Auto-Failover)",
        "provider": "Simulated Primary Outage",
        "description": "Deliberately triggers an upstream failure to demonstrate self-healing auto-failover in real time",
        "status": "simulation",
        "speed": "Failover Trigger",
        "recommended": False
    }
]

@router.post("/v1/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(
    request: ChatCompletionRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    # Start the stopwatch for latency tracking
    start_time = time.time()
    
    # Extract API key or default to team-alpha-key for smooth demo testing
    api_key = credentials.credentials if credentials else "team-alpha-key"
    team = TEAMS_CONFIG.get(api_key)
    if not team:
        # Fallback check if user passed team ID directly as key
        for k, v in TEAMS_CONFIG.items():
            if v["id"] == api_key:
                team = v
                break
        if not team:
            raise HTTPException(status_code=401, detail=f"Invalid team API key: '{api_key}'. Valid demo keys: team-alpha-key, team-beta-key")

    await rate_limiter.check_budget(team_id=team["id"], max_budget_usd=team["budget"])
    
    tokens_to_claim = request.max_tokens or 100
    await rate_limiter.check_rate_limit(team_id=team["id"], tokens_requested=tokens_to_claim, max_tokens_per_minute=team["tpm"])

    groq_provider = GroqProvider(api_key=os.getenv("GROQ_API_KEY", ""))
    openrouter_provider = OpenRouterProvider(api_key=os.getenv("OPENROUTER_API_KEY", ""))

    # Routing logic:
    # If the user is running the intentional failover simulation
    if request.model == "fail-test-model" or "fail" in request.model.lower():
        is_simulation = True
    else:
        is_simulation = False

    if "openrouter" in request.model.lower() or ":free" in request.model.lower() or "google" in request.model.lower():
        primary_provider = openrouter_provider
        fallback_provider = groq_provider
    else:
        primary_provider = groq_provider
        fallback_provider = openrouter_provider

    if not is_simulation and not primary_provider.api_key:
        raise HTTPException(status_code=500, detail="Missing API key for primary provider.")

    try:
        if is_simulation:
            raise Exception("Primary provider HTTP 503 Outage Simulation triggered by Gateway Policy tester")

        if request.stream:
            return StreamingResponse(primary_provider.stream(request), media_type="text/event-stream")
        else:
            response = await primary_provider.generate(request)
            latency = time.time() - start_time
            
            # Calculate cost ($0.00000005 per token default if missing)
            total_tokens = response.usage["total_tokens"] if response.usage and "total_tokens" in response.usage else tokens_to_claim
            cost = float(response.usage["cost"]) if response.usage and "cost" in response.usage else round(total_tokens * 0.00000006, 6)
            
            await rate_limiter.add_spend(team_id=team["id"], cost=cost)
            
            # Log the successful primary request
            log_request(
                team_id=team["id"], model=response.model, 
                total_tokens=total_tokens, cost=cost, 
                latency=latency, status="success"
            )
                
            return response

    except Exception as primary_error:
        print(f"[WARN] Primary Provider Failed: {primary_error}. Triggering Fallback...")
        original_model = request.model

        # Determine target fallback model
        fallback_model = FALLBACK_MODEL_MAP.get(original_model, "openai/gpt-oss-20b")
        request.model = fallback_model

        # Attempt secondary provider
        try:
            # Check if fallback provider has key; if not or if openrouter throws, failover to secondary operational Groq model
            active_fallback_provider = fallback_provider
            if not active_fallback_provider.api_key or (active_fallback_provider == openrouter_provider and not os.getenv("OPENROUTER_API_KEY")):
                active_fallback_provider = groq_provider

            if request.stream:
                return StreamingResponse(active_fallback_provider.stream(request), media_type="text/event-stream")
            else:
                try:
                    response = await active_fallback_provider.generate(request)
                except Exception as inner_fb_err:
                    # If OpenRouter failed, attempt Groq fallback model as last-resort self-healing
                    if active_fallback_provider != groq_provider and groq_provider.api_key:
                        request.model = "openai/gpt-oss-20b"
                        response = await groq_provider.generate(request)
                    else:
                        raise inner_fb_err

                latency = time.time() - start_time
                response.model = f"{response.model} (fallback from {original_model})"
                
                total_tokens = response.usage["total_tokens"] if response.usage and "total_tokens" in response.usage else tokens_to_claim
                cost = float(response.usage["cost"]) if response.usage and "cost" in response.usage else round(total_tokens * 0.00000006, 6)
                
                await rate_limiter.add_spend(team_id=team["id"], cost=cost)
                
                # Log the successful fallback request
                log_request(
                    team_id=team["id"], model=response.model, 
                    total_tokens=total_tokens, cost=cost, 
                    latency=latency, status="fallback_success"
                )
                    
                return response
            
        except Exception as fallback_error:
            latency = time.time() - start_time
            
            # Log the total failure
            log_request(
                team_id=team["id"], model=original_model, 
                total_tokens=0, cost=0.0, 
                latency=latency, status="total_failure"
            )
            
            raise HTTPException(
                status_code=502, 
                detail=f"All providers failed. Primary Error: {primary_error} | Fallback Error: {fallback_error}"
            )

# =========================================================================
# DASHBOARD & TELEMETRY API ENDPOINTS FOR THE LIVE SHOWCASE
# =========================================================================

@router.get("/api/stats")
async def get_dashboard_stats():
    """Aggregated gateway telemetry: requests, latencies, tokens, spend, health."""
    stats = get_stats()
    
    # Check current system status
    groq_configured = bool(os.getenv("GROQ_API_KEY"))
    openrouter_configured = bool(os.getenv("OPENROUTER_API_KEY"))
    
    stats["system_health"] = {
        "status": "healthy",
        "providers": {
            "groq": {"name": "Groq LPU", "status": "active" if groq_configured else "missing_key"},
            "openrouter": {"name": "OpenRouter", "status": "active" if openrouter_configured else "missing_key"}
        },
        "rate_limiter_mode": "redis" if rate_limiter.redis_available is True else "in_memory_resilient",
        "primary_provider": "Groq LPU",
        "fallback_provider": "OpenRouter / Groq Backup"
    }
    return stats

@router.get("/api/logs")
async def get_dashboard_logs(
    limit: int = Query(50, ge=1, le=200),
    team_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Retrieve audit logs from gateway_logs.db with optional filtering."""
    logs = get_recent_logs(limit=limit, team_id=team_id, status=status, search=search)
    return {"logs": logs, "count": len(logs)}

@router.get("/api/teams")
async def get_dashboard_teams():
    """Get active team policies, current minute TPM, and budget depletion."""
    teams_data = []
    for key, team in TEAMS_CONFIG.items():
        usage = await rate_limiter.get_team_usage(team["id"])
        teams_data.append({
            "id": team["id"],
            "name": team["name"],
            "key": key,
            "tpm_limit": team["tpm"],
            "budget_limit": team["budget"],
            "current_tpm": usage["current_tpm"],
            "current_spend": round(usage["current_spend"], 6),
            "spend_percent": min(100.0, round((usage["current_spend"] / team["budget"]) * 100, 2)) if team["budget"] > 0 else 0,
            "tpm_percent": min(100.0, round((usage["current_tpm"] / team["tpm"]) * 100, 2)) if team["tpm"] > 0 else 0
        })
    return {"teams": teams_data, "redis_connected": rate_limiter.redis_available is True}

@router.get("/api/models")
async def get_gateway_models():
    """Returns available routing models and fallback topology."""
    return {
        "models": AVAILABLE_MODELS,
        "fallback_map": FALLBACK_MODEL_MAP
    }

@router.post("/api/reset-demo")
async def reset_demo_data():
    """Seeds rich historical audit logs and resets counters for a pristine presentation."""
    seed_demo_logs()
    # Reset in-memory trackers
    rate_limiter._memory_tpm.clear()
    rate_limiter._memory_spend.clear()
    return {"status": "success", "message": "Demo data successfully seeded! Ready for CV presentation."}

@router.post("/api/clear-logs")
async def clear_audit_logs():
    """Clears all audit logs from the database."""
    clear_logs()
    rate_limiter._memory_tpm.clear()
    rate_limiter._memory_spend.clear()
    return {"status": "success", "message": "Audit logs cleared."}