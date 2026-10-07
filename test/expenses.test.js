import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExpense,filterExpenses,total} from '../src/expenses.js';
const expense={description:' Coffee ',amount:'12.50',date:'2026-10-07',category:'Food & drinks'};
test('validates and normalizes an expense',()=>assert.deepEqual(validateExpense(expense),{...expense,description:'Coffee',amount:12.5}));
test('rejects invalid inputs',()=>{for(const patch of [{amount:0},{amount:-2},{amount:'abc'},{description:' '},{date:'2026-02-30'},{category:'Unknown'}]) assert.throws(()=>validateExpense({...expense,...patch}));});
test('filters by month, category and case-insensitive search',()=>{const list=[validateExpense(expense),{...validateExpense(expense),date:'2026-09-01'}, {...validateExpense(expense),category:'Bills'}];assert.equal(filterExpenses(list,{month:'2026-10',category:'Food & drinks',search:'COFF'}).length,1);});
test('sums currency in cents',()=>assert.equal(total([{amount:0.1},{amount:0.2}]),0.3));
