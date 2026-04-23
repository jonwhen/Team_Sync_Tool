from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request
from database import (
    init_db, get_meetings_past_week, create_meeting, get_meeting_with_items,
    add_agenda_item, toggle_item_checked, get_notes, add_note, delete_notes,
    delete_items, get_board_cards, add_board_card, move_board_card,
    delete_board_card, get_action_items, add_action_item,
    toggle_action_completed, delete_action_item, delete_action_items,
    register_attendee, get_attendees, get_decisions, add_decision,
    delete_decision, delete_decisions, add_resource, delete_resource,
    delete_resources, add_shoutout, delete_shoutout, delete_shoutouts,
)
from summarize import generate_summary

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    return response

init_db()


@app.route("/api/meetings", methods=["GET"])
def list_meetings():
    return jsonify(get_meetings_past_week())


@app.route("/api/meetings", methods=["POST"])
def new_meeting():
    data = request.get_json()
    title = data.get("title", "").strip()
    date = data.get("date", "").strip()
    if not title or not date:
        return jsonify({"error": "title and date are required"}), 400
    meeting_id = create_meeting(title, date)
    return jsonify(get_meeting_with_items(meeting_id)), 201


@app.route("/api/meetings/<int:meeting_id>", methods=["GET"])
def get_meeting(meeting_id):
    meeting = get_meeting_with_items(meeting_id)
    if not meeting:
        return jsonify({"error": "meeting not found"}), 404
    return jsonify(meeting)


@app.route("/api/meetings/<int:meeting_id>/items", methods=["POST"])
def new_item(meeting_id):
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    item = add_agenda_item(meeting_id, text)
    return jsonify(item), 201


@app.route("/api/meetings/<int:meeting_id>/items/<int:item_id>", methods=["PATCH"])
def toggle_item(meeting_id, item_id):
    item = toggle_item_checked(meeting_id, item_id)
    if not item:
        return jsonify({"error": "item not found"}), 404
    return jsonify(item)


@app.route("/api/meetings/<int:meeting_id>/items", methods=["DELETE"])
def clear_items(meeting_id):
    delete_items(meeting_id)
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/notes", methods=["GET"])
def list_notes(meeting_id):
    return jsonify(get_notes(meeting_id))


@app.route("/api/meetings/<int:meeting_id>/notes", methods=["POST"])
def new_note(meeting_id):
    data = request.get_json()
    author = data.get("author", "").strip()
    text = data.get("text", "").strip()
    if not author or not text:
        return jsonify({"error": "author and text are required"}), 400
    note = add_note(meeting_id, author, text)
    return jsonify(note), 201


@app.route("/api/meetings/<int:meeting_id>/notes", methods=["DELETE"])
def clear_notes(meeting_id):
    delete_notes(meeting_id)
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/board", methods=["GET"])
def list_board_cards(meeting_id):
    return jsonify(get_board_cards(meeting_id))


@app.route("/api/meetings/<int:meeting_id>/board", methods=["POST"])
def new_board_card(meeting_id):
    data = request.get_json()
    title = data.get("title", "").strip()
    author = data.get("author", "").strip()
    if not title or not author:
        return jsonify({"error": "title and author are required"}), 400
    eta = data.get("eta", "").strip()
    card = add_board_card(meeting_id, title, author, eta=eta)
    return jsonify(card), 201


@app.route("/api/meetings/<int:meeting_id>/board/<int:card_id>", methods=["PATCH"])
def update_board_card(meeting_id, card_id):
    data = request.get_json()
    column_name = data.get("column_name", "").strip()
    position = data.get("position", 0)
    if not column_name:
        return jsonify({"error": "column_name is required"}), 400
    eta = data.get("eta")
    if eta is not None:
        eta = eta.strip()
    card = move_board_card(meeting_id, card_id, column_name, position, eta=eta)
    if not card:
        return jsonify({"error": "card not found"}), 404
    return jsonify(card)


