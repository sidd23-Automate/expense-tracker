import './style.css';
import {categories, validateExpense, filterExpenses, total} from './expenses.js';
import {emptyLedger, loadLedger, saveLedger, ledgerKey, legacyKey, validateIncome, outstanding, repaid, equalShareAmount, addSplitPayment, recordRepayment, cashSummary} from './ledger.js';

const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const month = localDate.slice(0, 7);
const money = new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR'});
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const formatDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
const categoryOptions = categories.map(c => `<option>${esc(c)}</option>`).join('');
let ledger = emptyLedger(), storageError = '', editingExpense = null, editingIncome = null, personCounter = 0;
try { ledger = loadLedger(localStorage); }
catch { storageError = 'Saved data could not be loaded. Editing is paused to protect it; your existing browser data has not been changed.'; }

const amountField = (name = 'amount', placeholder = '0.00') => `<div class="amount-field"><span>₹</span><input name="${name}" type="number" min="0.01" max="9999999999" step="0.01" placeholder="${placeholder}" required></div>`;
const dateField = (name = 'date') => `<input name="${name}" type="date" value="${localDate}" required>`;

document.querySelector('#app').innerHTML = `
<header><a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Pocket home"><span class="logo">p</span> pocket<span class="brand-dot">.</span></a><span class="private">● Saved on this device</span></header>
<main>
  <div class="intro"><div><p class="eyebrow">YOUR EVERYDAY MONEY, MADE CLEAR</p><h1>A little clarity.<br>A lot more control.</h1><p class="subtitle">What comes in. What goes out. What comes back.</p></div><div class="date-chip">PERSONAL MONEY TRACKER <span>✦</span></div></div>
  <section class="summary" aria-label="Money summary">
    <div class="summary-primary"><span>Remaining this month</span><strong id="balance-total"></strong><small id="month-label"></small><small>Income − paid expenses + repayments</small></div>
    <div><span>Income this month</span><strong id="income-total"></strong><small id="income-count"></small></div>
    <div><span>Paid this month</span><strong id="month-total"></strong><small><span id="month-count"></span> expenses · <span id="average"></span> average</small></div>
    <div><span>Money owed to you</span><strong id="owed-total"></strong><small id="pending-count"></small></div>
  </section>
  <div class="all-time" aria-label="All-time summary"><span>All-time balance <strong id="all-balance"></strong></span><span>Income <strong id="all-income"></strong></span><span>Paid expenses <strong id="all-total"></strong></span><span>Repayments received <strong id="all-repaid"></strong></span></div>
  <p class="notice" id="storage-error" role="alert"></p>
  <nav class="tabs" role="tablist" aria-label="Manage your money"><button id="expenses-tab" role="tab" aria-selected="true" aria-controls="expenses-panel">Expenses</button><button id="income-tab" role="tab" aria-selected="false" aria-controls="income-panel" tabindex="-1">Income</button><button id="shares-tab" role="tab" aria-selected="false" aria-controls="shares-panel" tabindex="-1">Split share</button></nav>
  <section id="expenses-panel" role="tabpanel" aria-labelledby="expenses-tab">
    <div class="workspace">
      <section class="entry panel"><div class="section-title"><h2 id="form-title">Add an expense</h2><span aria-hidden="true">↗</span></div><p class="muted">A quick note today, a clearer picture tomorrow.</p>
        <form id="expense-form"><label>Description<input name="description" placeholder="e.g. Coffee with friends" maxlength="120" required></label><label>Amount <span class="muted">(INR)</span>${amountField()}</label><div class="form-row"><label>Category<select name="category">${categoryOptions}</select></label><label>Date${dateField()}</label></div><p id="form-error" class="form-error" role="alert"></p><button class="primary" id="save-button">+ Add expense</button><button type="button" id="cancel" class="cancel-button" hidden>Cancel editing</button></form>
        <div class="privacy-note">Your data stays in your browser.<br>No accounts, no subscriptions, just your money.</div>
      </section>
      <section class="history panel"><div class="section-title"><h2>Your expenses</h2><button id="export" class="text-button">Export CSV ↓</button></div><div class="filters"><label class="sr-only" for="search">Search expenses</label><input id="search" placeholder="Search expenses…" type="search"><label class="sr-only" for="month">Filter expenses by month</label><input id="month" type="month"><label class="sr-only" for="category">Filter by category</label><select id="category"><option value="">All categories</option>${categoryOptions}</select></div><div id="expense-list"></div><div class="list-footer"><span id="result-count"></span><strong id="filtered-total"></strong></div></section>
    </div>
    <section class="breakdown panel"><div class="section-title"><h2>This month, by category</h2><span class="muted">WHERE IT GOES</span></div><div id="breakdown"></div></section>
  </section>
  <section id="income-panel" role="tabpanel" aria-labelledby="income-tab" hidden>
    <div class="workspace">
      <section class="entry panel"><div class="section-title"><h2 id="income-form-title">Add income</h2><span aria-hidden="true">↙</span></div><p class="muted">Record money you received, from salary to side projects.</p><form id="income-form"><label>Source<input name="description" placeholder="e.g. Salary or freelance work" maxlength="120" required></label><label>Amount <span class="muted">(INR)</span>${amountField()}</label><label>Date received${dateField()}</label><p id="income-error" class="form-error" role="alert"></p><button class="primary" id="income-save">+ Add income</button><button type="button" id="income-cancel" class="cancel-button" hidden>Cancel editing</button></form><div class="privacy-note">Repayments from shared expenses are recorded<br>in Split share, so they don’t inflate your income.</div></section>
      <section class="history panel"><div class="section-title"><h2>Your income</h2><button id="income-export" class="text-button">Export CSV ↓</button></div><div class="filters income-filters"><label class="sr-only" for="income-search">Search income</label><input id="income-search" type="search" placeholder="Search sources…"><label class="sr-only" for="income-month">Filter income by month</label><input id="income-month" type="month"></div><div id="income-list"></div><div class="list-footer"><span id="income-result-count"></span><strong id="income-filtered-total"></strong></div></section>
    </div>
  </section>
  <section id="shares-panel" role="tabpanel" aria-labelledby="shares-tab" hidden>
    <div class="workspace">
      <section class="entry panel"><div class="section-title"><h2>Split a payment</h2><span aria-hidden="true">↔</span></div><p class="muted">Paid for someone else? Keep track of what comes back.</p>
        <form id="split-form"><label>Payment<select name="expenseId" id="split-source"><option value="">New payment</option></select></label><fieldset id="split-payment-fields"><label>Description<input name="description" placeholder="e.g. Dinner with friends" maxlength="120" required></label><label>Total you paid <span class="muted">(INR)</span>${amountField()}</label><div class="form-row"><label>Category<select name="category">${categoryOptions}</select></label><label>Date paid${dateField()}</label></div></fieldset><p class="muted split-explanation" id="split-link-note"></p><div class="section-title share-heading"><h3>Who owes you?</h3><button type="button" id="split-equal" class="text-button">Split equally with you</button></div><div id="people-fields"></div><button type="button" id="add-person" class="text-button">+ Add person</button><div class="your-share">Your share <strong id="your-share">₹0.00</strong></div><p id="split-error" class="form-error" role="alert"></p><button class="primary" id="split-save">+ Save split payment</button></form><div class="privacy-note">A new payment is also added to Expenses.<br>Link an existing expense to count it just once.</div>
      </section>
      <section class="history panel"><div class="section-title"><h2>Money owed to you</h2><span class="muted">RECEIVE & RECORD</span></div><p class="muted">Track each person’s share and record partial or full repayments.</p><div id="person-balances" class="person-balances"></div><div class="filters income-filters"><label class="sr-only" for="share-search">Search people or payments</label><input id="share-search" type="search" placeholder="Search people or payments…"><label class="sr-only" for="share-status">Filter shares by status</label><select id="share-status"><option value="pending">Still owed</option><option value="all">All shares</option><option value="settled">Settled</option></select></div><div id="share-list"></div><div class="list-footer"><span id="share-result-count"></span><strong id="share-filtered-total"></strong></div><p class="muted balance-note">Unpaid shares aren’t available cash. Received repayments increase your balance on the date you record them.</p></section>
    </div>
  </section>
  <footer>Made for a more mindful everyday. <span>Pocket · INR ₹</span></footer>
</main>`;

