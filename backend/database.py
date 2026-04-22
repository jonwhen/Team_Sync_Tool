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
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS board_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            column_name TEXT NOT NULL DEFAULT 'todo',
            position INTEGER NOT NULL DEFAULT 0,
            author TEXT NOT NULL,
            eta TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS action_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            assignee TEXT NOT NULL DEFAULT '',
            due_date TEXT NOT NULL DEFAULT '',
            completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS attendees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            joined_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (meeting_id) REFERENCES meetings(id),
            UNIQUE(meeting_id, name)
        );
        CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            url TEXT NOT NULL DEFAULT '',
            added_by TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS shoutouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER NOT NULL,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
    notes = conn.execute(
        "SELECT * FROM notes WHERE meeting_id = ? ORDER BY created_at",
        (meeting_id,),
    ).fetchall()
    board_cards = conn.execute(
        "SELECT * FROM board_cards WHERE meeting_id = ? ORDER BY position",
        (meeting_id,),
    ).fetchall()
    action_items = conn.execute(
        "SELECT * FROM action_items WHERE meeting_id = ? ORDER BY completed, created_at",
        (meeting_id,),
    ).fetchall()
    attendees = conn.execute(
        "SELECT * FROM attendees WHERE meeting_id = ? ORDER BY joined_at",
        (meeting_id,),
    ).fetchall()
    decisions = conn.execute(
        "SELECT * FROM decisions WHERE meeting_id = ? ORDER BY created_at",
        (meeting_id,),
    ).fetchall()
    resources = conn.execute(
        "SELECT * FROM resources WHERE meeting_id = ? ORDER BY created_at",
        (meeting_id,),
    ).fetchall()
    shoutouts = conn.execute(
        "SELECT * FROM shoutouts WHERE meeting_id = ? ORDER BY created_at",
        (meeting_id,),
    ).fetchall()
    conn.close()
    result = dict(meeting)
    result["items"] = [dict(i) for i in items]
    result["notes"] = [dict(n) for n in notes]
    result["board_cards"] = [dict(c) for c in board_cards]
    result["action_items"] = [dict(a) for a in action_items]
    result["attendees"] = [dict(a) for a in attendees]
    result["decisions"] = [dict(d) for d in decisions]
    result["resources"] = [dict(r) for r in resources]
    result["shoutouts"] = [dict(s) for s in shoutouts]
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


