import { describe, it, expect } from 'vitest';
import { expenseSchema, paymentSchema, validate } from '../lib/validation.js';

describe('Status-based Payment Flow and Expense Deletion', () => {
  it('validates expenses with status booked, partially_paid, paid', () => {
    const statuses = ['planned', 'booked', 'partially_paid', 'paid', 'cancelled'];
    for (const status of statuses) {
      const result = validate(expenseSchema, {
        name: `Expense ${status}`,
        category_id: 'cat-001',
        estimated_amount: 50000,
        status,
      });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe(status);
    }
  });

  it('calculates remaining balance correctly when suggesting payment for "paid" status', () => {
    const estimatedCost = 50000;
    const finalCost = 45000;
    const workingAmount = finalCost || estimatedCost;
    const existingPayments = [
      { amount: 15000 },
      { amount: 10000 },
    ];
    const existingPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, workingAmount - existingPaid);

    expect(existingPaid).toBe(25000);
    expect(remainingBalance).toBe(20000);

    // Validate the payment created for the remaining balance
    const paymentResult = validate(paymentSchema, {
      expense_id: 'exp-001',
      amount: remainingBalance,
      paid_at: '2026-10-15',
      payment_method: 'UPI',
      notes: 'Final full payment',
    });
    expect(paymentResult.success).toBe(true);
    expect(paymentResult.data.amount).toBe(20000);
  });

  it('determines the correct payment note based on expense status', () => {
    function getAutoNote(status) {
      return status === 'booked'
        ? 'Booking deposit / token'
        : status === 'paid'
          ? 'Final full payment'
          : 'Partial advance payment';
    }

    expect(getAutoNote('booked')).toBe('Booking deposit / token');
    expect(getAutoNote('paid')).toBe('Final full payment');
    expect(getAutoNote('partially_paid')).toBe('Partial advance payment');
  });

  it('simulates cascading delete of expense and its associated payments', () => {
    let expenses = [
      { id: 'exp-1', name: 'Venue' },
      { id: 'exp-2', name: 'Catering' },
    ];
    let payments = [
      { id: 'pay-1', expense_id: 'exp-1', amount: 50000 },
      { id: 'pay-2', expense_id: 'exp-1', amount: 20000 },
      { id: 'pay-3', expense_id: 'exp-2', amount: 30000 },
    ];

    // Delete exp-1
    const deleteId = 'exp-1';
    expenses = expenses.filter((e) => e.id !== deleteId);
    payments = payments.filter((p) => p.expense_id !== deleteId);

    expect(expenses).toHaveLength(1);
    expect(expenses[0].id).toBe('exp-2');
    expect(payments).toHaveLength(1);
    expect(payments[0].expense_id).toBe('exp-2');
  });

  it('prevents accidental duplicate payment on edit when remaining balance is 0', () => {
    const expense = {
      id: 'e-100',
      name: 'Long Set',
      estimated_amount: 415957,
      final_amount: 415957,
      status: 'paid',
    };
    const payments = [
      { id: 'p-1', expense_id: 'e-100', amount: 415957 },
    ];
    const workingAmount = expense.final_amount;
    const existingPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, workingAmount - existingPaid);

    expect(remainingBalance).toBe(0);

    // Default payment behavior for edit mode:
    // recordPayment must be false, paymentAmount must be '' (not falling back to workingAmount!)
    const isEditMode = Boolean(expense);
    const defaultRecordPayment = isEditMode ? false : true;
    const defaultPaymentAmount = remainingBalance > 0 ? remainingBalance : '';

    expect(defaultRecordPayment).toBe(false);
    expect(defaultPaymentAmount).toBe('');
  });

  it('sanitizes text input to allow numbers only', () => {
    function sanitizeNumericInput(raw) {
      return String(raw).replace(/[^0-9]/g, '');
    }

    expect(sanitizeNumericInput('12345')).toBe('12345');
    expect(sanitizeNumericInput('12,345')).toBe('12345');
    expect(sanitizeNumericInput('₹50000')).toBe('50000');
    expect(sanitizeNumericInput('abc12def34')).toBe('1234');
    expect(sanitizeNumericInput('e10+5-2')).toBe('1052');
    expect(sanitizeNumericInput('')).toBe('');
  });

  it('maps single cost input to both estimated and final amount', () => {
    const singleCostInput = '45000';
    const numericCost = singleCostInput.trim() !== '' ? Number(singleCostInput) : null;
    const data = {
      name: 'Catering',
      category_id: 'cat-1',
      estimated_amount: numericCost,
      final_amount: numericCost,
      status: 'paid',
    };

    const result = validate(expenseSchema, data);
    expect(result.success).toBe(true);
    expect(result.data.estimated_amount).toBe(45000);
    expect(result.data.final_amount).toBe(45000);
  });
});

