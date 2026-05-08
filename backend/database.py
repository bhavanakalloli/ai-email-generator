import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id        TEXT PRIMARY KEY,
            name      TEXT NOT NULL,
            email     TEXT UNIQUE NOT NULL,
            password  TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS email_history (
            id         TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL,
            prompt     TEXT NOT NULL,
            subject    TEXT NOT NULL,
            body       TEXT NOT NULL,
            tone       TEXT NOT NULL,
            model      TEXT NOT NULL,
            provider   TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()
    print("✅ Database initialized")
