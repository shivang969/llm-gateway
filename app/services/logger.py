import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = "gateway_logs.db"

def init_db():
    """Creates the SQLite table if it doesn't already exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS request_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            team_id TEXT,
            model TEXT,
            total_tokens INTEGER,
            cost REAL,
            latency REAL,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

def log_request(team_id: str, model: str, total_tokens: int, cost: float, latency: float, status: str):
    """Inserts a single request record into the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO request_logs (timestamp, team_id, model, total_tokens, cost, latency, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (datetime.now().isoformat(), team_id, model, total_tokens, cost, latency, status))
    conn.commit()
    conn.close()

def get_recent_logs(limit: int = 50, team_id: str = None, status: str = None, search: str = None):
    """Fetches recent logs with optional filters."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = "SELECT * FROM request_logs WHERE 1=1"
    params = []

    if team_id and team_id != "all":
        query += " AND team_id = ?"
        params.append(team_id)

    if status and status != "all":
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (model LIKE ? OR team_id LIKE ? OR id LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_stats():
    """Computes aggregate analytics and metrics for the dashboard."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total, AVG(latency) as avg_latency, SUM(cost) as total_cost, SUM(total_tokens) as total_tokens FROM request_logs")
    agg = cursor.fetchone()
    total = agg["total"] or 0
    avg_latency = agg["avg_latency"] or 0.0
    total_cost = agg["total_cost"] or 0.0
    total_tokens = agg["total_tokens"] or 0

    cursor.execute("SELECT status, COUNT(*) as count FROM request_logs GROUP BY status")
    status_counts = {row["status"]: row["count"] for row in cursor.fetchall()}
    success = status_counts.get("success", 0)
    fallback = status_counts.get("fallback_success", 0)
    failure = status_counts.get("total_failure", 0)

    # Success rate including recovered fallbacks
    effective_success_rate = ((success + fallback) / total * 100) if total > 0 else 100.0
    direct_success_rate = (success / total * 100) if total > 0 else 100.0

    # Model usage distribution
    cursor.execute("SELECT model, COUNT(*) as count, AVG(latency) as avg_lat, SUM(cost) as sum_cost FROM request_logs GROUP BY model ORDER BY count DESC LIMIT 8")
    model_stats = [dict(row) for row in cursor.fetchall()]

    # Team usage distribution
    cursor.execute("SELECT team_id, COUNT(*) as count, SUM(total_tokens) as tokens, SUM(cost) as cost FROM request_logs GROUP BY team_id")
    team_stats = [dict(row) for row in cursor.fetchall()]

    # Recent latency samples (last 20)
    cursor.execute("SELECT id, latency, timestamp, status, model FROM request_logs ORDER BY id DESC LIMIT 20")
    recent_trend = [dict(row) for row in reversed(cursor.fetchall())]

    conn.close()
    return {
        "total_requests": total,
        "success_count": success,
        "fallback_count": fallback,
        "failure_count": failure,
        "effective_success_rate": round(effective_success_rate, 1),
        "direct_success_rate": round(direct_success_rate, 1),
        "avg_latency": round(avg_latency, 3),
        "total_cost": round(total_cost, 6),
        "total_tokens": total_tokens,
        "model_stats": model_stats,
        "team_stats": team_stats,
        "recent_trend": recent_trend
    }

def seed_demo_logs():
    """Populates realistic historical records for CV and live presentations."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Clear existing to guarantee fresh presentation layout
    cursor.execute("DELETE FROM request_logs")

    sample_scenarios = [
        ("team-beta", "openai/gpt-oss-20b", 214, 0.000012, 0.42, "success", 120),
        ("team-beta", "openai/gpt-oss-20b", 340, 0.000018, 0.51, "success", 110),
        ("team-alpha", "openai/gpt-oss-20b", 95, 0.000005, 0.38, "success", 95),
        ("team-beta", "qwen/qwen3.8-27b", 512, 0.000045, 0.89, "success", 80),
        ("team-alpha", "openai/gpt-oss-20b (fallback from llama-3.1-405b)", 140, 0.000008, 1.82, "fallback_success", 70),
        ("team-beta", "openai/gpt-oss-120b", 820, 0.000092, 1.15, "success", 60),
        ("team-alpha", "openai/gpt-oss-20b", 110, 0.000006, 0.39, "success", 50),
        ("team-beta", "openai/gpt-oss-20b (fallback from claude-3-opus)", 380, 0.000021, 2.14, "fallback_success", 40),
        ("team-beta", "qwen/qwen3.8-27b", 640, 0.000058, 0.94, "success", 30),
        ("team-alpha", "openai/gpt-oss-20b", 125, 0.000007, 0.44, "success", 20),
        ("team-beta", "meta-llama/llama-3-8b-instruct:free", 180, 0.000000, 0.72, "success", 15),
        ("team-alpha", "unreachable-upstream-cluster", 0, 0.000000, 3.20, "total_failure", 10),
        ("team-beta", "openai/gpt-oss-20b", 260, 0.000014, 0.47, "success", 5),
        ("team-alpha", "openai/gpt-oss-20b", 88, 0.000005, 0.36, "success", 2),
    ]

    now = datetime.now()
    for team, model, tokens, cost, latency, status, mins_ago in sample_scenarios:
        t = (now - timedelta(minutes=mins_ago)).isoformat()
        cursor.execute('''
            INSERT INTO request_logs (timestamp, team_id, model, total_tokens, cost, latency, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (t, team, model, tokens, cost, latency, status))

    conn.commit()
    conn.close()

def clear_logs():
    """Wipes logs database table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM request_logs")
    conn.commit()
    conn.close()

# Initialize the database immediately when this module is imported
init_db()