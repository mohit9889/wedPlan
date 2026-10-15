import { describe, it, expect } from 'vitest';
import {
  categorySchema,
  expenseSchema,
  paymentSchema,
  workspaceSchema,
  validate,
  isCategoryNameDuplicate,
} from '../lib/validation.js';

// ─── Category Validation ──────────────────────────────
describe('categorySchema', () => {
  it('validates a valid category', () => {
    const result = validate(categorySchema, { name: 'Catering', budget_amount: 50000 });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Catering');
    expect(result.data.budget_amount).toBe(50000);
  });

  it('rejects empty name', () => {
    const result = validate(categorySchema, { name: '', budget_amount: 0 });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('name');
  });

  it('rejects name over 80 characters', () => {
    const result = validate(categorySchema, { name: 'x'.repeat(81) });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('name');
  });

  it('allows null budget', () => {
    const result = validate(categorySchema, { name: 'Gifts', budget_amount: null });
    expect(result.success).toBe(true);
    expect(result.data.budget_amount).toBeNull();
  });

  it('rejects negative budget', () => {
    const result = validate(categorySchema, { name: 'Gifts', budget_amount: -100 });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('budget_amount');
  });

  it('treats empty string budget as null', () => {
    const result = validate(categorySchema, { name: 'Gifts', budget_amount: '' });
    expect(result.success).toBe(true);
    expect(result.data.budget_amount).toBeNull();
  });
});

// ─── Expense Validation ───────────────────────────────
describe('expenseSchema', () => {
  it('validates a valid expense', () => {
    const result = validate(expenseSchema, {
      name: 'Venue Booking',
      category_id: 'cat-1',
      estimated_amount: 100000,
      final_amount: null,
      status: 'planned',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = validate(expenseSchema, { name: '', category_id: 'cat-1' });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('name');
  });

  it('rejects missing category', () => {
    const result = validate(expenseSchema, { name: 'Item', category_id: '' });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('category_id');
  });

  it('rejects negative estimated amount', () => {
    const result = validate(expenseSchema, {
      name: 'Item', category_id: 'cat-1', estimated_amount: -500,
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('estimated_amount');
  });

  it('allows null final amount', () => {
    const result = validate(expenseSchema, {
      name: 'Item', category_id: 'cat-1', final_amount: null,
    });
    expect(result.success).toBe(true);
    expect(result.data.final_amount).toBeNull();
  });

  it('allows empty string final amount as null', () => {
    const result = validate(expenseSchema, {
      name: 'Item', category_id: 'cat-1', final_amount: '',
    });
    expect(result.success).toBe(true);
    expect(result.data.final_amount).toBeNull();
  });

  it('validates status enum', () => {
    const result = validate(expenseSchema, {
      name: 'Item', category_id: 'cat-1', status: 'invalid_status',
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('status');
  });
});

// ─── Payment Validation ───────────────────────────────
describe('paymentSchema', () => {
  it('validates a valid payment', () => {
    const result = validate(paymentSchema, {
      expense_id: 'exp-1',
      amount: 5000,
      paid_at: '2026-01-15',
      payment_method: 'UPI',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = validate(paymentSchema, {
      expense_id: 'exp-1',
      amount: 0,
      paid_at: '2026-01-15',
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('amount');
  });

  it('rejects negative amount', () => {
    const result = validate(paymentSchema, {
      expense_id: 'exp-1',
      amount: -100,
      paid_at: '2026-01-15',
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('amount');
  });

  it('rejects missing expense_id', () => {
    const result = validate(paymentSchema, {
      expense_id: '',
      amount: 5000,
      paid_at: '2026-01-15',
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('expense_id');
  });

  it('rejects missing paid_at', () => {
    const result = validate(paymentSchema, {
      expense_id: 'exp-1',
      amount: 5000,
      paid_at: '',
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty('paid_at');
  });
});

// ─── Workspace Validation ─────────────────────────────
describe('workspaceSchema', () => {
  it('validates a valid workspace', () => {
    const result = validate(workspaceSchema, {
      name: 'Our Wedding',
      overall_budget: 2000000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty workspace name', () => {
    const result = validate(workspaceSchema, { name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects negative budget', () => {
    const result = validate(workspaceSchema, { name: 'Test', overall_budget: -1 });
    expect(result.success).toBe(false);
  });
});

// ─── Duplicate Category Check ─────────────────────────
describe('isCategoryNameDuplicate', () => {
  const categories = [
    { id: 'cat-1', name: 'Jewellery' },
    { id: 'cat-2', name: 'Clothes' },
    { id: 'cat-3', name: 'Catering' },
  ];

  it('detects exact duplicate', () => {
    expect(isCategoryNameDuplicate('Jewellery', categories)).toBe(true);
  });

  it('detects case-insensitive duplicate', () => {
    expect(isCategoryNameDuplicate('jewellery', categories)).toBe(true);
    expect(isCategoryNameDuplicate('CLOTHES', categories)).toBe(true);
  });

  it('allows unique name', () => {
    expect(isCategoryNameDuplicate('Venue', categories)).toBe(false);
  });

  it('excludes self when editing', () => {
    expect(isCategoryNameDuplicate('Jewellery', categories, 'cat-1')).toBe(false);
  });

  it('detects duplicate even when excluding different id', () => {
    expect(isCategoryNameDuplicate('Jewellery', categories, 'cat-2')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(isCategoryNameDuplicate('  Jewellery  ', categories)).toBe(true);
  });
});