const $ = selector => document.querySelector(selector);
const expenseForm = $('#expense-form'), incomeForm = $('#income-form'), splitForm = $('#split-form');

function commit(next, errorSelector) {
  if (storageError) { $(errorSelector).textContent = storageError; return false; }
  try {
    ledger = saveLedger(localStorage, next);
    $(errorSelector).textContent = '';
    return true;
  } catch (error) {
    $(errorSelector).textContent = error.name === 'QuotaExceededError' || error.name === 'SecurityError'
      ? 'Could not save. Check that browser storage is enabled and has space.' : error.message;
    return false;
  }
}

function resetExpense() {
  editingExpense = null; expenseForm.reset(); expenseForm.elements.date.value = localDate;
  $('#form-title').textContent = 'Add an expense'; $('#save-button').textContent = '+ Add expense';
  $('#cancel').hidden = true; $('#form-error').textContent = '';
}
function resetIncome() {
  editingIncome = null; incomeForm.reset(); incomeForm.elements.date.value = localDate;
  $('#income-form-title').textContent = 'Add income'; $('#income-save').textContent = '+ Add income';
  $('#income-cancel').hidden = true; $('#income-error').textContent = '';
}
function expenseFilters() { return {search: $('#search').value, month: $('#month').value, category: $('#category').value}; }
function incomeFilters() { return {search: $('#income-search').value, month: $('#income-month').value}; }
function emptyMessage(title, message) { return `<div class="empty"><span aria-hidden="true">↗</span><h3>${title}</h3><p>${message}</p></div>`; }

