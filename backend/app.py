from flask import Flask, jsonify, request
from database import init_db, get_meetings_past_week, create_meeting, get_meeting_with_items, add_agenda_item, toggle_item_checked

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS"
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


if __name__ == "__main__":
    app.run(port=5000, debug=True)
