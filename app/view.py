import sqlite3

conn = sqlite3.connect("gateway_logs.db")
cursor = conn.cursor()
cursor.execute("SELECT id, team_id, model, cost, latency, status FROM request_logs")

print(f"\n{'ID':<5} | {'Team':<12} | {'Model':<50} | {'Cost':<10} | {'Latency':<8} | {'Status'}")
print("-" * 115)

for row in cursor.fetchall():
    id, team, model, cost, latency, status = row
    print(f"{id:<5} | {team:<12} | {model:<50} | ${cost:<9.6f} | {latency:<7.2f}s | {status}")

conn.close()