const STORAGE_KEY = 'light-ledger-bills-v1';
const categories = ['餐饮', '交通', '购物', '娱乐', '住房', '学习', '医疗', '工资', '其他'];
const categoryIcons = { 餐饮: '🍜', 交通: '🚇', 购物: '🛍️', 娱乐: '🎮', 住房: '🏠', 学习: '📚', 医疗: '💊', 工资: '💼', 其他: '✦' };

const $ = (selector) => document.querySelector(selector);
const form = $('#bill-form');
const modal = $('#bill-modal');
let activeView = 'home';

function getBills() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function saveBills(bills) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

function formatMoney(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${value}T12:00:00`));
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function refresh() {
  const bills = getBills().sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );

  const monthBills = bills.filter((bill) =>
    bill.date.startsWith(currentMonth())
  );

  const income = monthBills
    .filter((bill) => bill.type === 'income')
    .reduce((sum, bill) => sum + bill.amount, 0);

  const expense = monthBills
    .filter((bill) => bill.type === 'expense')
    .reduce((sum, bill) => sum + bill.amount, 0);

  $('#monthly-income').textContent = formatMoney(income);
  $('#monthly-expense').textContent = formatMoney(expense);
  $('#monthly-balance').textContent = formatMoney(income - expense);

  $('#month-label').textContent = `${new Date().getMonth() + 1} 月概览`;

  renderBills($('#recent-bills'), bills.slice(0, 5), false);
  renderBills($('#all-bills'), bills, true);
}

function renderBills(container, bills, canDelete) {
  if (!bills.length) {
    container.innerHTML =
      '<div class="empty-state">还没有账单，点击右上角 ＋ 记录第一笔吧。</div>';
    return;
  }

  container.innerHTML = bills.map((bill) => `
    <article class="bill-item">
      <span class="category-badge">${categoryIcons[bill.category] || '✦'}</span>
      <div class="bill-details">
        <strong>${bill.category}</strong>
        <small>
          ${formatDate(bill.date)}
          ${bill.note ? ` · ${escapeHtml(bill.note)}` : ''}
        </small>
      </div>
      <strong class="bill-amount ${bill.type}">
        ${bill.type === 'expense' ? '−' : '+'}${formatMoney(bill.amount)}
      </strong>
      ${canDelete
        ? `<button class="delete-button" type="button" data-id="${bill.id}" aria-label="删除账单">×</button>`
        : ''}
    </article>
  `).join('');
}

function escapeHtml(text) {
  const el = document.createElement('div');
  el.textContent = text;
  return el.innerHTML;
}

function openModal() {
  form.reset();
  $('#date').value = new Date().toISOString().slice(0, 10);
  modal.classList.remove('hidden');
  $('#amount').focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}

$('#category').innerHTML = categories
  .map((category) => `<option value="${category}">${category}</option>`)
  .join('');

$('#add-button').addEventListener('click', openModal);

$('#close-modal-button').addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

$('#view-all-button').addEventListener('click', () => {
  activeView = 'all';
  $('#home-view').classList.add('hidden');
  $('#all-bills-view').classList.remove('hidden');
});

$('#back-home-button').addEventListener('click', () => {
  activeView = 'home';
  $('#all-bills-view').classList.add('hidden');
  $('#home-view').classList.remove('hidden');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const data = new FormData(form);

  const bill = {
    id: crypto.randomUUID(),
    type: data.get('type'),
    amount: Number(data.get('amount')),
    category: data.get('category'),
    date: data.get('date'),
    note: data.get('note').trim(),
    createdAt: Date.now()
  };

  if (!Number.isFinite(bill.amount) || bill.amount <= 0) return;

  saveBills([...getBills(), bill]);

  closeModal();
  refresh();
  showToast('账单已保存');
});

$('#all-bills').addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');

  if (!button) return;

  const bills = getBills().filter(
    (bill) => bill.id !== button.dataset.id
  );

  saveBills(bills);
  refresh();
  showToast('账单已删除');
});

refresh();
