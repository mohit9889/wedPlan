'use client';

import { useState, useMemo } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { validate, expenseSchema } from '../../lib/validation';
import { todayISO } from '../../lib/dates';
import ConfirmDialog from '../ui/ConfirmDialog';
import { CreditCard, Trash2, AlertCircle } from 'lucide-react';

/**
 * Expense create/edit form with a single Cost field (text numeric input),
 * status-based payment recording, overpayment prevention, and permanent delete option.
 *
 * @param {object} props
 * @param {object|null} props.expense - Existing expense for editing, null for create
 * @param {string} [props.defaultCategoryId] - Pre-selected category
 * @param {function} props.onDone - Called after successful save/delete
 * @param {function} [props.onSwitchToCategory] - Switch to category creation
 */
export default function ExpenseForm({ expense, defaultCategoryId, onDone, onSwitchToCategory }) {
  const {
    addExpense, updateExpense, deleteExpense, addPayment,
    activeCategories, categories, payments,
    getPaidAmount, formatINR,
  } = useWorkspace();

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Status state
  const [status, setStatus] = useState(expense?.status || 'planned');

  // Single Cost field: initialize from existing expense (checking final_amount or estimated_amount)
  const initialCost = expense?.final_amount ?? expense?.estimated_amount ?? '';
  const [cost, setCost] = useState(initialCost !== '' && initialCost !== null ? String(initialCost) : '');

  // Numeric cost for calculations
  const workingAmount = useMemo(() => {
    if (cost !== '' && !isNaN(Number(cost))) {
      return Number(cost);
    }
    return 0;
  }, [cost]);

  // Existing payments for this expense
  const existingPaid = useMemo(() => {
    if (!expense?.id) return 0;
    return getPaidAmount(expense.id, payments);
  }, [expense?.id, payments, getPaidAmount]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, workingAmount - existingPaid);
  }, [workingAmount, existingPaid]);

  const isFullyPaid = workingAmount > 0 && existingPaid >= workingAmount;
  const isOverpaid = workingAmount > 0 && existingPaid > workingAmount;

  // Embedded payment is eligible for 'booked', 'partially_paid', and 'paid'
  const isPaymentEligible = ['booked', 'partially_paid', 'paid'].includes(status);

  // IMPORTANT: For an existing expense, recordPayment MUST default to false.
  // When editing an expense, the user does not want to re-record payments unless explicitly requested.
  // For a brand new expense with paid/booked status, default to true.
  const [recordPayment, setRecordPayment] = useState(() => {
    if (expense) return false;
    return ['paid', 'booked', 'partially_paid'].includes(status);
  });

  // Suggested payment amount
  const [paymentAmount, setPaymentAmount] = useState(() => {
    if (expense) return '';
    if (status === 'paid' && workingAmount > 0) return String(workingAmount);
    return '';
  });

  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // When status changes:
  function handleStatusChange(newStatus) {
    setStatus(newStatus);
    if (newStatus === 'paid') {
      if (remainingBalance > 0) {
        setPaymentAmount(String(remainingBalance));
        setRecordPayment(true);
      } else {
        // Already fully paid or 0 cost: do not suggest full cost and do not auto-check
        setPaymentAmount('');
        setRecordPayment(false);
      }
    } else if (newStatus === 'booked' || newStatus === 'partially_paid') {
      if (!paymentAmount) {
        // Keep payment unchecked on existing expense unless user wants to add an installment
        if (!expense) setRecordPayment(true);
      }
    }
  }

  const defaultCatId = expense?.category_id
    || defaultCategoryId
    || activeCategories[0]?.id
    || '';

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const numericCost = cost.trim() !== '' ? Number(cost) : null;

    const data = {
      name: String(form.get('name') || '').trim(),
      category_id: String(form.get('category_id') || ''),
      vendor: String(form.get('vendor') || '').trim() || null,
      estimated_amount: numericCost,
      final_amount: numericCost,
      due_date: String(form.get('due_date') || '') || null,
      notes: String(form.get('notes') || '').trim() || null,
      status: status,
    };

    const result = validate(expenseSchema, data);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    const targetCat = categories.find((c) => c.id === result.data.category_id);
    if (!targetCat) {
      setErrors({ category_id: 'Invalid category.' });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      let savedExpenseId = expense?.id;
      if (expense) {
        updateExpense(expense.id, result.data);
      } else {
        const created = addExpense(result.data);
        savedExpenseId = created.id;
      }

      // Record payment ONLY if user explicitly chose to record payment and provided positive amount
      if (isPaymentEligible && recordPayment && paymentAmount && Number(paymentAmount) > 0) {
        const autoNote = status === 'booked'
          ? 'Booking deposit / token'
          : status === 'paid'
            ? 'Final full payment'
            : 'Partial advance payment';

        addPayment({
          expense_id: savedExpenseId,
          amount: Number(paymentAmount),
          paid_at: paymentDate || todayISO(),
          payment_method: paymentMethod || 'UPI',
          reference: paymentReference?.trim() || null,
          notes: paymentNotes?.trim() || autoNote,
        });
      }

      setSaving(false);
      onDone?.();
    } catch (err) {
      setSaving(false);
      setErrors({ form: err.message });
    }
  }

  async function handleDeleteConfirm() {
    if (!expense?.id) return;
    setSaving(true);
    await deleteExpense(expense.id);
    setSaving(false);
    onDone?.();
  }

  return (
    <>
      <form className="modal-form" onSubmit={handleSubmit}>
        {errors.form && (
          <div className="tip-box" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}>
            <AlertCircle size={16} />
            <span>{errors.form}</span>
          </div>
        )}

        <label>
          Item name *
          <input
            name="name"
            required
            maxLength={120}
            placeholder="e.g. Wedding dinner, venue booking"
            defaultValue={expense?.name || ''}
            autoFocus={!expense}
          />
          {errors.name && <span className="field-hint" style={{ color: '#b45309' }}>{errors.name}</span>}
        </label>

        <label>
          Category *
          <select name="category_id" required defaultValue={defaultCatId}>
            {activeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {onSwitchToCategory && (
            <span className="field-hint">
              Need a new category?{' '}
              <button type="button" className="inline-link" onClick={onSwitchToCategory}>
                Create one
              </button>
            </span>
          )}
          {errors.category_id && <span className="field-hint" style={{ color: '#b45309' }}>{errors.category_id}</span>}
        </label>

        {/* ─── Single Cost Field (Text input allowing numbers only) ─── */}
        <label>
          Cost (₹)
          <input
            name="cost"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={cost}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setCost(val);
              if (errors.estimated_amount || errors.final_amount) {
                setErrors((prev) => ({ ...prev, estimated_amount: null, final_amount: null }));
              }
            }}
          />
          {(errors.estimated_amount || errors.final_amount) && (
            <span className="field-hint" style={{ color: '#b45309' }}>
              {errors.estimated_amount || errors.final_amount}
            </span>
          )}
        </label>

        <label>
          Status
          <select
            name="status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="planned">Planned</option>
            <option value="booked">Booked (Token / Deposit)</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid (Full settlement)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        {/* ─── Embedded Payment Section for Booked, Partially Paid, Paid ─── */}
        {isPaymentEligible && (
          <div className="embedded-payment-box">
            <div className="embedded-payment-header">
              <b>
                <CreditCard size={17} color="#0f766e" />
                {status === 'booked'
                  ? 'Booking token'
                  : status === 'paid'
                    ? 'Payment settlement'
                    : 'Partial payment'}
              </b>
              <span className="embedded-payment-tag">{status.replace('_', ' ')}</span>
            </div>

            {/* Existing payment summary & overpayment alert */}
            {expense && existingPaid > 0 && (
              <div style={{
                fontSize: 12,
                background: isOverpaid ? '#fef2f2' : isFullyPaid ? '#ecfdf5' : '#e6fffa',
                border: `1px solid ${isOverpaid ? '#fecaca' : isFullyPaid ? '#a7f3d0' : '#99f6e4'}`,
                padding: '8px 12px',
                borderRadius: 8,
                color: isOverpaid ? '#991b1b' : isFullyPaid ? '#065f46' : '#0f766e',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
              }}>
                <span>Already paid: <b>{formatINR(existingPaid)}</b></span>
                <span>
                  {isOverpaid
                    ? <b>Overpaid by {formatINR(existingPaid - workingAmount)}</b>
                    : isFullyPaid
                      ? <b>Fully paid (No balance due)</b>
                      : <>Remaining: <b>{formatINR(remainingBalance)}</b></>
                  }
                </span>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#234e46', margin: '2px 0' }}>
              <input
                type="checkbox"
                checked={recordPayment}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRecordPayment(checked);
                  if (checked && !paymentAmount && remainingBalance > 0 && status === 'paid') {
                    setPaymentAmount(String(remainingBalance));
                  }
                }}
                style={{ width: 'auto' }}
              />
              {expense ? 'Record an additional payment for this expense now' : 'Record a payment for this expense now'}
            </label>

            {recordPayment && (
              <div style={{ display: 'grid', gap: 11, marginTop: 4 }}>
                <label>
                  Payment amount (₹) *
                  <input
                    name="payment_amount"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required={recordPayment}
                    placeholder={
                      status === 'paid' && remainingBalance > 0
                        ? `Suggested: ${remainingBalance}`
                        : 'e.g. 5000'
                    }
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  {paymentAmount && Number(paymentAmount) > remainingBalance && workingAmount > 0 && (
                    <span className="field-hint" style={{ color: '#b45309' }}>
                      Note: This payment exceeds the remaining balance by {formatINR(Number(paymentAmount) - remainingBalance)}.
                    </span>
                  )}
                </label>

                <div className="form-two-col">
                  <label>
                    Payment date
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Payment method
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="UPI">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>

                <div className="form-two-col">
                  <label>
                    Reference / Transaction ID
                    <input
                      maxLength={100}
                      placeholder="Optional (e.g. UPI ref)"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </label>
                  <label>
                    Payment note
                    <input
                      maxLength={150}
                      placeholder={
                        status === 'booked'
                          ? 'e.g. Token paid'
                          : status === 'paid'
                            ? 'e.g. Final settlement'
                            : 'e.g. Advance paid'
                      }
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <label>
          Vendor / provider
          <input
            name="vendor"
            maxLength={120}
            placeholder="Optional"
            defaultValue={expense?.vendor || ''}
          />
        </label>

        <label>
          Payment due date
          <input
            name="due_date"
            type="date"
            defaultValue={expense?.due_date || ''}
          />
        </label>

        <label>
          Notes
          <textarea
            name="notes"
            rows={3}
            maxLength={1000}
            placeholder="Add details, promises, or reminders"
            defaultValue={expense?.notes || ''}
          />
        </label>

        <div className="modal-actions-split">
          <div>
            {expense && (
              <button
                type="button"
                className="danger-button small"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={15} /> Delete expense
              </button>
            )}
          </div>
          <div className="modal-actions-right">
            <button type="button" className="secondary-button" onClick={onDone}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : expense ? 'Save changes' : 'Add expense'}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog for Permanent Deletion */}
      {expense && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete expense?"
          message={`Are you sure you want to permanently delete "${expense.name}"? This action cannot be undone and will also delete all associated payment records.`}
          confirmLabel="Delete permanently"
          destructive={true}
        />
      )}
    </>
  );
}