@app.route("/api/meetings/<int:meeting_id>/board/<int:card_id>", methods=["DELETE"])
def remove_board_card(meeting_id, card_id):
    if not delete_board_card(meeting_id, card_id):
        return jsonify({"error": "card not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/actions", methods=["POST"])
def new_action(meeting_id):
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    assignee = data.get("assignee", "").strip()
    due_date = data.get("due_date", "").strip()
    item = add_action_item(meeting_id, text, assignee, due_date)
    return jsonify(item), 201


@app.route("/api/meetings/<int:meeting_id>/actions/<int:action_id>", methods=["PATCH"])
def toggle_action(meeting_id, action_id):
    item = toggle_action_completed(meeting_id, action_id)
    if not item:
        return jsonify({"error": "action item not found"}), 404
    return jsonify(item)


@app.route("/api/meetings/<int:meeting_id>/actions/<int:action_id>", methods=["DELETE"])
def remove_action(meeting_id, action_id):
    if not delete_action_item(meeting_id, action_id):
        return jsonify({"error": "action item not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/actions", methods=["DELETE"])
def clear_actions(meeting_id):
    delete_action_items(meeting_id)
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/attendees", methods=["POST"])
def new_attendee(meeting_id):
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    attendee = register_attendee(meeting_id, name)
    return jsonify(attendee), 201


@app.route("/api/meetings/<int:meeting_id>/attendees", methods=["GET"])
def list_attendees(meeting_id):
    return jsonify(get_attendees(meeting_id))


@app.route("/api/meetings/<int:meeting_id>/decisions", methods=["POST"])
def new_decision(meeting_id):
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    author = data.get("author", "").strip()
    decision = add_decision(meeting_id, text, author)
    return jsonify(decision), 201


@app.route("/api/meetings/<int:meeting_id>/decisions/<int:decision_id>", methods=["DELETE"])
def remove_decision(meeting_id, decision_id):
    if not delete_decision(meeting_id, decision_id):
        return jsonify({"error": "decision not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/decisions", methods=["DELETE"])
def clear_all_decisions(meeting_id):
    delete_decisions(meeting_id)
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/resources", methods=["POST"])
def new_resource(meeting_id):
    data = request.get_json()
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400
    url = data.get("url", "").strip()
    added_by = data.get("added_by", "").strip()
    resource = add_resource(meeting_id, title, url, added_by)
    return jsonify(resource), 201


@app.route("/api/meetings/<int:meeting_id>/resources/<int:resource_id>", methods=["DELETE"])
def remove_resource(meeting_id, resource_id):
    if not delete_resource(meeting_id, resource_id):
        return jsonify({"error": "resource not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/resources", methods=["DELETE"])
def clear_all_resources(meeting_id):
    delete_resources(meeting_id)
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/shoutouts", methods=["POST"])
def new_shoutout(meeting_id):
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    author = data.get("author", "").strip()
    shoutout = add_shoutout(meeting_id, author, text)
    return jsonify(shoutout), 201


@app.route("/api/meetings/<int:meeting_id>/shoutouts/<int:shoutout_id>", methods=["DELETE"])
def remove_shoutout(meeting_id, shoutout_id):
    if not delete_shoutout(meeting_id, shoutout_id):
        return jsonify({"error": "shoutout not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/shoutouts", methods=["DELETE"])
def clear_all_shoutouts(meeting_id):
    delete_shoutouts(meeting_id)
    return jsonify({"ok": True})


@app.route("/api/meetings/<int:meeting_id>/summary", methods=["POST"])
def meeting_summary(meeting_id):
    meeting = get_meeting_with_items(meeting_id)
    if not meeting:
        return jsonify({"error": "meeting not found"}), 404
    try:
        summary = generate_summary(meeting)
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Summary generation failed: {e}"}), 500
    date = meeting.get("date", "unknown")
    filename = f"Team_Sync_{date}.txt"
    return jsonify({"summary": summary, "filename": filename})


@app.route("/api/meetings/<int:meeting_id>/template-summary", methods=["POST"])
def meeting_template_summary(meeting_id):
    meeting = get_meeting_with_items(meeting_id)
    if not meeting:
        return jsonify({"error": "meeting not found"}), 404

    title = meeting.get("title", "Untitled Meeting")
    date = meeting.get("date", "Unknown date")
    attendees = meeting.get("attendees", [])
    items = meeting.get("items", [])
    notes = meeting.get("notes", [])
    decisions = meeting.get("decisions", [])
    resources = meeting.get("resources", [])
    shoutouts = meeting.get("shoutouts", [])
    board_cards = meeting.get("board_cards", [])

    lines = []
    lines.append(f"{title}")
    lines.append(f"Date: {date}")
    lines.append("=" * 50)

    if attendees:
        lines.append("")
        lines.append("ATTENDEES")
        lines.append("-" * 30)
        lines.append(", ".join(a["name"] for a in attendees))

    if resources:
        lines.append("")
        lines.append("RESOURCES SHARED")
        lines.append("-" * 30)
        for r in resources:
            line = f"  - {r['title']}"
            if r.get("url"):
                line += f"  ({r['url']})"
            lines.append(line)

    if items:
        lines.append("")
        lines.append("AGENDA")
        lines.append("-" * 30)
        for item in items:
            status = "[x]" if item.get("checked") else "[ ]"
            lines.append(f"  {status} {item['text']}")

    if notes:
        lines.append("")
        lines.append("MEETING NOTES")
        lines.append("-" * 30)
        for n in notes:
            lines.append(f"  [{n.get('created_at', '')}] {n['author']}: {n['text']}")

    if decisions:
        lines.append("")
        lines.append("DECISIONS")
        lines.append("-" * 30)
        for d in decisions:
            author = f" (by {d['author']})" if d.get("author") else ""
            lines.append(f"  - {d['text']}{author}")

    if shoutouts:
        lines.append("")
        lines.append("WINS & SHOUTOUTS")
        lines.append("-" * 30)
        for s in shoutouts:
            author = f" (by {s['author']})" if s.get("author") else ""
            lines.append(f"  - {s['text']}{author}")

    if board_cards:
        lines.append("")
        lines.append("PROJECT BOARD")
        lines.append("-" * 30)
        columns = {}
        for card in board_cards:
            col = card.get("column_name", "unknown")
            columns.setdefault(col, []).append(card)
        column_labels = {
            "todo": "To Do", "in_progress": "In Progress",
            "in_review": "In Review", "blocked": "Blocked",
            "parking_lot": "Parking Lot", "done": "Done",
        }
        for col_key, label in column_labels.items():
            cards = columns.get(col_key, [])
            if cards:
                lines.append(f"  {label}:")
                for c in cards:
                    eta = f" (ETA: {c['eta']})" if c.get("eta") else ""
                    lines.append(f"    - {c['title']} [{c['author']}]{eta}")

    lines.append("")
    summary = "\n".join(lines)
    filename = f"Team_Sync_{date}.txt"
    return jsonify({"summary": summary, "filename": filename})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
