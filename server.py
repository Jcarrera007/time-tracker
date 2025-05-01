from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import os

app = Flask(__name__)
CORS(app)

# Initialize DB
def init_db():
    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        action TEXT,
        timestamp TEXT
    )''')
    conn.commit()
    conn.close()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/punch", methods=["POST"])
def punch():
    data = request.json
    username = data["username"]
    action = data["action"]
    timestamp = datetime.now(ZoneInfo("America/Puerto_Rico")).isoformat()

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("INSERT INTO logs (username, action, timestamp) VALUES (?, ?, ?)", (username, action, timestamp))
    conn.commit()
    conn.close()

    return jsonify({"status": "ok", "timestamp": timestamp})

@app.route("/today")
def today():
    username = request.args.get("username")
    today = datetime.now(ZoneInfo("America/Puerto_Rico")).date()

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("SELECT action, timestamp FROM logs WHERE username=? ORDER BY timestamp", (username,))
    rows = c.fetchall()
    conn.close()

    filtered = [
        {
            "action": action,
            "timestamp": datetime.fromisoformat(timestamp)
                .astimezone(ZoneInfo("America/Puerto_Rico"))
                .strftime("%d/%m/%Y %I:%M:%S %p")
        }
        for action, timestamp in rows
        if datetime.fromisoformat(timestamp).astimezone(ZoneInfo("America/Puerto_Rico")).date() == today
    ]
    return jsonify(filtered)

@app.route("/week")
def week():
    username = request.args.get("username")
    now = datetime.now(ZoneInfo("America/Puerto_Rico"))
    week_ago = now - timedelta(days=7)

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("SELECT action, timestamp FROM logs WHERE username=? ORDER BY timestamp", (username,))
    rows = c.fetchall()
    conn.close()

    filtered = [
        {
            "action": action,
            "timestamp": datetime.fromisoformat(timestamp)
                .astimezone(ZoneInfo("America/Puerto_Rico"))
                .strftime("%d/%m/%Y %I:%M:%S %p")
        }
        for action, timestamp in rows
        if datetime.fromisoformat(timestamp).astimezone(ZoneInfo("America/Puerto_Rico")) >= week_ago
    ]
    return jsonify(filtered)

@app.route("/download")
def download():
    username = request.args.get("username")

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("SELECT action, timestamp FROM logs WHERE username=? ORDER BY timestamp", (username,))
    rows = c.fetchall()
    conn.close()

    filename = f"{username}_log.txt"
    with open(filename, "w") as f:
        for action, timestamp in rows:
            formatted = datetime.fromisoformat(timestamp)
                .astimezone(ZoneInfo("America/Puerto_Rico"))
                .strftime("%d/%m/%Y %I:%M:%S %p")
            f.write(f"{formatted} - {action}\n")

    return send_file(filename, as_attachment=True)

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
