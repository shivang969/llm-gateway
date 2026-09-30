# 🚀 NEXUS LLM Gateway — Live CV & Interview Presentation Guide

This guide gives you an interview walkthrough and demonstration script to present your **LLM API Gateway** project during technical interviews, portfolio demos, or system design evaluations.

---

## ⚡ Quick Start (1-Click Launch)

Run the demo launcher from the project root:

```bash
./start_demo.sh
```

Or manually:
```bash
../venv/bin/python -m uvicorn app.main:app --reload --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🎯 5-Minute Interview Showcase Flow

### **Minute 1: The Problem & High-Level Architecture**
> *"In production systems, directly connecting client applications to upstream LLM APIs leads to single-point-of-failure outages, runaway bills, lack of per-team rate limits, and zero central observability. I designed and built this Enterprise LLM Reverse-Proxy Gateway to solve these problems."*

1. **Header & Status**: Point out the live operational pill, system latency stopwatch, and active tenant context (`team-alpha-key` vs `team-beta-key`).
2. **Top Navigation**: Introduce the 6 dedicated modules: Playground, Routing Topology, Telemetry, Audit Logs, Quotas, and Code Studio.

---

### **Minute 2: Live Inference & Streaming in the Playground**
> *"Let's test sub-second inference with live Server-Sent Events (SSE) token streaming."*

1. Click the **"⚡ Sub-Second Ping"** preset button.
2. Click **"Execute Gateway Proxy"**.
3. Point out the **Pipeline Stepper** animating across the 5 micro-stages:
   - `[1] Bearer Auth Verified`
   - `[2] Budget Approved`
   - `[3] Token Bucket (TPM) Verified`
   - `[4] Smart Router Dispatched`
   - `[5] SQLite Audit Logged`
4. Show the **Live Telemetry Banner**: Latency (~300–500ms), Tokens consumed, and exact fractional dollar cost computed in real time.

---

### **Minute 3: Automated Failover & Self-Healing (The "Wow" Factor)**
> *"What happens when an upstream provider like Groq has an unexpected 503 outage or rate limit? Watch how the gateway self-heals."*

1. Click the **"🛡️ Simulate Failover"** preset button (targets `fail-test-model`).
2. Click **"Execute Gateway Proxy"**.
3. Point out:
   - The primary provider fails intentionally.
   - The gateway intercepts the exception without crashing the client.
   - The router automatically switches to the secondary fallback model (`qwen/qwen3.8-27b`).
   - The status pill turns amber: `200 OK (Failover Success)`.
   - The model label updates: `qwen/qwen3.8-27b (fallback from fail-test-model)`.

---

### **Minute 4: Interactive Architecture Topology & Rate Limiting**
> *"Let's look at the architectural wiring and hardware rate-limiting policies."*

1. Switch to the **"Routing Topology & Failover"** tab:
   - Click **"Simulate Normal Flow"** to show a green packet pulsing through the primary wire.
   - Click **"Simulate Primary Outage & Failover"** to show the Groq node turn red with an outage alarm while the packet re-routes through the amber fallback path.
2. Switch to the **"Quotas & Rate Limiter"** tab:
   - Explain the multi-tenant tiers:
     - **Team Alpha**: Strict quota (150 TPM, $1.00 budget).
     - **Team Beta**: Enterprise quota (50,000 TPM, $50.00 budget).
   - Click **"Spam Burst (Trigger HTTP 429 Rate Limit)"**:
     - The gateway fires a burst of token-heavy requests.
     - A modal pops up displaying the exact **HTTP 429 Too Many Requests** response with the standard `Retry-After: XXs` header!

---

### **Minute 5: Observability Audit Trail & Drop-In SDK**
> *"Every single request is tracked for auditing, compliance, and billing."*

1. Switch to the **"Audit Logs & Traces"** tab:
   - Show the searchable, filterable table backed by `gateway_logs.db`.
   - Filter by status (`Fallback Recovered`, `Success`) or search by model.
   - Click **"Inspect"** on any row to open the raw JSON trace showing latency, cost, and timestamps.
2. Switch to the **"API & cURL Studio"** tab:
   - Highlight that existing codebases only need to change their `base_url`:
     ```python
     client = OpenAI(base_url="http://localhost:8000/v1", api_key="team-alpha-key")
     ```
   - Show cURL and Node.js drop-in code snippets.

---

## 🛠️ Technical Stack Summary for CV

- **Backend**: Python 3.13, FastAPI (Async ASGI), HTTPX, Pydantic V2, SQLite.
- **Middleware**: Dual-Engine Token Bucket Rate Limiter (Redis + In-Memory Fallback), Budget Enforcer (Financial guardrails).
- **Inference Engines**: Groq LPU (Sub-500ms Ultra-Fast Inference), OpenRouter / Fallback Redundancy.
- **Frontend**: Modern SPA with Vanilla CSS, Cybernetic Dark Theme, Glassmorphism, SSE Streaming, Animated SVG Topology.
- **Protocol**: OpenAI Chat Completions API v1 (`/v1/chat/completions`).