function renderExpenses() {
  const filtered = filterExpenses(ledger.expenses, expenseFilters());
  $('#expense-list').innerHTML = filtered.length ? `<div class="table-wrap"><table><thead><tr><th>Expense</th><th>Date</th><th class="right">Amount</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${filtered.map(e => {
    const shared = ledger.receivables.some(r => r.expenseId === e.id);
    return `<tr><td><strong>${esc(e.description)}</strong><span class="tag">${esc(e.category)}</span>${shared ? '<span class="tag shared-tag">Shared payment</span>' : ''}</td><td class="expense-date">${formatDate(e.date)}</td><td class="right expense-amount">${money.format(e.amount)}</td><td><div class="actions"><button data-edit="${esc(e.id)}" aria-label="Edit ${esc(e.description)}">Edit</button><button data-delete="${esc(e.id)}" aria-label="Delete ${esc(e.description)}">×</button></div></td></tr>`;
  }).join('')}</tbody></table></div>` : emptyMessage(ledger.expenses.length ? 'No matching expenses' : 'Your story starts here', ledger.expenses.length ? 'Try a different search or filter.' : 'Add your first expense and watch the picture come together.');
  $('#result-count').textContent = `${filtered.length} expense${filtered.length === 1 ? '' : 's'}`;
  $('#filtered-total').textContent = money.format(total(filtered));
  $('#export').disabled = !filtered.length;
  const monthly = filterExpenses(ledger.expenses, {month}), sum = total(monthly);
  $('#breakdown').innerHTML = monthly.length ? categories.map(category => ({category, amount: total(monthly.filter(e => e.category === category))})).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount).map(c => `<div class="category-row"><span>${esc(c.category)}</span><div class="bar"><div style="width:${c.amount / sum * 100}%"></div></div><strong>${money.format(c.amount)}</strong><small>${Math.round(c.amount / sum * 100)}%</small></div>`).join('') : '<p class="muted">Your category breakdown will appear after your first expense this month.</p>';
}
function renderIncome() {
  const filtered = filterExpenses(ledger.incomes, incomeFilters());
  $('#income-list').innerHTML = filtered.length ? `<div class="table-wrap"><table><thead><tr><th>Source</th><th>Date received</th><th class="right">Amount</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${filtered.map(e => `<tr><td><strong>${esc(e.description)}</strong></td><td class="expense-date">${formatDate(e.date)}</td><td class="right income-amount">${money.format(e.amount)}</td><td><div class="actions"><button data-income-edit="${esc(e.id)}" aria-label="Edit income ${esc(e.description)}">Edit</button><button data-income-delete="${esc(e.id)}" aria-label="Delete income ${esc(e.description)}">×</button></div></td></tr>`).join('')}</tbody></table></div>` : emptyMessage(ledger.incomes.length ? 'No matching income' : 'Give your income a home', ledger.incomes.length ? 'Try a different search or month.' : 'Record your first income to see what remains after expenses.');
  $('#income-result-count').textContent = `${filtered.length} income record${filtered.length === 1 ? '' : 's'}`;
  $('#income-filtered-total').textContent = money.format(total(filtered));
  $('#income-export').disabled = !filtered.length;
}
function matchingShares() {
  const search = $('#share-search').value.trim().toLowerCase(), status = $('#share-status').value;
  return ledger.receivables.filter(r => {
    const expense = ledger.expenses.find(e => e.id === r.expenseId);
    return `${r.person} ${expense.description}`.toLowerCase().includes(search) && (status === 'all' || (status === 'pending' ? outstanding(r) > 0 : outstanding(r) === 0));
  }).sort((a, b) => ledger.expenses.find(e => e.id === b.expenseId).date.localeCompare(ledger.expenses.find(e => e.id === a.expenseId).date));
}
function renderShares() {
  const byPerson = new Map();
  for (const r of ledger.receivables) {
    const key = r.person.toLowerCase(), person = byPerson.get(key) || {name: r.person, cents: 0};
    person.cents += Math.round(outstanding(r) * 100); byPerson.set(key, person);
  }
  $('#person-balances').innerHTML = [...byPerson.values()].filter(p => p.cents > 0).sort((a, b) => b.cents - a.cents).map(p => `<div class="person-balance"><span>${esc(p.name)}</span><strong>${money.format(p.cents / 100)}</strong></div>`).join('');
  const filtered = matchingShares();
  $('#share-list').innerHTML = filtered.length ? filtered.map(r => {
    const expense = ledger.expenses.find(e => e.id === r.expenseId), remaining = outstanding(r), settled = remaining === 0;
    return `<article class="share-card" data-share-id="${esc(r.id)}"><div class="share-card-heading"><div><h3>${esc(r.person)}</h3><p>${esc(expense.description)} · ${formatDate(expense.date)}</p></div><span class="status ${settled ? 'settled' : ''}">${settled ? 'Settled' : 'Still owed'}</span></div><div class="share-amounts"><div><span>Their share</span><strong>${money.format(r.amount)}</strong></div><div><span>Received</span><strong>${money.format(repaid(r))}</strong></div><div><span>Still owed</span><strong class="remaining-amount">${money.format(remaining)}</strong></div></div><div class="share-card-actions">${settled ? '' : `<button type="button" data-repay="${esc(r.id)}" class="repay-button" aria-label="Record repayment from ${esc(r.person)}">Record repayment</button>`}<button type="button" data-share-remove="${esc(r.id)}" class="text-button" aria-label="Remove share for ${esc(r.person)}">Remove share</button></div>${settled ? '' : `<form class="repayment-form" data-repayment-form="${esc(r.id)}" hidden><div class="form-row"><label>Amount received (INR)<input name="amount" type="number" value="${remaining.toFixed(2)}" min="0.01" max="${remaining.toFixed(2)}" step="0.01" required></label><label>Date received<input name="date" type="date" min="${expense.date}" value="${localDate}" required></label></div><p class="form-error" id="repayment-error-${esc(r.id)}" role="alert"></p><div class="repayment-actions"><button class="primary">Save repayment</button><button type="button" data-repay-cancel="${esc(r.id)}">Cancel</button></div></form>`}${r.repayments.length ? `<details class="repayment-history"><summary>${r.repayments.length} repayment${r.repayments.length === 1 ? '' : 's'}</summary>${r.repayments.map(p => `<div><span>${formatDate(p.date)} · ${money.format(p.amount)}</span><button type="button" data-undo-repayment="${esc(p.id)}" data-receivable="${esc(r.id)}" class="text-button" aria-label="Undo repayment of ${money.format(p.amount)} from ${esc(r.person)}">Undo</button></div>`).join('')}</details>` : ''}</article>`;
  }).join('') : emptyMessage(ledger.receivables.length ? 'No matching shares' : 'Keep shared money clear', ledger.receivables.length ? 'Try another person or choose All shares to see settled payments.' : 'Split a payment to track who owes you and how much.');
  $('#share-result-count').textContent = `${filtered.length} share${filtered.length === 1 ? '' : 's'}`;
  $('#share-filtered-total').textContent = `${money.format(filtered.reduce((sum, r) => sum + Math.round(outstanding(r) * 100), 0) / 100)} still owed`;
}
function render() {
  const current = cashSummary(ledger, month), all = cashSummary(ledger), monthly = filterExpenses(ledger.expenses, {month});
  $('#balance-total').textContent = money.format(current.balance);
  $('#balance-total').classList.toggle('negative', current.balance < 0);
  $('#income-total').textContent = money.format(current.income);
  $('#month-total').textContent = money.format(current.expenses);
  $('#owed-total').textContent = money.format(current.owed);
  $('#month-label').textContent = today.toLocaleDateString('en-IN', {month: 'long', year: 'numeric'});
  const incomeCount = ledger.incomes.filter(e => e.date.startsWith(month)).length;
  $('#income-count').textContent = `${incomeCount} income record${incomeCount === 1 ? '' : 's'} received`;
  $('#month-count').textContent = monthly.length;
  $('#average').textContent = money.format(monthly.length ? current.expenses / monthly.length : 0);
  $('#pending-count').textContent = `${ledger.receivables.filter(r => outstanding(r) > 0).length} unpaid shares · all dates`;
  $('#all-balance').textContent = money.format(all.balance);
  $('#all-income').textContent = money.format(all.income);
  $('#all-total').textContent = money.format(all.expenses);
  $('#all-repaid').textContent = money.format(all.repayments);
  $('#storage-error').textContent = storageError;
  renderExpenses(); renderIncome(); renderShares(); refreshSplitSource();
}

