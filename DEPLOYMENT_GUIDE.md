# 🌐 Cloud Deployment Guide — NEXUS LLM Gateway

Deploy your **NEXUS LLM Gateway & Control Plane** online with free hosting, continuous deployment (CI/CD), and public HTTPS URLs.

---

## 🎯 Recommended Option: Render (Free Tier)

Render allows you to deploy directly from your GitHub repository `shivang969/llm-gateway` in under 3 minutes.

### 🌟 Method A: 1-Click Blueprint (Fastest & Automated)

Since this repository includes [`render.yaml`](./render.yaml), Render can automatically configure the service, build steps, and health checks.

1. **Push your latest changes to GitHub**:
   ```bash
   git add .
   git commit -m "Configure production deployment for Render & Docker"
   git push origin main
   ```

2. **Open Render Dashboard**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) (Sign in with your GitHub account).

3. **Deploy with Blueprint**:
   - Click the **"New +"** button at the top right.
   - Select **"Blueprint"**.
   - Choose your repository: `shivang969/llm-gateway`.
   - Render will detect `render.yaml` and parse:
     - **Service Name:** `llm-gateway`
     - **Environment:** `Python 3.11`
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - **Health Check Path:** `/health`
   - Under **Environment Variables**, fill in your credentials:
     - `GROQ_API_KEY`: Your Groq API key (`gsk_...` from [console.groq.com/keys](https://console.groq.com/keys))
     - `OPENROUTER_API_KEY` (Optional): Fallback key (`sk-or-v1-...` from [openrouter.ai/keys](https://openrouter.ai/keys))
     - `REDIS_URL` (Optional): Upstash / Render Redis URL (if omitted, in-memory dual-engine fallback runs automatically)
   - Click **"Apply"**.

4. **Your Gateway is LIVE!**
   - Render will build the dependencies and provide your public URL:
     `https://llm-gateway-xxxx.onrender.com`
   - Open that URL in your browser to view the interactive control plane dashboard!

---

### 🛠️ Method B: Manual Web Service Setup (Alternative)

If you prefer to configure the Web Service manually on Render:

1. In Render, click **"New +"** -> **"Web Service"**.
2. Connect your GitHub repository: `shivang969/llm-gateway`.
3. Configure the settings:
   | Setting | Value |
   | :--- | :--- |
   | **Name** | `nexus-llm-gateway` (or any custom name) |
   | **Region** | Choose closest to you (e.g. Frankfurt, Oregon, Singapore) |
   | **Branch** | `main` |
   | **Runtime** | `Python` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | **Instance Type** | `Free` |
4. Scroll to **Environment Variables** and add:
   - `GROQ_API_KEY` = your Groq key
   - `OPENROUTER_API_KEY` = your OpenRouter key (optional)
   - `PYTHON_VERSION` = `3.11.9`
5. Click **"Deploy Web Service"**.

---

## 🐳 Option 2: Docker Container Deployment

If you want to deploy to any Docker-compatible cloud (Railway, Fly.io, Koyeb, AWS ECS, GCP Cloud Run, or VPS):

This repository includes a multi-stage production [`Dockerfile`](./Dockerfile).

### Run Locally with Docker:
```bash
# Build Docker image
docker build -t llm-gateway .

# Run container with environment keys
docker run -p 8000:8000 \
  -e GROQ_API_KEY="gsk_..." \
  -e OPENROUTER_API_KEY="sk-or-v1-..." \
  llm-gateway
```
Access at `http://localhost:8000`.

---

## 📡 Verifying Your Live Deployment

Once deployed, verify your endpoints using your live Render URL (e.g. `https://llm-gateway.onrender.com`):

1. **Health Check Endpoint**:
   ```bash
   curl https://<your-render-url>/health
   # Expected: {"status":"healthy","service":"llm-gateway","version":"1.0.0"}
   ```

2. **Frontend Control Plane**:
   - Visit `https://<your-render-url>` in any web browser.
   - Run a test inference in the **Interactive Playground**.
   - Check real-time latency, token usage, cost analytics, and SQLite audit logs.

3. **External OpenAI SDK Drop-in Call**:
   ```python
   from openai import OpenAI

   client = OpenAI(
       base_url="https://<your-render-url>/v1",
       api_key="team-alpha-key"
   )

   response = client.chat.completions.create(
       model="qwen/qwen3.8-27b",
       messages=[{"role": "user", "content": "Hello from production gateway!"}],
       max_tokens=50
   )

   print(response.choices[0].message.content)
   ```

---

## 🔄 Automatic Continuous Deployment (CI/CD)

Whenever you push new code or features to the `main` branch on GitHub:
```bash
git push origin main
```
Render will automatically detect the commit, trigger a fresh build, run health checks, and roll out the new version with zero downtime.
