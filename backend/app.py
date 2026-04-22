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


if __name__ == "__main__":
    app.run(port=5000, debug=True)
