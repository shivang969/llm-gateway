#!/usr/bin/env bash
# ==============================================================================
# NEXUS LLM GATEWAY - 1-CLICK CV LIVE DEMO LAUNCHER
# Starts the backend gateway + frontend control plane and opens your browser.
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "================================================================="
echo "  🚀 Starting NEXUS LLM Gateway & Interactive Control Plane"
echo "================================================================="

# Locate Python environment
if [ -f "$DIR/../venv/bin/python" ]; then
    PYTHON_BIN="$DIR/../venv/bin/python"
elif [ -f "$DIR/venv/bin/python" ]; then
    PYTHON_BIN="$DIR/venv/bin/python"
else
    PYTHON_BIN="$(which python3)"
fi

echo "Using Python: $PYTHON_BIN"

# Check if port 8000 is running
PID=$(lsof -ti :8000 || true)
if [ -n "$PID" ]; then
    echo "Stopping existing process on port 8000 (PID: $PID)..."
    kill -9 $PID 2>/dev/null || true
    sleep 1
fi

echo "Starting Gateway on http://localhost:8000..."
$PYTHON_BIN -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
SERVER_PID=$!

sleep 2

# Open browser on macOS
if command -v open >/dev/null 2>&1; then
    open "http://localhost:8000"
fi

echo ""
echo "================================================================="
echo "  ✅ NEXUS LLM Gateway is LIVE at: http://localhost:8000"
echo "================================================================="
echo "  Live Demo Features for Interviews & Showcases:"
echo "  1. Live Playground: Sub-second inference + live SSE streaming"
echo "  2. Failover Topology: Real-time visual SVG routing & failover demo"
echo "  3. Telemetry & Analytics: Cost accounting, latency graphs, KPIs"
echo "  4. Audit Logs: Persistent SQLite trace inspector (gateway_logs.db)"
echo "  5. Quotas & Policies: TPM token-bucket rate limiter & 429 trigger"
echo "  6. Drop-In OpenAI SDK: Python, cURL, and Node.js integrations"
echo "================================================================="
echo "Press Ctrl+C to terminate the gateway server."

wait $SERVER_PID
