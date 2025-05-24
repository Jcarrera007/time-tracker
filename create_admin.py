import sqlite3
from werkzeug.security import generate_password_hash

username = "Jimmy"  # Change this to your desired admin username
password = "Jcarre007"  # Change this to your desired admin password

conn = sqlite3.connect("tracker.db")
c = conn.cursor()
hashed_password = generate_password_hash(password)
try:
    c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", (username, hashed_password, "admin"))
    conn.commit()
    print("Admin user created successfully!")
except sqlite3.IntegrityError:
    print("Admin user already exists.")
conn.close()