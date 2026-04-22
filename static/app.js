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
const clearAgendaBtn = document.getElementById('clear-agenda-btn');

// Notes elements
const notesList = document.getElementById('notes-list');
const noteInput = document.getElementById('note-input');
const sendNoteBtn = document.getElementById('send-note-btn');
const clearNotesBtn = document.getElementById('clear-notes-btn');

// Board elements
const boardCardInput = document.getElementById('board-card-input');
const boardCardEta = document.getElementById('board-card-eta');
const addCardBtn = document.getElementById('add-card-btn');
const boardColumns = document.querySelectorAll('.board-column');

// Timer elements
const timerDisplay = document.getElementById('timer-display');
const timerStartBtn = document.getElementById('timer-start-btn');
const timerExtendBtn = document.getElementById('timer-extend-btn');
const timerEndBtn = document.getElementById('timer-end-btn');

// Shoutouts elements
const shoutoutInput = document.getElementById('shoutout-input');
const addShoutoutBtn = document.getElementById('add-shoutout-btn');
const shoutoutsListEl = document.getElementById('shoutouts-list');
const clearShoutoutsBtn = document.getElementById('clear-shoutouts-btn');

// Attendees elements
const attendeesListEl = document.getElementById('attendees-list');

// Decisions elements
const decisionInput = document.getElementById('decision-input');
const addDecisionBtn = document.getElementById('add-decision-btn');
const decisionsListEl = document.getElementById('decisions-list');
const clearDecisionsBtn = document.getElementById('clear-decisions-btn');

// Resources elements
const resourceTitleInput = document.getElementById('resource-title-input');
const resourceUrlInput = document.getElementById('resource-url-input');
const addResourceBtn = document.getElementById('add-resource-btn');
const resourcesListEl = document.getElementById('resources-list');
const clearResourcesBtn = document.getElementById('clear-resources-btn');

// Meeting selector
const meetingSelect = document.getElementById('meeting-select');

let currentMeetingId = null;
let todayMeetingId = null;
let renderedNoteIds = new Set();
let pollTimer = null;

// --- Timer state ---
let timerInterval = null;
let timerStartTime = null;
let timerDuration = 60 * 60;
let timerRunning = false;

// --- Name handling ---

function getUserName() {
  return localStorage.getItem('userName');
}

function initNamePrompt() {
  const name = getUserName();
  if (name) {
    nameOverlay.style.display = 'none';
    appDiv.style.display = 'flex';
    ensureTodayMeeting();
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
  ensureTodayMeeting();
});

// --- Timer ---

function formatTimer(totalSeconds) {
  const negative = totalSeconds < 0;
  const abs = Math.abs(totalSeconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const display = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  return negative ? '-' + display : display;
}

function updateTimerDisplay() {
  const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
  const remaining = timerDuration - elapsed;

  timerDisplay.textContent = formatTimer(remaining);

  if (remaining <= 0) {
    timerDisplay.className = 'timer-display-over';
  } else {
    timerDisplay.className = 'timer-display-active';
  }
}

function startMeeting() {
  timerDuration = 60 * 60;
  timerStartTime = Date.now();
  timerRunning = true;
  timerStartBtn.style.display = 'none';
  timerExtendBtn.style.display = '';
  timerEndBtn.style.display = '';
  timerDisplay.className = 'timer-display-active';
  timerInterval = setInterval(updateTimerDisplay, 250);
  updateTimerDisplay();
}

function extendMeeting() {
  if (!timerRunning) return;
  timerDuration += 15 * 60;
  updateTimerDisplay();
}

function endMeeting() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerStartTime = null;
  timerRunning = false;
  timerDuration = 60 * 60;
  timerDisplay.textContent = '60:00';
  timerDisplay.className = 'timer-display-idle';
  timerStartBtn.style.display = '';
  timerExtendBtn.style.display = 'none';
  timerEndBtn.style.display = 'none';
}

timerStartBtn.addEventListener('click', startMeeting);
timerExtendBtn.addEventListener('click', extendMeeting);
timerEndBtn.addEventListener('click', endMeeting);

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

// --- Wins & Shoutouts ---