expenseForm.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const expense = validateExpense(Object.fromEntries(new FormData(expenseForm)));
    const expenses = editingExpense ? ledger.expenses.map(e => e.id === editingExpense ? {...expense, id: editingExpense} : e) : [...ledger.expenses, {...expense, id: crypto.randomUUID()}];
    if (commit({...ledger, expenses}, '#form-error')) { resetExpense(); render(); }
  } catch (error) { $('#form-error').textContent = error.message; }
});
$('#cancel').addEventListener('click', resetExpense);
$('#expense-list').addEventListener('click', event => {
  const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
  if (edit) {
    const e = ledger.expenses.find(e => e.id === edit.dataset.edit); editingExpense = e.id;
    for (const field of ['description', 'amount', 'date', 'category']) expenseForm.elements[field].value = e[field];
    $('#form-title').textContent = 'Edit expense'; $('#save-button').textContent = 'Save changes'; $('#cancel').hidden = false; $('#form-error').textContent = ''; expenseForm.elements.description.focus();
  }
  if (remove) {
    const e = ledger.expenses.find(e => e.id === remove.dataset.delete), linked = ledger.receivables.some(r => r.expenseId === e.id);
    if (confirm(linked ? `Delete “${e.description}” and all its linked shares and repayments?` : `Delete “${e.description}”?`) && commit({...ledger, expenses: ledger.expenses.filter(x => x.id !== e.id), receivables: ledger.receivables.filter(r => r.expenseId !== e.id)}, '#form-error')) {
      if (editingExpense === e.id) resetExpense(); render();
    }
  }
});
incomeForm.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const income = validateIncome(Object.fromEntries(new FormData(incomeForm)));
    const incomes = editingIncome ? ledger.incomes.map(e => e.id === editingIncome ? {...income, id: editingIncome} : e) : [...ledger.incomes, {...income, id: crypto.randomUUID()}];
    if (commit({...ledger, incomes}, '#income-error')) { resetIncome(); render(); }
  } catch (error) { $('#income-error').textContent = error.message; }
});
$('#income-cancel').addEventListener('click', resetIncome);
$('#income-list').addEventListener('click', event => {
  const edit = event.target.closest('[data-income-edit]'), remove = event.target.closest('[data-income-delete]');
  if (edit) {
    const e = ledger.incomes.find(e => e.id === edit.dataset.incomeEdit); editingIncome = e.id;
    for (const field of ['description', 'amount', 'date']) incomeForm.elements[field].value = e[field];
    $('#income-form-title').textContent = 'Edit income'; $('#income-save').textContent = 'Save income changes'; $('#income-cancel').hidden = false; $('#income-error').textContent = ''; incomeForm.elements.description.focus();
  }
  if (remove) {
    const e = ledger.incomes.find(e => e.id === remove.dataset.incomeDelete);
    if (confirm(`Delete income “${e.description}”?`) && commit({...ledger, incomes: ledger.incomes.filter(x => x.id !== e.id)}, '#income-error')) { if (editingIncome === e.id) resetIncome(); render(); }
  }
});

