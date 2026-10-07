export const categories = ['Food & drinks', 'Shopping', 'Transport', 'Bills', 'Health', 'Entertainment', 'Other'];

export function validateAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999) {
    throw new Error('Enter an amount between ₹0.01 and ₹9,999,999,999.');
  }
  const cents = Math.round(amount * 100);
  if (cents < 1 || Math.abs(amount * 100 - cents) > 0.001) {
    throw new Error('Use no more than two decimal places for amounts.');
  }
  return cents / 100;
}

export function validateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('Choose a valid date.');
  }
  return date;
}

export function validateEntry(input, label = 'expense') {
  if (typeof input.description !== 'string' || !input.description.trim()) {
    throw new Error(`Add a description for your ${label}.`);
  }
  return {
    description: input.description.trim().slice(0, 120),
    amount: validateAmount(input.amount),
    date: validateDate(input.date),
  };
}

export function validateExpense(input) {
  const entry = validateEntry(input);
  if (!categories.includes(input.category)) throw new Error('Choose a category.');
  return {...entry, category: input.category};
}
export function filterExpenses(expenses, {month = '', category = '', search = ''} = {}) {
  return expenses.filter(e => (!month || e.date.startsWith(month)) && (!category || e.category === category) && e.description.toLowerCase().includes(search.toLowerCase())).sort((a,b) => b.date.localeCompare(a.date));
}
export function total(expenses) { return expenses.reduce((sum,e) => sum + Math.round(e.amount * 100), 0) / 100; }
