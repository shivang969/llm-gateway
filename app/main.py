import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.routes import router as api_router
from app.services.logger import get_stats, seed_demo_logs

app = FastAPI(
    title="LLM API Gateway & Control Plane",
    description="An enterprise reverse-proxy for LLMs featuring rate limiting, fallback routing, cost tracking, and telemetry.",
    version="1.0.0"
)

# Enable CORS for browser playground and clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register our API routes
app.include_router(api_router)

# Mount static frontend assets
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.on_event("startup")
async def startup_event():
    # If the database has 0 logs, seed a few realistic demo records for instant presentation readiness
    try:
        stats = get_stats()
        if stats["total_requests"] == 0:
            seed_demo_logs()
    except Exception as e:
        print(f"[WARN] Startup seed failed: {e}")

@app.get("/")
async def serve_index():
    """Serves the interactive Gateway Control Plane frontend."""
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "LLM API Gateway running. Frontend index.html initializing..."}

@app.get("/dashboard")
async def serve_dashboard():
    """Alias for dashboard frontend."""
    return await serve_index()

@app.get("/health")
async def health_check():
    """Simple health check endpoint for load balancers."""
    return {"status": "healthy", "service": "llm-gateway", "version": "1.0.0"}