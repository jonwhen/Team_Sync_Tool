const API_BASE = 'http://localhost:5000/api';
const input = document.getElementById('agenda-input');
const addBtn = document.getElementById('add-btn');
const list = document.getElementById('agenda-list');
const emptyMsg = document.getElementById('empty-msg');

let currentMeetingId = null;

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
}

addBtn.addEventListener('click', addItem);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});

loadOrCreateTodayMeeting();
