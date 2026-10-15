import { describe, it, expect } from 'vitest';
import {
  getWorkingAmount,
  getPaidAmount,
  getOutstandingAmount,
  getOverpaidAmount,
  getPaymentStatus,
  calculateTotals,
  calculateBudgetHealth,
} from '../lib/calculations.js';

// ─── Test Helpers ──────────────────────────────────────
function makeExpense(overrides = {}) {
  return {
    id: 'exp-1',
    category_id: 'cat-1',
    name: 'Test Expense',
    estimated_amount: 10000,
    final_amount: null,
    status: 'planned',
    is_archived: false,
    ...overrides,
  };
}

function makePayment(overrides = {}) {
  return {
    id: 'pay-1',
    expense_id: 'exp-1',
    amount: 5000,
    paid_at: '2026-01-01',
    ...overrides,
  };
}

// ─── getWorkingAmount ──────────────────────────────────
describe('getWorkingAmount', () => {
  it('returns final_amount when set', () => {
    const exp = makeExpense({ estimated_amount: 10000, final_amount: 12000 });
    expect(getWorkingAmount(exp)).toBe(12000);
  });

  it('returns estimated_amount when final is null', () => {
    const exp = makeExpense({ estimated_amount: 10000, final_amount: null });
    expect(getWorkingAmount(exp)).toBe(10000);
  });

  it('returns null when both are null', () => {
    const exp = makeExpense({ estimated_amount: null, final_amount: null });
    expect(getWorkingAmount(exp)).toBeNull();
  });

  it('returns 0 when final_amount is 0', () => {
    const exp = makeExpense({ estimated_amount: 10000, final_amount: 0 });
    expect(getWorkingAmount(exp)).toBe(0);
  });

  it('returns estimated when final is empty string', () => {
    const exp = makeExpense({ estimated_amount: 10000, final_amount: '' });
    expect(getWorkingAmount(exp)).toBe(10000);
  });
});

// ─── getPaidAmount ─────────────────────────────────────
describe('getPaidAmount', () => {
  it('sums all payments for an expense', () => {
    const payments = [
      makePayment({ expense_id: 'exp-1', amount: 3000 }),
      makePayment({ id: 'pay-2', expense_id: 'exp-1', amount: 2000 }),
    ];
    expect(getPaidAmount('exp-1', payments)).toBe(5000);
  });

  it('ignores payments for other expenses', () => {
    const payments = [
      makePayment({ expense_id: 'exp-1', amount: 3000 }),
      makePayment({ id: 'pay-2', expense_id: 'exp-2', amount: 2000 }),
    ];
    expect(getPaidAmount('exp-1', payments)).toBe(3000);
  });

  it('returns 0 when no payments exist', () => {
    expect(getPaidAmount('exp-1', [])).toBe(0);
  });
});

// ─── getOutstandingAmount ──────────────────────────────
describe('getOutstandingAmount', () => {
  it('returns working minus paid', () => {
    const exp = makeExpense({ final_amount: 10000 });
    const payments = [makePayment({ amount: 3000 })];
    expect(getOutstandingAmount(exp, payments)).toBe(7000);
  });

  it('returns 0 when fully paid', () => {
    const exp = makeExpense({ final_amount: 10000 });
    const payments = [makePayment({ amount: 10000 })];
    expect(getOutstandingAmount(exp, payments)).toBe(0);
  });

  it('returns 0 when overpaid (never negative)', () => {
    const exp = makeExpense({ final_amount: 10000 });
    const payments = [makePayment({ amount: 15000 })];
    expect(getOutstandingAmount(exp, payments)).toBe(0);
  });

  it('returns null when working amount is unknown', () => {
    const exp = makeExpense({ estimated_amount: null, final_amount: null });
    expect(getOutstandingAmount(exp, [])).toBeNull();
  });

  it('uses estimated when final is null', () => {
    const exp = makeExpense({ estimated_amount: 8000, final_amount: null });
    const payments = [makePayment({ amount: 3000 })];
    expect(getOutstandingAmount(exp, payments)).toBe(5000);
  });
});

// ─── getOverpaidAmount ─────────────────────────────────
describe('getOverpaidAmount', () => {
  it('returns 0 when not overpaid', () => {
    const exp = makeExpense({ final_amount: 10000 });
    const payments = [makePayment({ amount: 5000 })];
    expect(getOverpaidAmount(exp, payments)).toBe(0);
  });

  it('returns overpayment amount', () => {
    const exp = makeExpense({ final_amount: 10000 });
    const payments = [makePayment({ amount: 15000 })];
    expect(getOverpaidAmount(exp, payments)).toBe(5000);
  });

  it('returns null when working amount unknown', () => {
    const exp = makeExpense({ estimated_amount: null, final_amount: null });
    expect(getOverpaidAmount(exp, [])).toBeNull();
  });
});

