const API_BASE = 'http://localhost:5000/api';

// Name prompt elements
const nameOverlay = document.getElementById('name-overlay');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const appDiv = document.getElementById('app');

// Agenda elements
const input = document.getElementById('agenda-input');
const addBtn = document.getElementById('add-btn');
const list = document.getElementById('agenda-list');
const emptyMsg = document.getElementById('empty-msg');

// Notes elements
const notesList = document.getElementById('notes-list');
const noteInput = document.getElementById('note-input');
const sendNoteBtn = document.getElementById('send-note-btn');
const clearNotesBtn = document.getElementById('clear-notes-btn');

let currentMeetingId = null;
let renderedNoteIds = new Set();
let notePollTimer = null;

// --- Name handling ---

function getUserName() {
  return localStorage.getItem('userName');
}

function initNamePrompt() {
  const name = getUserName();
  if (name) {
    nameOverlay.style.display = 'none';
    appDiv.style.display = 'flex';
    loadOrCreateTodayMeeting();
  } else {
    nameOverlay.style.display = 'flex';
    appDiv.style.display = 'none';
    nameInput.focus();
  }
}

nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  localStorage.setItem('userName', name);
  nameOverlay.style.display = 'none';
  appDiv.style.display = 'flex';
  loadOrCreateTodayMeeting();
});

// --- Agenda ---

function updateEmpty() {
  emptyMsg.style.display = list.children.length === 0 ? 'block' : 'none';
}

function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'agenda-item';
  if (item.checked) li.classList.add('checked');

  const label = document.createElement('label');

  const number = document.createElement('span');
  number.className = 'item-number';
  number.textContent = item.position + '.';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = !!item.checked;
  checkbox.addEventListener('change', async () => {
    const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/items/${item.id}`, {
      method: 'PATCH',
    });
    const updated = await res.json();
    li.classList.toggle('checked', !!updated.checked);
    checkbox.checked = !!updated.checked;
  });

  const span = document.createElement('span');
  span.className = 'item-text';
  span.textContent = item.text;

  label.appendChild(number);
  label.appendChild(checkbox);
  label.appendChild(span);
  li.appendChild(label);
  list.appendChild(li);
}

async function addItem() {
  const text = input.value.trim();
  if (!text || !currentMeetingId) return;

  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const item = await res.json();
  renderItem(item);
  input.value = '';
  input.focus();
  updateEmpty();
}

// --- Notes ---

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderNote(note) {
  if (renderedNoteIds.has(note.id)) return;
  renderedNoteIds.add(note.id);

  const div = document.createElement('div');
  div.className = 'note-entry';

  const header = document.createElement('div');
  header.className = 'note-header';

  const author = document.createElement('span');
  author.className = 'note-author';
  author.textContent = note.author;

  const time = document.createElement('span');
  time.className = 'note-time';
  time.textContent = formatTime(note.created_at);

  header.appendChild(author);
  header.appendChild(time);

  const text = document.createElement('div');
  text.className = 'note-text';
  text.textContent = note.text;

  div.appendChild(header);
  div.appendChild(text);
  notesList.appendChild(div);
  notesList.scrollTop = notesList.scrollHeight;
}

async function addNote() {
  const text = noteInput.value.trim();
  const author = getUserName();
  if (!text || !currentMeetingId || !author) return;

  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, text }),
  });
  const note = await res.json();
  renderNote(note);
  noteInput.value = '';
  noteInput.focus();
}

async function pollNotes() {
  if (!currentMeetingId) return;
  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/notes`);
  const notes = await res.json();
  notes.forEach((note) => renderNote(note));
}

// --- Load meeting ---

async function loadOrCreateTodayMeeting() {
  const today = new Date().toISOString().split('T')[0];

  const res = await fetch(`${API_BASE}/meetings`);
  const meetings = await res.json();
  const todayMeeting = meetings.find((m) => m.date === today);

  if (todayMeeting) {
    currentMeetingId = todayMeeting.id;
  } else {
    const createRes = await fetch(`${API_BASE}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Team Sync', date: today }),
    });
    const newMeeting = await createRes.json();
    currentMeetingId = newMeeting.id;
  }

  const meetingRes = await fetch(`${API_BASE}/meetings/${currentMeetingId}`);
  const meeting = await meetingRes.json();

  list.innerHTML = '';
  meeting.items.forEach((item) => renderItem(item));
  updateEmpty();

  // Load notes
  renderedNoteIds.clear();
  notesList.innerHTML = '';
  if (meeting.notes) {
    meeting.notes.forEach((note) => renderNote(note));
  }

  // Start polling for new notes
  if (notePollTimer) clearInterval(notePollTimer);
  notePollTimer = setInterval(pollNotes, 5000);
}

async function clearNotes() {
  if (!currentMeetingId) return;
  if (!confirm('Are you sure you want to clear all meeting notes?')) return;
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/notes`, {
    method: 'DELETE',
  });
  notesList.innerHTML = '';
  renderedNoteIds.clear();
}

// --- Event listeners ---

addBtn.addEventListener('click', addItem);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});

sendNoteBtn.addEventListener('click', addNote);
noteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addNote();
});
clearNotesBtn.addEventListener('click', clearNotes);

initNamePrompt();
