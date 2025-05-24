from flask import Flask, request, jsonify, send_file, render_template, session, redirect, url_for
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
import os
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

app.secret_key = "your_secret_key"  # Set a strong secret key!

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
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
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
    timestamp = data.get("timestamp") or datetime.now().strftime("%d/%m/%Y %I:%M:%S %p")

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("INSERT INTO logs (username, action, timestamp) VALUES (?, ?, ?)", (username, action, timestamp))
    conn.commit()
    conn.close()

    return jsonify({"status": "ok", "timestamp": timestamp})

@app.route("/today")
def today():
    username = request.args.get("username")
    today_str = datetime.now().strftime("%d/%m/%Y")

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("SELECT action, timestamp FROM logs WHERE username=? ORDER BY id", (username,))
    rows = c.fetchall()
    conn.close()

    filtered = [
        (action, timestamp)
        for action, timestamp in rows
        if timestamp.startswith(today_str)
    ]

    sessions = []
    in_time = None
    total_seconds = 0

    for action, timestamp in filtered:
        dt = datetime.strptime(timestamp, "%d/%m/%Y %I:%M:%S %p")
        if action == "IN":
            in_time = dt
        elif action == "OUT" and in_time:
            delta = dt - in_time
            total_seconds += delta.total_seconds()
            sessions.append(("IN", in_time.strftime("%I:%M:%S %p")))
            sessions.append(("OUT", dt.strftime("%I:%M:%S %p")))
            in_time = None
        else:
            sessions.append((action, dt.strftime("%I:%M:%S %p")))

    total_hours = round(total_seconds / 3600, 2)

    return jsonify({
        "log": [{"action": act, "timestamp": ts} for act, ts in sessions],
        "total_hours": total_hours
    })

@app.route("/week")
def week():
    username = request.args.get("username")

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("SELECT action, timestamp FROM logs WHERE username=? ORDER BY id", (username,))
    rows = c.fetchall()
    conn.close()

    sessions = []
    in_time = None
    total_seconds = 0

    for action, timestamp in rows[-100:]:
        try:
            dt = datetime.strptime(timestamp, "%d/%m/%Y %I:%M:%S %p")
        except ValueError:
            continue

        if action == "IN":
            in_time = dt
        elif action == "OUT" and in_time:
            delta = dt - in_time
            total_seconds += delta.total_seconds()
            sessions.append(("IN", in_time.strftime("%d/%m/%Y, %I:%M:%S %p")))
            sessions.append(("OUT", dt.strftime("%d/%m/%Y, %I:%M:%S %p")))
            in_time = None
        else:
            sessions.append((action, dt.strftime("%d/%m/%Y, %I:%M:%S %p")))

    total_hours = round(total_seconds / 3600, 2)

    return jsonify({
        "log": [{"action": act, "timestamp": ts} for act, ts in sessions],
        "total_hours": total_hours
    })

@app.route("/download")
def download():
    username = request.args.get("username")

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("SELECT action, timestamp FROM logs WHERE username=? ORDER BY id", (username,))
    rows = c.fetchall()
    conn.close()

    filename = f"{username}_log.txt"
    with open(filename, "w") as f:
        for action, timestamp in rows:
            f.write(f"{timestamp} - {action}\n")

    return send_file(filename, as_attachment=True)

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data["username"]
    password = data["password"]

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    c.execute("SELECT password, role FROM users WHERE username=?", (username,))
    result = c.fetchone()
    conn.close()

    if result and check_password_hash(result[0], password):
        session["username"] = username
        session["role"] = result[1]
        return jsonify({"status": "ok", "role": result[1]})
    else:
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"status": "logged out"})

def login_required(role=None):
    def decorator(f):
        def wrapper(*args, **kwargs):
            if "username" not in session:
                return jsonify({"status": "error", "message": "Login required"}), 401
            if role and session.get("role") != role:
                return jsonify({"status": "error", "message": "Unauthorized"}), 403
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

# Example: Protect an admin route
@app.route("/admin")
@login_required(role="admin")
def admin_dashboard():
    return jsonify({"status": "ok", "message": "Welcome, admin!"})

# Example: Protect an employee route
@app.route("/employee")
@login_required(role="employee")
def employee_dashboard():
    return jsonify({"status": "ok", "message": f"Welcome, {session['username']}!"})

@app.route("/register", methods=["POST"])
@login_required(role="admin")
def register():
    data = request.json
    username = data["username"]
    password = data["password"]
    role = data["role"]  # "admin" or "employee"

    conn = sqlite3.connect("tracker.db")
    c = conn.cursor()
    try:
        hashed_password = generate_password_hash(password)
        c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", (username, hashed_password, role))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"status": "error", "message": "Username already exists"}), 400
    conn.close()
    return jsonify({"status": "ok", "message": "User registered"})

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
