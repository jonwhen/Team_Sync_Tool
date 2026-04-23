import os
import anthropic


def generate_summary(meeting_data: dict) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set")

    # Build the raw meeting content for the prompt
    title = meeting_data.get("title", "Untitled Meeting")
    date = meeting_data.get("date", "Unknown date")

    attendees = meeting_data.get("attendees", [])
    attendee_names = [a["name"] for a in attendees] if attendees else ["(none recorded)"]

    resources = meeting_data.get("resources", [])
    resource_lines = []
    for r in resources:
        line = f"- {r['title']}"
        if r.get("url"):
            line += f" ({r['url']})"
        resource_lines.append(line)

    items = meeting_data.get("items", [])
    agenda_lines = []
    for item in items:
        status = "COVERED" if item.get("checked") else "NOT COVERED"
        agenda_lines.append(f"- [{status}] {item['text']}")

    notes = meeting_data.get("notes", [])
    note_lines = []
    for n in notes:
        note_lines.append(f"- {n['author']} ({n.get('created_at', '')}): {n['text']}")

    shoutouts = meeting_data.get("shoutouts", [])
    shoutout_lines = []
    for s in shoutouts:
        line = f"- {s['text']}"
        if s.get("author"):
            line += f" (by {s['author']})"
        shoutout_lines.append(line)

    decisions = meeting_data.get("decisions", [])
    decision_lines = []
    for d in decisions:
        line = f"- {d['text']}"
        if d.get("author"):
            line += f" (by {d['author']})"
        decision_lines.append(line)

    board_cards = meeting_data.get("board_cards", [])
    columns = {}
    for card in board_cards:
        col = card.get("column_name", "unknown")
        columns.setdefault(col, []).append(card)
    board_lines = []
    column_labels = {
        "todo": "To Do",
        "in_progress": "In Progress",
        "in_review": "In Review",
        "blocked": "Blocked",
        "parking_lot": "Parking Lot",
        "done": "Done",
    }
    for col_key, label in column_labels.items():
        cards = columns.get(col_key, [])
        if cards:
            board_lines.append(f"  {label}:")
            for c in cards:
                eta_part = f" (ETA: {c['eta']})" if c.get("eta") else ""
                board_lines.append(f"    - {c['title']} [{c['author']}]{eta_part}")

    user_prompt = f"""Here is the raw data from today's team meeting. Please produce a clean, well-organized meeting summary.

MEETING TITLE: {title}
DATE: {date}
ATTENDEES: {', '.join(attendee_names)}

RESOURCES SHARED:
{chr(10).join(resource_lines) if resource_lines else '(none)'}

AGENDA ITEMS:
{chr(10).join(agenda_lines) if agenda_lines else '(none)'}

MEETING NOTES (raw):
{chr(10).join(note_lines) if note_lines else '(none)'}

DECISIONS MADE:
{chr(10).join(decision_lines) if decision_lines else '(none)'}

WINS & SHOUTOUTS:
{chr(10).join(shoutout_lines) if shoutout_lines else '(none)'}

PROJECT BOARD STATUS:
{chr(10).join(board_lines) if board_lines else '(no cards)'}"""

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=(
            "You are a meeting summarizer. Given raw meeting data, produce a clean, "
            "structured plain-text summary with these sections:\n"
            "1. Meeting Info — title, date, attendees\n"
            "2. Resources Shared — title and URL for each\n"
            "3. Agenda — list each item with covered/not-covered status\n"
            "4. Notes Summary — a concise narrative summarizing all notes\n"
            "5. Decisions Made — list each decision\n"
            "6. Wins & Shoutouts — list each\n"
            "7. Project Board Status — cards grouped by column\n\n"
            "Omit any section that has no data. Keep it concise and professional. "
            "Use plain text only, no markdown."
        ),
        messages=[{"role": "user", "content": user_prompt}],
    )

    return message.content[0].text
