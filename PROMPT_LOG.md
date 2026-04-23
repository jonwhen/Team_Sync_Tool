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

## Prompt #7

- **Prompt Summary:** Add AI-powered meeting summary on end meeting.
- **Details:** When the user clicks "End" on the meeting timer, the app gathers all meeting data and sends it to the Claude API for summarization. A new `backend/summarize.py` module calls `claude-sonnet-4-20250514` with a structured prompt covering attendees, agenda, notes, decisions, resources, shoutouts, and project board status. A POST `/api/meetings/<id>/summary` endpoint returns the summary text and a filename. The frontend shows a loading overlay with a spinner, then triggers a `.txt` file download via Blob URL. Added `anthropic` and `python-dotenv` to `requirements.txt`, created a `.env` file for the API key, and wired up `load_dotenv()` in `app.py`.
- **Output Applied:** Created summarize module, added summary endpoint, updated JS `endMeeting()` to call the API and download the file, added overlay markup and CSS spinner styles.
- **Files Changed:** `backend/summarize.py` (created), `backend/app.py`, `static/app.js`, `static/style.css`, `templates/index.html`, `requirements.txt`, `.env` (created)

## Prompt #8

- **Prompt Summary:** Add 3-option end meeting dialog (AI summary, template summary, just end).
- **Details:** Replaced the simple confirm dialog with a styled overlay presenting three choices: "AI Summary" (requires Anthropic API key), "Template Summary" (no API key needed, formats raw meeting data into structured plain text), and "Just End" (resets timer only). Added a new POST `/api/meetings/<id>/template-summary` endpoint that builds a plain-text summary from all meeting data using string formatting. The frontend uses a choice overlay with styled buttons, then shows the loading spinner overlay only when generating a summary.
- **Output Applied:** Added template-summary endpoint to `app.py`, replaced confirm dialog with a choice overlay in HTML, refactored JS into `generateSummary()` helper with separate button handlers, added button styles to CSS.
- **Files Changed:** `backend/app.py`, `static/app.js`, `static/style.css`, `templates/index.html`

## Prompt #9

- **Prompt Summary:** Write a comprehensive README for the project.
- **Details:** Created a full README covering: a summary of what Team Sync Tool is and how it promotes team collaboration, a complete feature list (agenda, notes, project board, timer, shoutouts, decisions, resources, attendees, meeting history, meeting summaries), step-by-step setup instructions (git clone, make install, .env configuration for Anthropic API key, make start, opening localhost:3000), a full architecture breakdown split into Frontend (HTML/JS/CSS), Middleware (Node.js/Hono), and Backend (Python/Flask/SQLite) with table descriptions of every file, and a section on creative and feature decisions with reasoning (3-column layout, name prompt over auth, polling over WebSockets, three summary options, built-in kanban, overtime pulse, 7-day history, SQLite).
- **Output Applied:** Replaced the placeholder `README.md` with the full documentation.
- **Files Changed:** `README.md`