import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAmount} from '../src/expenses.js';
import {emptyLedger, ledgerKey, legacyKey, loadLedger, saveLedger, normalizeLedger, validateIncome, equalShareAmount, addSplitPayment, recordRepayment, outstanding, cashSummary} from '../src/ledger.js';
const payment = {description:'Dinner', amount:300, date:'2026-10-07', category:'Food & drinks'};
const makeId = () => {let n = 0; return () => `generated-${++n}`;};
const sharedLedger = () => addSplitPayment(emptyLedger(), {...payment, shares:[{person:'Alex',amount:100},{person:'Riya',amount:50}]}, makeId());
const storage = entries => {
  const map = new Map(Object.entries(entries || {}));
  return {getItem:key => map.get(key) ?? null, setItem:(key,value) => map.set(key,value)};
};

test('income requires a source, real date, and positive currency amount', () => {
  assert.deepEqual(validateIncome({description:' Salary ',amount:'1000.50',date:'2026-10-01'}),{description:'Salary',amount:1000.5,date:'2026-10-01'});
  for (const patch of [{description:''},{amount:0},{date:'2026-02-30'}]) assert.throws(() => validateIncome({description:'Salary',amount:100,date:'2026-10-01',...patch}));
});
test('rejects sub-cent amounts and unsupported decimal precision', () => {
  for (const amount of [0.001,1.234,-1,Infinity,'oops']) assert.throws(() => validateAmount(amount));
  assert.equal(validateAmount(12.50),12.5);
});
test('migrates legacy expenses without modifying or deleting their storage', () => {
  const original = JSON.stringify([{...payment,id:'old-expense'}]);
  const store = storage({[legacyKey]:original});
  const ledger = loadLedger(store);
  assert.equal(ledger.expenses[0].id,'old-expense');
  assert.deepEqual(ledger.incomes,[]);
  saveLedger(store,{...ledger,incomes:[{description:'Salary',amount:1000,date:'2026-10-01',id:'income'}]});
  assert.equal(store.getItem(legacyKey),original);
  assert.equal(loadLedger(store).incomes[0].amount,1000);
});
test('malformed primary data does not silently fall back to older expenses', () => {
  const store = storage({[ledgerKey]:'{invalid', [legacyKey]:'[]'});
  assert.throws(() => loadLedger(store));
  assert.equal(store.getItem(ledgerKey),'{invalid');
});
test('a failed storage write leaves the existing ledger intact', () => {
  const ledger = sharedLedger(), before = JSON.stringify(ledger);
  assert.throws(() => saveLedger({setItem(){throw new Error('Storage is full');}},ledger), /Storage is full/);
  assert.equal(JSON.stringify(ledger),before);
});
test('new split creates one paid expense and separate amounts owed', () => {
  const ledger = sharedLedger();
  assert.equal(ledger.expenses.length,1);
  assert.equal(ledger.receivables.length,2);
  assert.equal(cashSummary(ledger).owed,150);
  assert.equal(cashSummary(ledger).balance,-300);
});
test('linking an existing expense never duplicates the paid amount', () => {
  const ledger = {...emptyLedger(), expenses:[{...payment,id:'existing'}]};
  const next = addSplitPayment(ledger,{expenseId:'existing',shares:[{person:'Alex',amount:100}]},makeId());
  assert.equal(next.expenses.length,1);
  assert.equal(cashSummary(next).expenses,300);
  assert.throws(() => addSplitPayment(next,{expenseId:'existing',shares:[{person:'Riya',amount:201}]},()=> 'another-id'), /cannot exceed/);
});
test('equal split allocates whole cents with rounding remainder kept in your own share', () => {
  assert.equal(equalShareAmount(100,2),33.33);
  assert.equal(100 - equalShareAmount(100,2)*2,33.34);
  assert.throws(() => equalShareAmount(0.01,2));
});
test('invalid and over-allocated shares cannot change the ledger', () => {
  for (const shares of [[],[{person:'',amount:100}],[{person:'Alex',amount:0}],[{person:'Alex',amount:301}]]) {
    assert.throws(() => addSplitPayment(emptyLedger(),{...payment,shares},makeId()));
  }
  assert.throws(() => addSplitPayment(emptyLedger(),{expenseId:'missing',shares:[{person:'Alex',amount:100}]},makeId()));
});
test('partial then full repayment updates cash and outstanding without inflating income', () => {
  const original=sharedLedger(), id=original.receivables[0].id;
  const next=recordRepayment(original,id,{amount:40,date:'2026-10-08'},()=> 'repayment-1');
  assert.equal(outstanding(next.receivables[0]),60);
  assert.equal(cashSummary(next).owed,110);
  assert.equal(cashSummary(next).balance,-260);
  assert.equal(cashSummary(next).income,0);
  const settled=recordRepayment(next,id,{amount:60,date:'2026-10-09'},()=> 'repayment-2');
  assert.equal(outstanding(settled.receivables[0]),0);
  assert.equal(cashSummary(settled).owed,50);
  assert.equal(outstanding(original.receivables[0]),100);
});
test('rejects overpayment and repayment before the original expense', () => {
  const ledger=sharedLedger(),id=ledger.receivables[0].id;
  assert.throws(() => recordRepayment(ledger,id,{amount:101,date:'2026-10-08'},()=> 'repayment'),/cannot exceed/);
  assert.throws(() => recordRepayment(ledger,id,{amount:10,date:'2026-10-06'},()=> 'repayment'),/before/);
});
test('monthly balance includes repayments in the month received, with all-date receivables', () => {
  const ledger={...sharedLedger(),incomes:[{id:'income',description:'Salary',amount:1000,date:'2026-10-01'}]};
  const next=recordRepayment(ledger,ledger.receivables[0].id,{amount:40,date:'2026-11-02'},()=> 'repayment');
  assert.deepEqual(cashSummary(next,'2026-10'),{income:1000,expenses:300,repayments:0,balance:700,owed:110});
  assert.deepEqual(cashSummary(next,'2026-11'),{income:0,expenses:0,repayments:40,balance:40,owed:110});
  assert.equal(cashSummary(next).balance,740);
});
test('editing a linked expense cannot orphan shares or reduce its total below allocations', () => {
  const ledger=sharedLedger();
  assert.throws(() => normalizeLedger({...ledger,expenses:[]}),/missing its original/);
  assert.throws(() => normalizeLedger({...ledger,expenses:ledger.expenses.map(e=>({...e,amount:100}))}),/cannot exceed/);
});
test('undoing a repayment restores the amount owed and the prior cash balance', () => {
  const ledger=sharedLedger();
  const received=recordRepayment(ledger,ledger.receivables[0].id,{amount:40,date:'2026-10-08'},()=> 'repayment');
  const undone=normalizeLedger({...received,receivables:received.receivables.map(r=>({...r,repayments:[]}))});
  assert.equal(cashSummary(undone).owed,150);
  assert.equal(cashSummary(undone).balance,-300);
});