function addPerson() {
  const n = ++personCounter;
  $('#people-fields').insertAdjacentHTML('beforeend', `<div class="person-fields"><label>Person<input name="person" aria-label="Person ${n}" placeholder="e.g. Alex" maxlength="80" required></label><label>Share (INR)<input name="share" aria-label="Share for person ${n}" type="number" min="0.01" max="9999999999" step="0.01" placeholder="0.00" required></label><button type="button" data-remove-person aria-label="Remove person ${n}">×</button></div>`);
  updateYourShare();
}
function selectedPayment() { return ledger.expenses.find(e => e.id === splitForm.elements.expenseId.value); }
function allocatedAmount(expenseId) { return total(ledger.receivables.filter(r => r.expenseId === expenseId)); }
function availableAmount() {
  const selected = selectedPayment();
  return selected ? (Math.round(selected.amount * 100) - Math.round(allocatedAmount(selected.id) * 100)) / 100 : Number(splitForm.elements.amount.value) || 0;
}
function updateYourShare() {
  const requested = [...$('#people-fields').querySelectorAll('input[name=share]')].reduce((sum, input) => sum + Math.round((Number(input.value) || 0) * 100), 0);
  const remaining = (Math.round(availableAmount() * 100) - requested) / 100;
  $('#your-share').textContent = remaining < 0 ? 'Shares exceed the payment' : money.format(remaining);
  $('#your-share').classList.toggle('form-error', remaining < 0);
}
function applySplitSource() {
  const selected = selectedPayment(); $('#split-payment-fields').disabled = Boolean(selected);
  if (selected) {
    for (const field of ['description', 'amount', 'date', 'category']) splitForm.elements[field].value = selected[field];
    $('#split-link-note').textContent = `Already in Expenses. ${money.format(allocatedAmount(selected.id))} allocated to others; ${money.format(availableAmount())} available to split.`;
  } else { $('#split-link-note').textContent = 'The full amount paid will be added to Expenses once.'; }
  updateYourShare();
}
function refreshSplitSource() {
  const selected = splitForm.elements.expenseId.value;
  $('#split-source').innerHTML = '<option value="">New payment</option>' + [...ledger.expenses].sort((a, b) => b.date.localeCompare(a.date)).map(e => `<option value="${esc(e.id)}">${esc(e.description)} · ${money.format(e.amount)} · ${formatDate(e.date)}</option>`).join('');
  splitForm.elements.expenseId.value = ledger.expenses.some(e => e.id === selected) ? selected : '';
  applySplitSource();
}
$('#split-source').addEventListener('change', () => { $('#split-error').textContent = ''; applySplitSource(); });
$('#add-person').addEventListener('click', addPerson);
$('#people-fields').addEventListener('click', event => { if (event.target.closest('[data-remove-person]')) { event.target.closest('.person-fields').remove(); if (!$('#people-fields').children.length) addPerson(); updateYourShare(); } });
splitForm.addEventListener('input', updateYourShare);
$('#split-equal').addEventListener('click', () => {
  try {
    const inputs = [...$('#people-fields').querySelectorAll('input[name=share]')], amount = equalShareAmount(availableAmount(), inputs.length);
    for (const input of inputs) input.value = amount.toFixed(2);
    $('#split-error').textContent = ''; updateYourShare();
  } catch (error) { $('#split-error').textContent = error.message; }
});
splitForm.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const input = Object.fromEntries(new FormData(splitForm));
    input.shares = [...$('#people-fields').children].map(row => ({person: row.querySelector('[name=person]').value, amount: row.querySelector('[name=share]').value}));
    const next = addSplitPayment(ledger, input);
    if (commit(next, '#split-error')) {
      splitForm.reset(); $('#split-payment-fields').disabled = false; splitForm.elements.date.value = localDate;
      $('#people-fields').innerHTML = ''; addPerson(); render();
    }
  } catch (error) { $('#split-error').textContent = error.message; }
});
$('#share-list').addEventListener('click', event => {
  const repay = event.target.closest('[data-repay]'), cancel = event.target.closest('[data-repay-cancel]'), undo = event.target.closest('[data-undo-repayment]'), remove = event.target.closest('[data-share-remove]');
  if (repay || cancel) {
    const card = event.target.closest('.share-card'), form = card.querySelector('.repayment-form');
    form.hidden = Boolean(cancel); card.querySelector('[data-repay]').hidden = !form.hidden;
    if (repay) form.elements.amount.focus();
  }
  if (undo) {
    const r = ledger.receivables.find(r => r.id === undo.dataset.receivable);
    if (confirm(`Undo this repayment from ${r.person}? It will become money owed again.`) && commit({...ledger, receivables: ledger.receivables.map(x => x.id === r.id ? {...x, repayments: x.repayments.filter(p => p.id !== undo.dataset.undoRepayment)} : x)}, '#split-error')) render();
  }
  if (remove) {
    const r = ledger.receivables.find(r => r.id === remove.dataset.shareRemove);
    if (confirm(`Remove ${r.person}’s share and its repayment history? The original expense will remain.`) && commit({...ledger, receivables: ledger.receivables.filter(x => x.id !== r.id)}, '#split-error')) render();
  }
});
$('#share-list').addEventListener('submit', event => {
  const form = event.target.closest('[data-repayment-form]'); if (!form) return;
  event.preventDefault();
  const errorSelector = `#repayment-error-${form.dataset.repaymentForm}`;
  try { const next = recordRepayment(ledger, form.dataset.repaymentForm, Object.fromEntries(new FormData(form))); if (commit(next, errorSelector)) render(); }
  catch (error) { $(errorSelector).textContent = error.message; }
});

