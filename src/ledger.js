import {validateAmount, validateDate, validateEntry, validateExpense, total} from './expenses.js';

export const ledgerKey = 'pocket.ledger.v2';
export const legacyKey = 'pocket.expenses.v1';
export const emptyLedger = () => ({version: 2, expenses: [], incomes: [], receivables: []});
const cents = amount => Math.round(amount * 100);

function validateId(id) {
  if (typeof id !== 'string' || !id) throw new Error('A saved record is missing its ID.');
  return id;
}

export function validateIncome(input) {
  return validateEntry(input, 'income');
}

export function repaid(receivable) {
  return total(receivable.repayments);
}

export function outstanding(receivable) {
  return (cents(receivable.amount) - cents(repaid(receivable))) / 100;
}

export function normalizeLedger(raw) {
  if (!raw || raw.version !== 2 || !['expenses', 'incomes', 'receivables'].every(key => Array.isArray(raw[key]))) {
    throw new Error('Saved data has an unsupported format.');
  }
  const ids = new Set();
  const uniqueId = id => {
    validateId(id);
    if (ids.has(id)) throw new Error('Saved data contains duplicate records.');
    ids.add(id);
    return id;
  };
  const expenses = raw.expenses.map(e => ({...validateExpense(e), id: uniqueId(e.id)}));
  const incomes = raw.incomes.map(e => ({...validateIncome(e), id: uniqueId(e.id)}));
  const expenseById = new Map(expenses.map(e => [e.id, e]));
  const receivables = raw.receivables.map(r => {
    if (typeof r.person !== 'string' || !r.person.trim()) throw new Error('Enter the name of the person who owes you.');
    const expense = expenseById.get(r.expenseId);
    if (!expense) throw new Error('A share is missing its original payment.');
    if (!Array.isArray(r.repayments)) throw new Error('Saved repayments have an unsupported format.');
    const result = {
      id: uniqueId(r.id),
      expenseId: expense.id,
      person: r.person.trim().slice(0, 80),
      amount: validateAmount(r.amount),
      repayments: r.repayments.map(p => {
        const date = validateDate(p.date);
        if (date < expense.date) throw new Error('A repayment date cannot be before the original payment.');
        return {id: uniqueId(p.id), amount: validateAmount(p.amount), date};
      }),
    };
    if (outstanding(result) < 0) throw new Error('Repayments cannot exceed the person’s share.');
    return result;
  });
  for (const expense of expenses) {
    if (cents(total(receivables.filter(r => r.expenseId === expense.id))) > cents(expense.amount)) {
      throw new Error('Other people’s shares cannot exceed the total payment.');
    }
  }
  return {version: 2, expenses, incomes, receivables};
}

export function loadLedger(storage) {
  const saved = storage.getItem(ledgerKey);
  if (saved !== null) return normalizeLedger(JSON.parse(saved));
  const legacy = storage.getItem(legacyKey);
  const expenses = legacy === null ? [] : JSON.parse(legacy);
  return normalizeLedger({...emptyLedger(), expenses});
}

export function saveLedger(storage, ledger) {
  const normalized = normalizeLedger(ledger);
  storage.setItem(ledgerKey, JSON.stringify(normalized));
  return normalized;
}

export function equalShareAmount(amount, otherPeople) {
  if (!Number.isInteger(otherPeople) || otherPeople < 1) throw new Error('Add at least one person to split with.');
  const share = Math.floor(cents(validateAmount(amount)) / (otherPeople + 1));
  if (share < 1) throw new Error('The payment is too small to split equally.');
  return share / 100;
}

export function addSplitPayment(ledger, input, makeId = () => crypto.randomUUID()) {
  if (!Array.isArray(input.shares) || !input.shares.length) throw new Error('Add at least one person to split with.');
  const existing = input.expenseId ? ledger.expenses.find(e => e.id === input.expenseId) : null;
  if (input.expenseId && !existing) throw new Error('The original expense could not be found.');
  const expense = existing || {...validateExpense(input), id: makeId()};
  const receivables = input.shares.map(s => ({id: makeId(), expenseId: expense.id, person: s.person, amount: s.amount, repayments: []}));
  return normalizeLedger({
    ...ledger,
    expenses: existing ? ledger.expenses : [...ledger.expenses, expense],
    receivables: [...ledger.receivables, ...receivables],
  });
}

export function recordRepayment(ledger, receivableId, input, makeId = () => crypto.randomUUID()) {
  const receivable = ledger.receivables.find(r => r.id === receivableId);
  if (!receivable) throw new Error('The share could not be found.');
  const payment = {id: makeId(), amount: validateAmount(input.amount), date: validateDate(input.date)};
  if (cents(payment.amount) > cents(outstanding(receivable))) throw new Error('The repayment cannot exceed the amount still owed.');
  return normalizeLedger({
    ...ledger,
    receivables: ledger.receivables.map(r => r.id === receivableId ? {...r, repayments: [...r.repayments, payment]} : r),
  });
}

export function cashSummary(ledger, month = '') {
  const inPeriod = e => !month || e.date.startsWith(month);
  const income = total(ledger.incomes.filter(inPeriod));
  const expenses = total(ledger.expenses.filter(inPeriod));
  const repayments = total(ledger.receivables.flatMap(r => r.repayments).filter(inPeriod));
  return {
    income,
    expenses,
    repayments,
    balance: (cents(income) - cents(expenses) + cents(repayments)) / 100,
    owed: ledger.receivables.reduce((sum, r) => sum + cents(outstanding(r)), 0) / 100,
  };
}
