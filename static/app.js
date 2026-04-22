const input = document.getElementById('agenda-input');
const addBtn = document.getElementById('add-btn');
const list = document.getElementById('agenda-list');
const emptyMsg = document.getElementById('empty-msg');

let itemCount = 0;

function updateEmpty() {
  emptyMsg.style.display = list.children.length === 0 ? 'block' : 'none';
}

function addItem() {
  const text = input.value.trim();
  if (!text) return;

  itemCount++;

  const li = document.createElement('li');
  li.className = 'agenda-item';

  const label = document.createElement('label');

  const number = document.createElement('span');
  number.className = 'item-number';
  number.textContent = itemCount + '.';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.addEventListener('change', () => {
    li.classList.toggle('checked', checkbox.checked);
  });

  const span = document.createElement('span');
  span.className = 'item-text';
  span.textContent = text;

  label.appendChild(number);
  label.appendChild(checkbox);
  label.appendChild(span);
  li.appendChild(label);
  list.appendChild(li);

  input.value = '';
  input.focus();
  updateEmpty();
}

addBtn.addEventListener('click', addItem);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});

updateEmpty();