function renderShoutout(shoutout) {
  const entry = document.createElement('div');
  entry.className = 'shoutout-entry';
  entry.dataset.shoutoutId = shoutout.id;

  const textDiv = document.createElement('div');
  textDiv.className = 'shoutout-text';
  textDiv.textContent = shoutout.text;

  const meta = document.createElement('div');
  meta.className = 'shoutout-meta';
  const parts = [];
  if (shoutout.author) parts.push(shoutout.author);
  if (shoutout.created_at) parts.push(formatTime(shoutout.created_at));
  meta.textContent = parts.join(' \u00b7 ');

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'shoutout-delete';
  deleteBtn.textContent = '\u00d7';
  deleteBtn.addEventListener('click', () => deleteShoutout(shoutout.id));

  entry.appendChild(textDiv);
  entry.appendChild(meta);
  entry.appendChild(deleteBtn);
  return entry;
}

function renderShoutouts(shoutouts) {
  shoutoutsListEl.innerHTML = '';
  shoutouts.forEach((s) => shoutoutsListEl.appendChild(renderShoutout(s)));
}

async function addShoutout() {
  const text = shoutoutInput.value.trim();
  if (!text || !currentMeetingId) return;
  const author = getUserName() || '';

  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/shoutouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author }),
  });
  const shoutout = await res.json();
  shoutoutsListEl.appendChild(renderShoutout(shoutout));
  shoutoutInput.value = '';
  shoutoutInput.focus();
}

async function deleteShoutout(id) {
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/shoutouts/${id}`, {
    method: 'DELETE',
  });
  const el = shoutoutsListEl.querySelector(`[data-shoutout-id="${id}"]`);
  if (el) el.remove();
}

async function clearShoutouts() {
  if (!currentMeetingId) return;
  if (!confirm('Are you sure you want to clear all shoutouts?')) return;
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/shoutouts`, {
    method: 'DELETE',
  });
  shoutoutsListEl.innerHTML = '';
}

// --- Attendees ---

function renderAttendees(attendees) {
  attendeesListEl.innerHTML = '';
  attendees.forEach((a) => {
    const pill = document.createElement('span');
    pill.className = 'attendee-pill';
    pill.textContent = a.name;
    attendeesListEl.appendChild(pill);
  });
}

async function registerCurrentUser() {
  const name = getUserName();
  if (!name || !currentMeetingId || currentMeetingId !== todayMeetingId) return;
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/attendees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

// --- Decisions Log ---

function renderDecision(decision) {
  const entry = document.createElement('div');
  entry.className = 'decision-entry';
  entry.dataset.decisionId = decision.id;

  const icon = document.createElement('div');
  icon.className = 'decision-icon';
  icon.textContent = '\u2713';

  const body = document.createElement('div');
  body.className = 'decision-body';

  const text = document.createElement('div');
  text.className = 'decision-text';
  text.textContent = decision.text;

  const meta = document.createElement('div');
  meta.className = 'decision-meta';
  const parts = [];
  if (decision.author) parts.push(decision.author);
  if (decision.created_at) parts.push(formatTime(decision.created_at));
  meta.textContent = parts.join(' \u00b7 ');

  body.appendChild(text);
  body.appendChild(meta);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'decision-delete';
  deleteBtn.textContent = '\u00d7';
  deleteBtn.addEventListener('click', () => deleteDecision(decision.id));

  entry.appendChild(icon);
  entry.appendChild(body);
  entry.appendChild(deleteBtn);
  return entry;
}

function renderDecisions(decisions) {
  decisionsListEl.innerHTML = '';
  decisions.forEach((d) => decisionsListEl.appendChild(renderDecision(d)));
}

async function addDecisionItem() {
  const text = decisionInput.value.trim();
  if (!text || !currentMeetingId) return;
  const author = getUserName() || '';

  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author }),
  });
  const decision = await res.json();
  decisionsListEl.appendChild(renderDecision(decision));
  decisionInput.value = '';
  decisionInput.focus();
}

async function deleteDecision(id) {
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/decisions/${id}`, {
    method: 'DELETE',
  });
  const el = decisionsListEl.querySelector(`[data-decision-id="${id}"]`);
  if (el) el.remove();
}

async function clearDecisions() {
  if (!currentMeetingId) return;
  if (!confirm('Are you sure you want to clear all decisions?')) return;
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/decisions`, {
    method: 'DELETE',
  });
  decisionsListEl.innerHTML = '';
}

