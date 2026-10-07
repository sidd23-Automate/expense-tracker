export const categories = ['Food & drinks', 'Shopping', 'Transport', 'Bills', 'Health', 'Entertainment', 'Other'];
export function validateExpense(input) {
  const amount = Number(input.amount);
  if (!input.description?.trim()) throw new Error('Add a description for your expense.');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e10) throw new Error('Enter an amount greater than zero and below 10 billion.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date) throw new Error('Choose a valid date.');
  if (!categories.includes(input.category)) throw new Error('Choose a category.');
  return {description: input.description.trim().slice(0, 120), amount: Math.round(amount * 100) / 100, date: input.date, category: input.category};
}
export function filterExpenses(expenses, {month = '', category = '', search = ''} = {}) {
  return expenses.filter(e => (!month || e.date.startsWith(month)) && (!category || e.category === category) && e.description.toLowerCase().includes(search.toLowerCase())).sort((a,b) => b.date.localeCompare(a.date));
}
export function total(expenses) { return expenses.reduce((sum,e) => sum + Math.round(e.amount * 100), 0) / 100; }