def get_notes(meeting_id):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM notes WHERE meeting_id = ? ORDER BY created_at",
        (meeting_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_note(meeting_id, author, text):
    conn = get_connection()
    created_at = datetime.now().isoformat()
    cur = conn.execute(
        "INSERT INTO notes (meeting_id, author, text, created_at) VALUES (?, ?, ?, ?)",
        (meeting_id, author, text, created_at),
    )
    conn.commit()
    note = conn.execute(
        "SELECT * FROM notes WHERE id = ?", (cur.lastrowid,)
    ).fetchone()
    conn.close()
    return dict(note)


def delete_notes(meeting_id):
    conn = get_connection()
    conn.execute("DELETE FROM notes WHERE meeting_id = ?", (meeting_id,))
    conn.commit()
    conn.close()


def delete_items(meeting_id):
    conn = get_connection()
    conn.execute("DELETE FROM agenda_items WHERE meeting_id = ?", (meeting_id,))
    conn.commit()
    conn.close()


def get_board_cards(meeting_id):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM board_cards WHERE meeting_id = ? ORDER BY position",
        (meeting_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_board_card(meeting_id, title, author, eta=''):
    conn = get_connection()
    row = conn.execute(
        "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM board_cards WHERE meeting_id = ? AND column_name = 'todo'",
        (meeting_id,),
    ).fetchone()
    next_pos = row["next_pos"]
    created_at = datetime.now().isoformat()
    cur = conn.execute(
        "INSERT INTO board_cards (meeting_id, title, column_name, position, author, eta, created_at) VALUES (?, ?, 'todo', ?, ?, ?, ?)",
        (meeting_id, title, next_pos, author, eta, created_at),
    )
    conn.commit()
    card = conn.execute(
        "SELECT * FROM board_cards WHERE id = ?", (cur.lastrowid,)
    ).fetchone()
    conn.close()
    return dict(card)


def move_board_card(meeting_id, card_id, column_name, position, eta=None):
    conn = get_connection()
    card = conn.execute(
        "SELECT * FROM board_cards WHERE id = ? AND meeting_id = ?",
        (card_id, meeting_id),
    ).fetchone()
    if not card:
        conn.close()
        return None
    if eta is not None:
        conn.execute(
            "UPDATE board_cards SET column_name = ?, position = ?, eta = ? WHERE id = ?",
            (column_name, position, eta, card_id),
        )
    else:
        conn.execute(
            "UPDATE board_cards SET column_name = ?, position = ? WHERE id = ?",
            (column_name, position, card_id),
        )
    conn.commit()
    updated = conn.execute(
        "SELECT * FROM board_cards WHERE id = ?", (card_id,)
    ).fetchone()
    conn.close()
    return dict(updated)


def delete_board_card(meeting_id, card_id):
    conn = get_connection()
    card = conn.execute(
        "SELECT * FROM board_cards WHERE id = ? AND meeting_id = ?",
        (card_id, meeting_id),
    ).fetchone()
    if not card:
        conn.close()
        return False
    conn.execute("DELETE FROM board_cards WHERE id = ?", (card_id,))
    conn.commit()
    conn.close()
    return True


def get_action_items(meeting_id):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM action_items WHERE meeting_id = ? ORDER BY completed, created_at",
        (meeting_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_action_item(meeting_id, text, assignee='', due_date=''):
    conn = get_connection()
    created_at = datetime.now().isoformat()
    cur = conn.execute(
        "INSERT INTO action_items (meeting_id, text, assignee, due_date, created_at) VALUES (?, ?, ?, ?, ?)",
        (meeting_id, text, assignee, due_date, created_at),
    )
    conn.commit()
    item = conn.execute(
        "SELECT * FROM action_items WHERE id = ?", (cur.lastrowid,)
    ).fetchone()
    conn.close()
    return dict(item)


def toggle_action_completed(meeting_id, action_id):
    conn = get_connection()
    item = conn.execute(
        "SELECT * FROM action_items WHERE id = ? AND meeting_id = ?",
        (action_id, meeting_id),
    ).fetchone()
    if not item:
        conn.close()
        return None
    new_completed = 0 if item["completed"] else 1
    conn.execute(
        "UPDATE action_items SET completed = ? WHERE id = ?", (new_completed, action_id)
    )
    conn.commit()
    updated = conn.execute(
        "SELECT * FROM action_items WHERE id = ?", (action_id,)
    ).fetchone()
    conn.close()
    return dict(updated)


def delete_action_item(meeting_id, action_id):
    conn = get_connection()
    item = conn.execute(
        "SELECT * FROM action_items WHERE id = ? AND meeting_id = ?",
        (action_id, meeting_id),
    ).fetchone()
    if not item:
        conn.close()
        return False
    conn.execute("DELETE FROM action_items WHERE id = ?", (action_id,))
    conn.commit()
    conn.close()
    return True


def delete_action_items(meeting_id):
    conn = get_connection()
    conn.execute("DELETE FROM action_items WHERE meeting_id = ?", (meeting_id,))
    conn.commit()
    conn.close()


def register_attendee(meeting_id, name):
    conn = get_connection()
    conn.execute(
        "INSERT OR IGNORE INTO attendees (meeting_id, name) VALUES (?, ?)",
        (meeting_id, name),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM attendees WHERE meeting_id = ? AND name = ?",
        (meeting_id, name),
    ).fetchone()
    conn.close()
    return dict(row)


def get_attendees(meeting_id):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM attendees WHERE meeting_id = ? ORDER BY joined_at",
        (meeting_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_decisions(meeting_id):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM decisions WHERE meeting_id = ? ORDER BY created_at",
        (meeting_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_decision(meeting_id, text, author=''):
    conn = get_connection()
    created_at = datetime.now().isoformat()
    cur = conn.execute(
        "INSERT INTO decisions (meeting_id, text, author, created_at) VALUES (?, ?, ?, ?)",
        (meeting_id, text, author, created_at),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM decisions WHERE id = ?", (cur.lastrowid,)
    ).fetchone()
    conn.close()
    return dict(row)


def delete_decision(meeting_id, decision_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM decisions WHERE id = ? AND meeting_id = ?",
        (decision_id, meeting_id),
    ).fetchone()
    if not row:
        conn.close()
        return False
    conn.execute("DELETE FROM decisions WHERE id = ?", (decision_id,))
    conn.commit()
    conn.close()
    return True


def delete_decisions(meeting_id):
    conn = get_connection()
    conn.execute("DELETE FROM decisions WHERE meeting_id = ?", (meeting_id,))
    conn.commit()
    conn.close()


def add_resource(meeting_id, title, url='', added_by=''):
    conn = get_connection()
    created_at = datetime.now().isoformat()
    cur = conn.execute(
        "INSERT INTO resources (meeting_id, title, url, added_by, created_at) VALUES (?, ?, ?, ?, ?)",
        (meeting_id, title, url, added_by, created_at),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM resources WHERE id = ?", (cur.lastrowid,)
    ).fetchone()
    conn.close()
    return dict(row)


def delete_resource(meeting_id, resource_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM resources WHERE id = ? AND meeting_id = ?",
        (resource_id, meeting_id),
    ).fetchone()
    if not row:
        conn.close()
        return False
    conn.execute("DELETE FROM resources WHERE id = ?", (resource_id,))
    conn.commit()
    conn.close()
    return True


def delete_resources(meeting_id):
    conn = get_connection()
    conn.execute("DELETE FROM resources WHERE meeting_id = ?", (meeting_id,))
    conn.commit()
    conn.close()


def add_shoutout(meeting_id, author, text):
    conn = get_connection()
    created_at = datetime.now().isoformat()
    cur = conn.execute(
        "INSERT INTO shoutouts (meeting_id, author, text, created_at) VALUES (?, ?, ?, ?)",
        (meeting_id, author, text, created_at),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM shoutouts WHERE id = ?", (cur.lastrowid,)
    ).fetchone()
    conn.close()
    return dict(row)


def delete_shoutout(meeting_id, shoutout_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM shoutouts WHERE id = ? AND meeting_id = ?",
        (shoutout_id, meeting_id),
    ).fetchone()
    if not row:
        conn.close()
        return False
    conn.execute("DELETE FROM shoutouts WHERE id = ?", (shoutout_id,))
    conn.commit()
    conn.close()
    return True


def delete_shoutouts(meeting_id):
    conn = get_connection()
    conn.execute("DELETE FROM shoutouts WHERE meeting_id = ?", (meeting_id,))
    conn.commit()
    conn.close()