// --- Resources ---

function renderResource(resource) {
  const entry = document.createElement('div');
  entry.className = 'resource-entry';
  entry.dataset.resourceId = resource.id;

  const icon = document.createElement('div');
  icon.className = 'resource-icon';
  icon.textContent = resource.url ? '\u{1F517}' : '\u{1F4C4}';

  const body = document.createElement('div');
  body.className = 'resource-body';

  const titleEl = document.createElement('div');
  titleEl.className = 'resource-title';
  if (resource.url) {
    const link = document.createElement('a');
    link.href = resource.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = resource.title;
    titleEl.appendChild(link);
  } else {
    titleEl.textContent = resource.title;
  }

  body.appendChild(titleEl);

  if (resource.url) {
    const urlEl = document.createElement('div');
    urlEl.className = 'resource-url';
    urlEl.textContent = resource.url;
    body.appendChild(urlEl);
  }

  const meta = document.createElement('div');
  meta.className = 'resource-meta';
  const parts = [];
  if (resource.added_by) parts.push(resource.added_by);
  if (resource.created_at) parts.push(formatTime(resource.created_at));
  meta.textContent = parts.join(' \u00b7 ');
  body.appendChild(meta);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'resource-delete';
  deleteBtn.textContent = '\u00d7';
  deleteBtn.addEventListener('click', () => deleteResource(resource.id));

  entry.appendChild(icon);
  entry.appendChild(body);
  entry.appendChild(deleteBtn);
  return entry;
}

function renderResources(resources) {
  resourcesListEl.innerHTML = '';
  resources.forEach((r) => resourcesListEl.appendChild(renderResource(r)));
}

async function addResource() {
  const title = resourceTitleInput.value.trim();
  if (!title || !currentMeetingId) return;
  const url = resourceUrlInput.value.trim();
  const added_by = getUserName() || '';

  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, url, added_by }),
  });
  const resource = await res.json();
  resourcesListEl.appendChild(renderResource(resource));
  resourceTitleInput.value = '';
  resourceUrlInput.value = '';
  resourceTitleInput.focus();
}

async function deleteResource(id) {
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/resources/${id}`, {
    method: 'DELETE',
  });
  const el = resourcesListEl.querySelector(`[data-resource-id="${id}"]`);
  if (el) el.remove();
}

async function clearResources() {
  if (!currentMeetingId) return;
  if (!confirm('Are you sure you want to clear all resources?')) return;
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/resources`, {
    method: 'DELETE',
  });
  resourcesListEl.innerHTML = '';
}

// --- Meeting History & Loading ---