// ─── getPaymentStatus ──────────────────────────────────
describe('getPaymentStatus', () => {
  it('returns cancelled for archived expense', () => {
    const exp = makeExpense({ is_archived: true });
    expect(getPaymentStatus(exp, [])).toBe('cancelled');
  });

  it('returns cancelled for cancelled status', () => {
    const exp = makeExpense({ status: 'cancelled' });
    expect(getPaymentStatus(exp, [])).toBe('cancelled');
  });

  it('returns unknown when working amount is null', () => {
    const exp = makeExpense({ estimated_amount: null, final_amount: null });
    expect(getPaymentStatus(exp, [])).toBe('unknown');
  });

  it('returns unpaid when no payments', () => {
    const exp = makeExpense({ final_amount: 10000 });
    expect(getPaymentStatus(exp, [])).toBe('unpaid');
  });

  it('returns partially_paid for partial payments', () => {
    const exp = makeExpense({ final_amount: 10000 });
    const payments = [makePayment({ amount: 5000 })];
    expect(getPaymentStatus(exp, payments)).toBe('partially_paid');
  });

  it('returns fully_paid when paid equals cost', () => {
    const exp = makeExpense({ final_amount: 10000 });
    const payments = [makePayment({ amount: 10000 })];
    expect(getPaymentStatus(exp, payments)).toBe('fully_paid');
  });

  it('returns overpaid when paid exceeds cost', () => {
    const exp = makeExpense({ final_amount: 10000 });
    const payments = [makePayment({ amount: 15000 })];
    expect(getPaymentStatus(exp, payments)).toBe('overpaid');
  });

  it('returns fully_paid when cost is 0', () => {
    const exp = makeExpense({ estimated_amount: 0, final_amount: 0 });
    expect(getPaymentStatus(exp, [])).toBe('fully_paid');
  });
});

// ─── calculateTotals ───────────────────────────────────
describe('calculateTotals', () => {
  it('calculates totals for multiple expenses', () => {
    const expenses = [
      makeExpense({ id: 'e1', estimated_amount: 10000, final_amount: 12000 }),
      makeExpense({ id: 'e2', estimated_amount: 5000, final_amount: null }),
    ];
    const payments = [
      makePayment({ expense_id: 'e1', amount: 3000 }),
      makePayment({ id: 'p2', expense_id: 'e2', amount: 2000 }),
    ];
    const totals = calculateTotals(expenses, payments);

    expect(totals.totalEstimated).toBe(15000);
    expect(totals.totalFinal).toBe(12000);
    expect(totals.totalWorking).toBe(17000); // 12000 + 5000
    expect(totals.totalPaid).toBe(5000);
    expect(totals.totalOutstanding).toBe(12000);
    expect(totals.expenseCount).toBe(2);
  });

  it('excludes archived expenses by default', () => {
    const expenses = [
      makeExpense({ id: 'e1', final_amount: 10000, is_archived: false }),
      makeExpense({ id: 'e2', final_amount: 5000, is_archived: true }),
    ];
    const totals = calculateTotals(expenses, []);
    expect(totals.totalWorking).toBe(10000);
    expect(totals.expenseCount).toBe(1);
  });

  it('includes archived when option set', () => {
    const expenses = [
      makeExpense({ id: 'e1', final_amount: 10000, is_archived: false }),
      makeExpense({ id: 'e2', final_amount: 5000, is_archived: true }),
    ];
    const totals = calculateTotals(expenses, [], { includeArchived: true });
    expect(totals.totalWorking).toBe(15000);
    expect(totals.expenseCount).toBe(2);
  });

  it('excludes cancelled expenses', () => {
    const expenses = [
      makeExpense({ id: 'e1', final_amount: 10000 }),
      makeExpense({ id: 'e2', final_amount: 5000, status: 'cancelled' }),
    ];
    const totals = calculateTotals(expenses, []);
    expect(totals.totalWorking).toBe(10000);
  });

  it('handles empty arrays', () => {
    const totals = calculateTotals([], []);
    expect(totals.totalWorking).toBe(0);
    expect(totals.totalPaid).toBe(0);
    expect(totals.expenseCount).toBe(0);
  });

  it('detects overpayment in totals', () => {
    const expenses = [makeExpense({ id: 'e1', final_amount: 5000 })];
    const payments = [makePayment({ expense_id: 'e1', amount: 8000 })];
    const totals = calculateTotals(expenses, payments);
    expect(totals.totalOverpaid).toBe(3000);
    expect(totals.totalOutstanding).toBe(0);
  });
});

// ─── calculateBudgetHealth ─────────────────────────────
describe('calculateBudgetHealth', () => {
  it('calculates remaining budget', () => {
    const health = calculateBudgetHealth(2000000, 1500000, 500000);
    expect(health.budgetRemaining).toBe(500000);
    expect(health.isOverBudget).toBe(false);
    expect(health.budgetUsedPercent).toBe(75);
  });

  it('detects over budget', () => {
    const health = calculateBudgetHealth(1000000, 1200000, 500000);
    expect(health.budgetRemaining).toBe(-200000);
    expect(health.isOverBudget).toBe(true);
    expect(health.overBudgetAmount).toBe(200000);
  });

  it('handles null budget', () => {
    const health = calculateBudgetHealth(null, 500000, 200000);
    expect(health.budget).toBe(0);
    expect(health.budgetRemaining).toBe(-500000);
    expect(health.budgetUsedPercent).toBe(0);
  });

  it('handles zero budget without division error', () => {
    const health = calculateBudgetHealth(0, 500000, 200000);
    expect(health.budgetUsedPercent).toBe(0);
  });

  it('caps percentage at 100', () => {
    const health = calculateBudgetHealth(100000, 200000, 50000);
    expect(health.budgetUsedPercent).toBe(100);
  });
});
