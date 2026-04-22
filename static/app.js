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

let currentMeetingId = null;
let renderedNoteIds = new Set();
let notePollTimer = null;
let boardPollTimer = null;

// Board elements
const boardCardInput = document.getElementById('board-card-input');
const boardCardEta = document.getElementById('board-card-eta');
const addCardBtn = document.getElementById('add-card-btn');
const boardColumns = document.querySelectorAll('.board-column');

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

  // Load board
  if (meeting.board_cards) {
    renderBoard(meeting.board_cards);
  }
  initBoardDragDrop();

  // Start polling for new notes and board updates
  if (notePollTimer) clearInterval(notePollTimer);
  notePollTimer = setInterval(pollNotes, 5000);
  if (boardPollTimer) clearInterval(boardPollTimer);
  boardPollTimer = setInterval(pollBoard, 5000);
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

async function pollBoard() {
  if (!currentMeetingId) return;
  const res = await fetch(`${API_BASE}/meetings/${currentMeetingId}/board`);
  const cards = await res.json();
  renderBoard(cards);
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

initNamePrompt();