async function ensureTodayMeeting() {
  const today = new Date().toISOString().split('T')[0];

  const res = await fetch(`${API_BASE}/meetings`);
  const meetings = await res.json();
  const todayMeeting = meetings.find((m) => m.date === today);

  if (todayMeeting) {
    todayMeetingId = todayMeeting.id;
  } else {
    const createRes = await fetch(`${API_BASE}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Team Sync', date: today }),
    });
    const newMeeting = await createRes.json();
    todayMeetingId = newMeeting.id;
    meetings.unshift(newMeeting);
  }

  // Populate meeting selector dropdown
  meetingSelect.innerHTML = '';
  const allMeetings = meetings.sort((a, b) => b.date.localeCompare(a.date));
  allMeetings.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    const d = new Date(m.date + 'T00:00:00');
    const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    opt.textContent = m.title + ' — ' + label + (m.id === todayMeetingId ? ' (Today)' : '');
    meetingSelect.appendChild(opt);
  });

  meetingSelect.value = todayMeetingId;
  await loadMeeting(todayMeetingId);
}

async function loadMeeting(meetingId) {
  currentMeetingId = meetingId;

  const meetingRes = await fetch(`${API_BASE}/meetings/${currentMeetingId}`);
  const meeting = await meetingRes.json();

  // Agenda
  list.innerHTML = '';
  meeting.items.forEach((item) => renderItem(item));
  updateEmpty();

  // Notes
  renderedNoteIds.clear();
  notesList.innerHTML = '';
  if (meeting.notes) {
    meeting.notes.forEach((note) => renderNote(note));
  }

  // Board
  if (meeting.board_cards) {
    renderBoard(meeting.board_cards);
  }
  initBoardDragDrop();

  // Shoutouts
  if (meeting.shoutouts) {
    renderShoutouts(meeting.shoutouts);
  } else {
    shoutoutsListEl.innerHTML = '';
  }

  // Attendees
  if (meeting.attendees) {
    renderAttendees(meeting.attendees);
  } else {
    attendeesListEl.innerHTML = '';
  }

  // Decisions
  if (meeting.decisions && decisionsListEl) {
    renderDecisions(meeting.decisions);
  }

  // Resources
  if (meeting.resources) {
    renderResources(meeting.resources);
  } else {
    resourcesListEl.innerHTML = '';
  }

  // Register current user as attendee for today's meeting
  await registerCurrentUser();

  // Re-fetch attendees to include current user
  if (currentMeetingId === todayMeetingId) {
    const attRes = await fetch(`${API_BASE}/meetings/${currentMeetingId}/attendees`);
    const attendees = await attRes.json();
    renderAttendees(attendees);
  }

  // Start consolidated polling
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(pollMeeting, 5000);
}

meetingSelect.addEventListener('change', () => {
  loadMeeting(parseInt(meetingSelect.value));
});

// --- Consolidated polling ---

async function pollMeeting() {
  if (!currentMeetingId) return;
  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}`);
  const meeting = await res.json();

  // Poll notes (append-only)
  if (meeting.notes) {
    meeting.notes.forEach((note) => renderNote(note));
  }

  // Poll board (full re-render)
  if (meeting.board_cards) {
    renderBoard(meeting.board_cards);
  }

  // Poll shoutouts (full re-render)
  if (meeting.shoutouts) {
    renderShoutouts(meeting.shoutouts);
  }

  // Poll attendees
  if (meeting.attendees) {
    renderAttendees(meeting.attendees);
  }

  // Poll decisions
  if (meeting.decisions && decisionsListEl) {
    renderDecisions(meeting.decisions);
  }

  // Poll resources
  if (meeting.resources) {
    renderResources(meeting.resources);
  }
}

// --- Board ---

function renderBoard(cards) {
  boardColumns.forEach((col) => {
    col.querySelector('.board-column-cards').innerHTML = '';
  });
  cards.forEach((card) => {
    const col = document.querySelector(`.board-column[data-column="${card.column_name}"]`);
    if (col) {
      col.querySelector('.board-column-cards').appendChild(renderBoardCard(card));
    }
  });
}

function renderBoardCard(card) {
  const div = document.createElement('div');
  div.className = 'board-card';
  div.draggable = true;
  div.dataset.cardId = card.id;

  const title = document.createElement('div');
  title.className = 'board-card-title';
  title.textContent = card.title;

  const meta = document.createElement('div');
  meta.className = 'board-card-meta';

  const author = document.createElement('span');
  author.textContent = card.author;

  const time = document.createElement('span');
  time.textContent = formatTime(card.created_at);

  meta.appendChild(author);
  meta.appendChild(time);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'board-card-delete';
  deleteBtn.textContent = '\u00d7';
  deleteBtn.addEventListener('click', () => deleteBoardCard(card.id));

  div.appendChild(deleteBtn);
  div.appendChild(title);

  if (card.eta) {
    const etaBadge = document.createElement('div');
    etaBadge.className = 'board-card-eta';
    const d = new Date(card.eta + 'T00:00:00');
    const formatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    etaBadge.textContent = 'ETA: ' + formatted;
    div.appendChild(etaBadge);
  }

  div.appendChild(meta);

  div.addEventListener('dragstart', (e) => {
    div.classList.add('dragging');
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
  });

  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
  });

  return div;
}

function initBoardDragDrop() {
  boardColumns.forEach((col) => {
    const dropZone = col.querySelector('.board-column-cards');

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('drag-over');

      const dragging = document.querySelector('.board-card.dragging');
      if (!dragging) return;

      const afterElement = getDragAfterElement(dropZone, e.clientY);
      if (afterElement) {
        dropZone.insertBefore(dragging, afterElement);
      } else {
        dropZone.appendChild(dragging);
      }
    });

    dropZone.addEventListener('dragleave', (e) => {
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
      }
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');

      const cardId = e.dataTransfer.getData('text/plain');
      const columnName = col.dataset.column;
      const cards = [...dropZone.querySelectorAll('.board-card')];
      const position = cards.findIndex((c) => c.dataset.cardId === cardId);

      moveBoardCard(cardId, columnName, position >= 0 ? position : cards.length);
    });
  });
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.board-card:not(.dragging)')];
  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;

  elements.forEach((child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = child;
    }
  });

  return closest;
}

