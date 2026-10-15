import { describe, it, expect } from 'vitest';
import { toCsv, buildExpenseExportRows, buildPaymentExportRows } from '../lib/exports';

describe('CSV Export and Formula Injection Protection', () => {
  it('escapes cells starting with formula trigger characters (=, +, -, @)', () => {
    const rows = [
      ['=SUM(A1:A10)', '+cmd|/c calc!A0', '-5+5', '@danger'],
      ['Normal text', '100', 'Jane & John', 'Item, with comma']
    ];
    const csv = toCsv(rows);

    expect(csv).toContain("\"'=SUM(A1:A10)\"");
    expect(csv).toContain("\"'+cmd|/c calc!A0\"");
    expect(csv).toContain("\"'-5+5\"");
    expect(csv).toContain("\"'@danger\"");
    expect(csv).toContain('"Normal text"');
  });

  it('handles quotes by escaping them as double quotes', () => {
    const rows = [
      ['Say "Hello"', '12" Laptop']
    ];
    const csv = toCsv(rows);

    expect(csv).toContain('"Say ""Hello"""');
    expect(csv).toContain('"12"" Laptop"');
  });

  it('handles null and undefined values safely', () => {
    const rows = [
      [null, undefined, '']
    ];
    const csv = toCsv(rows);

    expect(csv).toBe('\"\",\"\",\"\"');
  });

  it('buildExpenseExportRows generates correct header and rows', () => {
    const categories = [{ id: 'cat-1', name: 'Venue & Decor' }];
    const expenses = [
      {
        id: 'exp-1',
        category_id: 'cat-1',
        name: 'Mandap Decoration',
        vendor: 'Floral Events',
        estimated_amount: 150000,
        final_amount: 140000,
        due_date: '2026-11-20',
        status: 'partially_paid',
        notes: 'Deposit paid',
        is_archived: false,
      },
      {
        id: 'exp-2',
        category_id: 'cat-1',
        name: 'Archived Tent',
        is_archived: true,
      }
    ];
    const payments = [
      { id: 'pay-1', expense_id: 'exp-1', amount: 50000 }
    ];

    const getWorkingAmount = (e) => e.final_amount ?? e.estimated_amount ?? null;
    const getPaidAmount = (expenseId, pays) =>
      pays.filter((p) => p.expense_id === expenseId).reduce((sum, p) => sum + p.amount, 0);

    const rows = buildExpenseExportRows(expenses, categories, payments, getWorkingAmount, getPaidAmount);

    expect(rows).toHaveLength(2); // Header + 1 non-archived expense
    expect(rows[0]).toEqual([
      'Category', 'Item', 'Vendor', 'Estimated Cost', 'Final Cost',
      'Working Amount', 'Paid', 'Outstanding', 'Due Date', 'Status', 'Notes'
    ]);
    expect(rows[1][0]).toBe('Venue & Decor');
    expect(rows[1][1]).toBe('Mandap Decoration');
    expect(rows[1][4]).toBe(140000); // Final cost
    expect(rows[1][5]).toBe(140000); // Working amount
    expect(rows[1][6]).toBe(50000);  // Paid
    expect(rows[1][7]).toBe(90000);  // Outstanding: 140000 - 50000
  });

  it('buildPaymentExportRows generates correct columns and handles orphaned payments', () => {
    const categories = [{ id: 'c1', name: 'Attire' }];
    const expenses = [{ id: 'e1', category_id: 'c1', name: 'Sherwani' }];
    const payments = [
      {
        id: 'p1',
        expense_id: 'e1',
        amount: 25000,
        paid_at: '2026-10-01',
        payment_method: 'UPI',
        reference: 'UPI-12345',
        notes: 'Advance'
      },
      {
        id: 'p2',
        expense_id: 'e2', // Not found in expenses
        amount: 5000,
        paid_at: '2026-10-02',
        payment_method: 'Cash',
        reference: '',
        notes: 'Unknown expense'
      }
    ];

    const rows = buildPaymentExportRows(payments, expenses, categories);
    expect(rows).toHaveLength(3); // Header + 2 payments
    expect(rows[0]).toEqual(['Expense', 'Category', 'Amount', 'Payment Date', 'Method', 'Reference', 'Notes']);
    expect(rows[1][0]).toBe('Sherwani');
    expect(rows[1][1]).toBe('Attire');
    expect(rows[1][2]).toBe(25000);
    expect(rows[2][0]).toBe('Archived item');
    expect(rows[2][1]).toBe('—');
  });
});