for (const id of ['search', 'month', 'category']) $('#' + id).addEventListener('input', renderExpenses);
for (const id of ['income-search', 'income-month']) $('#' + id).addEventListener('input', renderIncome);
for (const id of ['share-search', 'share-status']) $('#' + id).addEventListener('input', renderShares);
const tabs = [...document.querySelectorAll('[role=tab]')];
function activateTab(tab) {
  for (const t of tabs) { const active = t === tab; t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !active; }
}
for (const tab of tabs) {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    const index = tabs.indexOf(tab), next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); activateTab(tabs[next]); tabs[next].focus(); }
  });
}
function exportCSV(headers, records, filename) {
  const field = value => '"' + String(value).replaceAll('"', '""') + '"';
  const safe = value => /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
  const rows = [headers, ...records.map(e => e.map(value => typeof value === 'string' ? safe(value) : value))];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(field).join(',')).join('\r\n')], {type: 'text/csv;charset=utf-8;'}));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#export').addEventListener('click', () => exportCSV(['Date', 'Description', 'Category', 'Amount (INR)'], filterExpenses(ledger.expenses, expenseFilters()).map(e => [e.date, e.description, e.category, e.amount.toFixed(2)]), 'pocket-expenses.csv'));
$('#income-export').addEventListener('click', () => exportCSV(['Date', 'Source', 'Amount (INR)'], filterExpenses(ledger.incomes, incomeFilters()).map(e => [e.date, e.description, e.amount.toFixed(2)]), 'pocket-income.csv'));
window.addEventListener('storage', event => {
  if (event.key !== ledgerKey && event.key !== legacyKey && event.key !== null) return;
  try { ledger = loadLedger(localStorage); storageError = ''; }
  catch { storageError = 'Saved data could not be loaded. Editing is paused to protect it; your existing browser data has not been changed.'; }
  render();
});
addPerson(); render();