async function addBoardCard() {
  const title = boardCardInput.value.trim();
  const eta = boardCardEta.value;
  const author = getUserName();
  if (!title || !currentMeetingId || !author) return;

  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/board`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, eta }),
  });
  const card = await res.json();
  const todoCol = document.querySelector('.board-column[data-column="todo"] .board-column-cards');
  todoCol.appendChild(renderBoardCard(card));
  boardCardInput.value = '';
  boardCardEta.value = '';
  boardCardInput.focus();
}

async function moveBoardCard(cardId, columnName, position) {
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/board/${cardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_name: columnName, position }),
  });
}

async function deleteBoardCard(cardId) {
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/board/${cardId}`, {
    method: 'DELETE',
  });
  const el = document.querySelector(`.board-card[data-card-id="${cardId}"]`);
  if (el) el.remove();
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

async function clearAgenda() {
  if (!currentMeetingId) return;
  if (!confirm('Are you sure you want to clear all agenda items?')) return;
  await fetch(`${API_BASE}/meetings/${currentMeetingId}/items`, {
    method: 'DELETE',
  });
  list.innerHTML = '';
  updateEmpty();
}

// --- Tabs ---

const tabMeeting = document.getElementById('tab-meeting');
const tabBoard = document.getElementById('tab-board');
const tabBtnMeeting = document.getElementById('tab-btn-meeting');
const tabBtnBoard = document.getElementById('tab-btn-board');

function switchTab(tabName) {
  if (tabName === 'board') {
    tabMeeting.style.display = 'none';
    tabBoard.style.display = 'flex';
    tabBtnMeeting.classList.remove('active');
    tabBtnBoard.classList.add('active');
    appDiv.classList.add('board-active');
  } else {
    tabBoard.style.display = 'none';
    tabMeeting.style.display = 'block';
    tabBtnBoard.classList.remove('active');
    tabBtnMeeting.classList.add('active');
    appDiv.classList.remove('board-active');
  }
}

tabBtnMeeting.addEventListener('click', () => switchTab('meeting'));
tabBtnBoard.addEventListener('click', () => switchTab('board'));

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
clearAgendaBtn.addEventListener('click', clearAgenda);

addCardBtn.addEventListener('click', addBoardCard);
boardCardInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBoardCard();
});

addShoutoutBtn.addEventListener('click', addShoutout);
shoutoutInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addShoutout();
});
clearShoutoutsBtn.addEventListener('click', clearShoutouts);

if (addDecisionBtn) addDecisionBtn.addEventListener('click', addDecisionItem);
if (decisionInput) decisionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addDecisionItem();
});
if (clearDecisionsBtn) clearDecisionsBtn.addEventListener('click', clearDecisions);

addResourceBtn.addEventListener('click', addResource);
resourceTitleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addResource();
});
resourceUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addResource();
});
clearResourcesBtn.addEventListener('click', clearResources);

const clearMeetingBtn = document.getElementById('clear-meeting-btn');
clearMeetingBtn.addEventListener('click', async () => {
  if (!currentMeetingId) return;
  if (!confirm('Clear all meeting data (agenda, notes, shoutouts, resources)? Project board will not be affected.')) return;
  await Promise.all([
    fetch(`${API_BASE}/meetings/${currentMeetingId}/items`, { method: 'DELETE' }),
    fetch(`${API_BASE}/meetings/${currentMeetingId}/notes`, { method: 'DELETE' }),
    fetch(`${API_BASE}/meetings/${currentMeetingId}/shoutouts`, { method: 'DELETE' }),
    fetch(`${API_BASE}/meetings/${currentMeetingId}/resources`, { method: 'DELETE' }),
  ]);
  list.innerHTML = '';
  updateEmpty();
  notesList.innerHTML = '';
  renderedNoteIds.clear();
  document.getElementById('shoutouts-list').innerHTML = '';
  resourcesListEl.innerHTML = '';
});

initNamePrompt();
