'use client';

import { useState } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PaymentForm from '../../components/forms/PaymentForm';
import { downloadCsv, buildPaymentExportRows } from '../../lib/exports';
import { getWorkingAmount, getPaidAmount } from '../../lib/calculations';
import { formatDate } from '../../lib/dates';

export default function PaymentsPage() {
  const {
    payments, expenses, categories, totals, formatINR, deletePayment,
  } = useWorkspace();

  const [modal, setModal] = useState(null);
  const [filterExpense, setFilterExpense] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sortedPayments = [...payments]
    .sort((a, b) => String(b.paid_at || b.payment_date || '').localeCompare(String(a.paid_at || a.payment_date || '')));

  const filteredPayments = sortedPayments.filter((p) => {
    const expenseOk = filterExpense === 'all' || p.expense_id === filterExpense;
    const methodOk = filterMethod === 'all' || (p.payment_method || p.method || '') === filterMethod;
    return expenseOk && methodOk;
  });

  const methods = [...new Set(payments.map((p) => p.payment_method || p.method || '').filter(Boolean))];
  const expensesWithPayments = [...new Set(payments.map((p) => p.expense_id))];

  function exportPayments() {
    const rows = buildPaymentExportRows(filteredPayments, expenses, categories);
    downloadCsv('wedding-payments.csv', rows);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVERY RUPEE, ACCOUNTED FOR</div>
          <h1>Payments</h1>
          <p>Keep a clear record of every advance and instalment.</p>
        </div>
        <button className="primary-button" onClick={() => setModal('payment')}>
          <Plus size={18} /> Record payment
        </button>
      </div>

      {/* ─── Summary Tiles ────────────────────────────────── */}
      <div className="payment-summary-grid">
        <div className="summary-tile">
          <span>Total paid</span>
          <b>{formatINR(totals.totalPaid)}</b>
          <small>Across {payments.length} payment records</small>
        </div>
        <div className="summary-tile">
          <span>Still outstanding</span>
          <b>{formatINR(totals.totalOutstanding)}</b>
          <small>Based on current item costs</small>
        </div>
      </div>

      {/* ─── Payment Table ────────────────────────────────── */}
      <div className="panel payments-panel">
        <div className="panel-heading">
          <div>
            <h2>Payment history</h2>
            <p>Newest records appear first</p>
          </div>
          <button className="text-button" onClick={exportPayments}>
            <Download size={15} /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <select
            id="payment-expense-filter"
            name="expense_filter"
            aria-label="Filter payments by expense"
            className="select-field"
            value={filterExpense}
            onChange={(e) => setFilterExpense(e.target.value)}
          >
            <option value="all">All expenses</option>
            {expensesWithPayments.map((eid) => {
              const exp = expenses.find((e) => e.id === eid);
              return (
                <option key={eid} value={eid}>
                  {exp?.name || 'Archived item'}
                </option>
              );
            })}
          </select>
          {methods.length > 0 && (
            <select
              id="payment-method-filter"
              name="method_filter"
              aria-label="Filter payments by payment method"
              className="select-field"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option value="all">All methods</option>
              {methods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>

        <div className="payment-table-wrap">
          <table className="payment-table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Date</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Notes</th>
                <th className="align-right">Amount</th>
                <th style={{ width: 44, textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => {
                const exp = expenses.find((e) => e.id === p.expense_id);
                const cat = exp
                  ? categories.find((c) => c.id === exp.category_id)
                  : null;
                return (
                  <tr key={p.id}>
                    <td>
                      <b>{exp?.name || 'Archived item'}</b>
                      <small>{cat?.name || '—'}</small>
                    </td>
                    <td>{formatDate(p.paid_at || p.payment_date) || '—'}</td>
                    <td>{p.payment_method || p.method || '—'}</td>
                    <td>{p.reference || '—'}</td>
                    <td>{p.notes || '—'}</td>
                    <td className="align-right paid-text">{formatINR(p.amount)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="icon-button danger"
                        aria-label="Delete payment"
                        title="Delete payment record"
                        onClick={() => setConfirmDelete(p)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="empty-state" style={{ marginTop: 12 }}>
            No payments {filterExpense !== 'all' || filterMethod !== 'all' ? 'matching filters' : 'yet'}.
            {filterExpense === 'all' && filterMethod === 'all' && ' Record your first advance or instalment.'}
          </div>
        )}
      </div>

      {/* ─── Payment Modal ───────────────────────────────── */}
      <Modal
        open={modal === 'payment'}
        onClose={() => setModal(null)}
        title="Record a payment"
        eyebrow="PAYMENT RECORD"
      >
        <PaymentForm expense={null} onDone={() => setModal(null)} />
      </Modal>

      {/* ─── Confirm Delete Payment ──────────────────────── */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deletePayment(confirmDelete.id)}
        title="Delete payment record?"
        message={`Are you sure you want to delete this payment of ${confirmDelete ? formatINR(confirmDelete.amount) : ''}? This will restore the outstanding balance for the expense.`}
        confirmLabel="Delete payment"
        destructive
      />
    </>
  );
}
