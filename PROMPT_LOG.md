# Prompt Log - Team Sync Tool

This log tracks each prompt used during development and how the output was applied.

---

## Prompt #1

- **Prompt Summary:** Define the application plan and create a prompt log.
- **Details:** The plan for this application is to create a team sync tool that allows users within a team to take notes concurrently during daily or weekly syncs/meetings. Key features:
  - A checklist section with an agenda (items checked off in order)
  - A section for each team member to write their own notes, visible to others
- **Output Applied:** Created this `PROMPT_LOG.md` file to track all prompts and their outcomes. No application code was written yet.
- **Files Changed:** `PROMPT_LOG.md` (created)

## Prompt #2

- **Prompt Summary:** Build the initial Flask backend with SQLite and agenda checklist UI.
- **Details:** Set up the backend with Flask serving a REST API, SQLite for persistence, and a frontend with Tailwind CSS for the agenda checklist. Meetings are auto-created for today's date. Agenda items can be added and checked off.
- **Output Applied:** Created backend (`app.py`, `database.py`) with meetings and agenda_items tables, API endpoints for CRUD operations. Built frontend (`index.html`, `app.js`, `style.css`) with agenda input and checklist rendering.
- **Files Changed:** `backend/app.py`, `backend/database.py`, `templates/index.html`, `static/app.js`, `static/style.css`

## Prompt #3

- **Prompt Summary:** Add collaborative meeting notes (chat log style).
- **Details:** Implemented a shared notes feature below the agenda. Users enter their name on first visit (stored in localStorage). Notes appear as a chat log with author name and timestamp. Notes are stored in a new `notes` DB table and fetched/created via API. The frontend polls every 5 seconds so multiple users see each other's notes in real time.
- **Output Applied:** Added `notes` table to DB, GET/POST endpoints for notes, name prompt overlay in HTML, notes rendering/polling in JS, and styles for the notes section.
- **Files Changed:** `backend/database.py`, `backend/app.py`, `templates/index.html`, `static/app.js`, `static/style.css`

## Prompt #4

- **Prompt Summary:** Move notes panel to the right side of the agenda.
- **Details:** Restructured the layout so the agenda card is centered on the page (directly under the header) and the notes panel is positioned to its right using absolute positioning. Added responsive fallback to stack vertically on narrow screens.
- **Output Applied:** Rewrote CSS layout using flexbox with absolute positioning for the notes card. Updated HTML structure and JS display logic.
- **Files Changed:** `templates/index.html`, `static/style.css`, `static/app.js`

## Prompt #5

- **Prompt Summary:** Adjust sizing of agenda and notes panels.
- **Details:** Increased agenda card width to 600px. Increased notes card width to 380px and set the notes list to a fixed 500px height.
- **Output Applied:** Updated CSS width and height values for both panels.
- **Files Changed:** `static/style.css`

## Prompt #6

- **Prompt Summary:** Add a clear button for meeting notes with confirmation.
- **Details:** Added a "Clear" button in the notes card header. Clicking it shows a browser confirm dialog before deleting all notes for the current meeting. Added a DELETE endpoint and `delete_notes` DB function.
- **Output Applied:** Added clear button to HTML, DELETE `/api/meetings/<id>/notes` endpoint, `delete_notes()` function in database, and `clearNotes()` JS function with confirmation.
- **Files Changed:** `backend/database.py`, `backend/app.py`, `templates/index.html`, `static/app.js`
