'use client';

import { useState, useMemo } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { validate, expenseSchema } from '../../lib/validation';
import { todayISO } from '../../lib/dates';
import ConfirmDialog from '../ui/ConfirmDialog';
import { CreditCard, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Expense create/edit form with:
 * - Single Cost field (text numeric input)
 * - Status-driven payment details:
 *   - Paid fully: hides payment amount field (records full amount / remaining balance automatically)
 *   - Partial payment: asks "How much is already paid?" and shows rest amount need to be paid
 *   - Booked: asks "How much token is paid?" and shows rest amount need to be paid
 * - Overpayment prevention
 * - Permanent delete option with confirmation
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

  // Amounts for Booked and Partially Paid
  const [tokenAmount, setTokenAmount] = useState(() => {
    if (expense?.id && existingPaid > 0 && expense.status === 'booked') {
      return String(existingPaid);
    }
    return '';
  });

  const [partialAmount, setPartialAmount] = useState(() => {
    if (expense?.id && existingPaid > 0 && expense.status === 'partially_paid') {
      return String(existingPaid);
    }
    return '';
  });

  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Handle status changes
  function handleStatusChange(newStatus) {
    setStatus(newStatus);
    if (newStatus === 'booked' && !tokenAmount && existingPaid > 0) {
      setTokenAmount(String(existingPaid));
    }
    if (newStatus === 'partially_paid' && !partialAmount && existingPaid > 0) {
      setPartialAmount(String(existingPaid));
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

      // ─── Calculate Payment to Record based on Status ─────────
      let paymentToRecord = 0;
      let autoNote = '';

      if (status === 'paid') {
        // Paid fully: records whatever remains (or full working amount if new)
        paymentToRecord = remainingBalance > 0 ? remainingBalance : (expense ? 0 : workingAmount);
        autoNote = 'Final full payment';
      } else if (status === 'booked') {
        const enteredToken = Number(tokenAmount || 0);
        if (expense && existingPaid > 0) {
          paymentToRecord = Math.max(0, enteredToken - existingPaid);
        } else {
          paymentToRecord = enteredToken;
        }
        autoNote = 'Booking deposit / token';
      } else if (status === 'partially_paid') {
        const enteredPartial = Number(partialAmount || 0);
        if (expense && existingPaid > 0) {
          paymentToRecord = Math.max(0, enteredPartial - existingPaid);
        } else {
          paymentToRecord = enteredPartial;
        }
        autoNote = 'Partial advance payment';
      }

      // Record payment only if positive amount to record
      if (paymentToRecord > 0) {
        addPayment({
          expense_id: savedExpenseId,
          amount: paymentToRecord,
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
            <option value="booked">Booked</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid fully</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        {/* ─── 1. STATUS: PAID FULLY (No payment amount field shown) ─── */}
        {status === 'paid' && (
          <div className="embedded-payment-box">
            <div className="embedded-payment-header">
              <b>
                <CheckCircle size={17} color="#0f766e" />
                Payment Settlement
              </b>
              <span className="embedded-payment-tag">PAID FULLY</span>
            </div>

            <div style={{
              fontSize: 13,
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              padding: '10px 14px',
              borderRadius: 10,
              color: '#0f766e',
              lineHeight: 1.5,
            }}>
              {workingAmount === 0 ? (
                <span>Please enter the <b>Cost</b> above to record the full payment.</span>
              ) : remainingBalance > 0 ? (
                <div>
                  <div>Full payment of <b>{formatINR(remainingBalance)}</b> will be recorded on save.</div>
                  {existingPaid > 0 && (
                    <div style={{ fontSize: 11, color: '#115e59', marginTop: 3 }}>
                      Already paid: {formatINR(existingPaid)} · Final balance to complete: {formatINR(remainingBalance)}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <b>✓ Fully paid ({formatINR(existingPaid)} already paid)</b>
                  <div style={{ fontSize: 11, color: '#115e59', marginTop: 2 }}>
                    No additional payment is required.
                  </div>
                </div>
              )}
            </div>

            {/* Payment details (Date, Method, Reference, Notes) */}
            {remainingBalance > 0 && workingAmount > 0 && (
              <div style={{ display: 'grid', gap: 11, marginTop: 4 }}>
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
                      placeholder="e.g. Final full settlement"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── 2. STATUS: BOOKED (Ask token paid & show rest amount) ─── */}
        {status === 'booked' && (
          <div className="embedded-payment-box">
            <div className="embedded-payment-header">
              <b>
                <CreditCard size={17} color="#0f766e" />
                Booking Token Details
              </b>
              <span className="embedded-payment-tag">BOOKED</span>
            </div>

            <label>
              How much token is paid? (₹) *
              <input
                name="token_amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter token amount paid"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </label>

            {/* Rest amount need to be paid */}
            <div style={{
              fontSize: 12,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '9px 12px',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              <span>
                Token paid: <b>{formatINR(Number(tokenAmount || 0))}</b>
              </span>
              <span style={{ color: '#0f766e', fontWeight: 700 }}>
                Rest amount need to be paid: {formatINR(Math.max(0, workingAmount - Number(tokenAmount || 0)))}
              </span>
            </div>

            {Number(tokenAmount) > workingAmount && workingAmount > 0 && (
              <span className="field-hint" style={{ color: '#b45309' }}>
                Note: Token paid exceeds total cost by {formatINR(Number(tokenAmount) - workingAmount)}.
              </span>
            )}

            {Number(tokenAmount) > 0 && (
              <div style={{ display: 'grid', gap: 11, marginTop: 4 }}>
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
                      placeholder="e.g. Booking deposit / token"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── 3. STATUS: PARTIALLY PAID (Ask how much is already paid & show rest amount) ─── */}
        {status === 'partially_paid' && (
          <div className="embedded-payment-box">
            <div className="embedded-payment-header">
              <b>
                <CreditCard size={17} color="#0f766e" />
                Partial Payment Details
              </b>
              <span className="embedded-payment-tag">PARTIAL PAYMENT</span>
            </div>

            <label>
              How much is already paid? (₹) *
              <input
                name="partial_amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter amount already paid"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </label>

            {/* Rest amount need to be paid */}
            <div style={{
              fontSize: 12,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '9px 12px',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              <span>
                Already paid: <b>{formatINR(Number(partialAmount || 0))}</b>
              </span>
              <span style={{ color: '#0f766e', fontWeight: 700 }}>
                Rest amount need to be paid: {formatINR(Math.max(0, workingAmount - Number(partialAmount || 0)))}
              </span>
            </div>

            {Number(partialAmount) > workingAmount && workingAmount > 0 && (
              <span className="field-hint" style={{ color: '#b45309' }}>
                Note: Amount paid exceeds total cost by {formatINR(Number(partialAmount) - workingAmount)}.
              </span>
            )}

            {Number(partialAmount) > 0 && (
              <div style={{ display: 'grid', gap: 11, marginTop: 4 }}>
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
                      placeholder="e.g. Partial advance payment"
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
