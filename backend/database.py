import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "team_sync.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS agenda_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            checked INTEGER NOT NULL DEFAULT 0,
            position INTEGER NOT NULL,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id)
        );
    """)
    conn.close()


def get_meetings_past_week():
    conn = get_connection()
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    rows = conn.execute(
        "SELECT * FROM meetings WHERE date >= ? ORDER BY date DESC", (week_ago,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_meeting(title, date):
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO meetings (title, date) VALUES (?, ?)", (title, date)
    )
    meeting_id = cur.lastrowid
    conn.commit()
    conn.close()
    return meeting_id


def get_meeting_with_items(meeting_id):
    conn = get_connection()
    meeting = conn.execute(
        "SELECT * FROM meetings WHERE id = ?", (meeting_id,)
    ).fetchone()
    if not meeting:
        conn.close()
        return None
    items = conn.execute(
        "SELECT * FROM agenda_items WHERE meeting_id = ? ORDER BY position",
        (meeting_id,),
    ).fetchall()
    conn.close()
    result = dict(meeting)
    result["items"] = [dict(i) for i in items]
    return result


def add_agenda_item(meeting_id, text):
    conn = get_connection()
    row = conn.execute(
        "SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM agenda_items WHERE meeting_id = ?",
        (meeting_id,),
    ).fetchone()
    next_pos = row["next_pos"]
    cur = conn.execute(
        "INSERT INTO agenda_items (meeting_id, text, position) VALUES (?, ?, ?)",
        (meeting_id, text, next_pos),
    )
    item_id = cur.lastrowid
    conn.commit()
    item = conn.execute(
        "SELECT * FROM agenda_items WHERE id = ?", (item_id,)
    ).fetchone()
    conn.close()
    return dict(item)


def toggle_item_checked(meeting_id, item_id):
    conn = get_connection()
    item = conn.execute(
        "SELECT * FROM agenda_items WHERE id = ? AND meeting_id = ?",
        (item_id, meeting_id),
    ).fetchone()
    if not item:
        conn.close()
        return None
    new_checked = 0 if item["checked"] else 1
    conn.execute(
        "UPDATE agenda_items SET checked = ? WHERE id = ?", (new_checked, item_id)
    )
    conn.commit()
    updated = conn.execute(
        "SELECT * FROM agenda_items WHERE id = ?", (item_id,)
    ).fetchone()
    conn.close()
    return dict(updated)
