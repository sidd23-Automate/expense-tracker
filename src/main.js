import './style.css';
import {categories, validateExpense, filterExpenses, total} from './expenses.js';
const key = 'pocket.expenses.v1';
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
let expenses = [], editing = null, storageError = '';
try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(saved)) throw new Error();
  expenses = saved.map(e => ({...validateExpense(e), id: String(e.id)}));
} catch { storageError = 'Saved expenses could not be loaded. Your existing browser data has not been changed.'; }
const money = new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'});
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options = categories.map(c => `<option>${esc(c)}</option>`).join('');
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Pocket home"><span class="logo">p</span> pocket<span class="brand-dot">.</span></a><span class="private">● Saved on this device</span></header>
<main><div class="intro"><div><p class="eyebrow">YOUR EVERYDAY MONEY, MADE CLEAR</p><h1>A little clarity.<br>A lot more control.</h1><p class="subtitle">Track the small things. See the bigger picture.</p></div><div class="date-chip">PERSONAL EXPENSE TRACKER <span>✦</span></div></div>
<section class="summary" aria-label="Monthly summary"><div class="summary-primary"><span>Spent this month</span><strong id="month-total"></strong><small id="month-label"></small></div><div><span>All-time spending</span><strong id="all-total"></strong><small>Every expense in one place</small></div><div><span>Expenses this month</span><strong id="month-count"></strong><small id="average"></small></div></section>
<div class="workspace"><section class="entry panel"><div class="section-title"><h2 id="form-title">Add an expense</h2><span>↗</span></div><p class="muted">A quick note today, a clearer picture tomorrow.</p>
<form id="expense-form"><label>Description<input name="description" placeholder="e.g. Coffee with friends" maxlength="120" required></label><label>Amount <span class="muted">(INR)</span><div class="amount-field"><span>₹</span><input name="amount" type="number" min="0.01" max="9999999999" step="0.01" placeholder="0.00" required></div></label><div class="form-row"><label>Category<select name="category">${options}</select></label><label>Date<input name="date" type="date" value="${localDate}" required></label></div><p id="form-error" role="alert"></p><button class="primary" id="save-button">+ Add expense</button><button type="button" id="cancel" hidden>Cancel editing</button></form><div class="privacy-note">◈ Your data stays in your browser. No accounts,<br>no subscriptions, just your expenses.</div></section>
<section class="history panel"><div class="section-title"><h2>Your expenses</h2><button id="export" class="text-button">Export CSV ↓</button></div><div class="filters"><label class="sr-only" for="search">Search expenses</label><input id="search" placeholder="Search expenses…" type="search"><label class="sr-only" for="month">Filter by month</label><input id="month" type="month"><label class="sr-only" for="category">Filter by category</label><select id="category"><option value="">All categories</option>${options}</select></div><div id="expense-list"></div><div class="list-footer"><span id="result-count"></span><strong id="filtered-total"></strong></div></section></div>
<section class="breakdown panel"><div class="section-title"><h2>This month, by category</h2><span class="muted">WHERE IT GOES</span></div><div id="breakdown"></div></section><p class="notice" id="storage-error" role="status"></p><footer>Made for a more mindful everyday. <span>Pocket · INR ₹</span></footer></main>`;
const form = document.querySelector('form');
function persist(next) {
  if (storageError) { document.querySelector('#form-error').textContent = storageError; return false; }
  try {localStorage.setItem(key, JSON.stringify(next)); expenses = next; return true;}
  catch {document.querySelector('#form-error').textContent = 'Could not save. Check that browser storage is enabled and has space.'; return false;}
}
function resetForm() {editing=null; form.reset(); form.elements.date.value=localDate; document.querySelector('#form-title').textContent='Add an expense'; document.querySelector('#save-button').textContent='+ Add expense'; document.querySelector('#cancel').hidden=true; document.querySelector('#form-error').textContent='';}
function currentFilters() {return {search:document.querySelector('#search').value,month:document.querySelector('#month').value,category:document.querySelector('#category').value};}
function render() {
 const monthly = filterExpenses(expenses,{month:localDate.slice(0,7)}), sum = total(monthly), filtered=filterExpenses(expenses,currentFilters());
 document.querySelector('#month-total').textContent=money.format(sum);
 document.querySelector('#all-total').textContent=money.format(total(expenses));
 document.querySelector('#month-count').textContent=monthly.length;
 document.querySelector('#month-label').textContent=today.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
 document.querySelector('#average').textContent=`${money.format(monthly.length ? sum/monthly.length : 0)} average per expense`;
 document.querySelector('#expense-list').innerHTML=filtered.length ? `<div class="table-wrap"><table><thead><tr><th>Expense</th><th>Date</th><th class="right">Amount</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${filtered.map(e=>`<tr><td><strong>${esc(e.description)}</strong><span class="tag">${esc(e.category)}</span></td><td class="expense-date">${new Date(e.date+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td><td class="right expense-amount">${money.format(e.amount)}</td><td><div class="actions"><button data-edit="${esc(e.id)}" aria-label="Edit ${esc(e.description)}">Edit</button><button data-delete="${esc(e.id)}" aria-label="Delete ${esc(e.description)}">×</button></div></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty"><span>↗</span><h3>${expenses.length ? 'No matching expenses' : 'Your story starts here'}</h3><p>${expenses.length ? 'Try a different search or filter.' : 'Add your first expense and watch the picture come together.'}</p></div>`;
 document.querySelector('#result-count').textContent=`${filtered.length} expense${filtered.length===1?'':'s'}`;
 document.querySelector('#filtered-total').textContent=money.format(total(filtered));
 document.querySelector('#export').disabled=!filtered.length;
 document.querySelector('#storage-error').textContent=storageError;
 document.querySelector('#breakdown').innerHTML=monthly.length ? categories.map(c=>({category:c,amount:total(monthly.filter(e=>e.category===c))})).filter(c=>c.amount>0).sort((a,b)=>b.amount-a.amount).map(c=>`<div class="category-row"><span>${esc(c.category)}</span><div class="bar"><div style="width:${c.amount/sum*100}%"></div></div><strong>${money.format(c.amount)}</strong><small>${Math.round(c.amount/sum*100)}%</small></div>`).join('') : '<p class="muted">Your category breakdown will appear after your first expense this month.</p>';
}
form.addEventListener('submit', event=>{event.preventDefault();try {const expense=validateExpense(Object.fromEntries(new FormData(form))); const next=editing ? expenses.map(e=>e.id===editing ? {...expense,id:editing}:e) : [...expenses,{...expense,id:crypto.randomUUID()}]; if(persist(next)){resetForm();render();}}catch(e){document.querySelector('#form-error').textContent=e.message;}});
document.querySelector('#cancel').addEventListener('click',resetForm);
for(const id of ['search','month','category']) document.querySelector('#'+id).addEventListener('input',render);
document.querySelector('#expense-list').addEventListener('click',event=>{const edit=event.target.closest('[data-edit]'),del=event.target.closest('[data-delete]'); if(edit){const e=expenses.find(e=>e.id===edit.dataset.edit);editing=e.id;for(const field of ['description','amount','date','category'])form.elements[field].value=e[field];document.querySelector('#form-title').textContent='Edit expense';document.querySelector('#save-button').textContent='Save changes';document.querySelector('#cancel').hidden=false;form.elements.description.focus();} if(del){const e=expenses.find(e=>e.id===del.dataset.delete);if(confirm(`Delete “${e.description}”?`) && persist(expenses.filter(x=>x.id!==e.id))){if(editing===e.id)resetForm();render();}}});
document.querySelector('#export').addEventListener('click',()=>{const csvField=value=>'"'+String(value).replaceAll('"','""')+'"';const rows=[['Date','Description','Category','Amount (INR)'],...filterExpenses(expenses,currentFilters()).map(e=>[e.date,/^[=+@\-\t\r]/.test(e.description)?"'"+e.description:e.description,e.category,e.amount.toFixed(2)])];const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(csvField).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='pocket-expenses.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
render();
