'use client';

import { useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { validate, paymentSchema } from '../../lib/validation';
import { todayISO } from '../../lib/dates';

/**
 * Payment recording form used inside a Modal.
 * @param {object} props
 * @param {object|null} props.expense - Pre-selected expense (optional)
 * @param {function} props.onDone - Called after successful save
 */
export default function PaymentForm({ expense, onDone }) {
  const { addPayment, activeExpenses, formatINR, getWorkingAmount } = useWorkspace();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      expense_id: String(form.get('expense_id') || ''),
      amount: form.get('amount'),
      paid_at: String(form.get('paid_at') || todayISO()),
      payment_method: String(form.get('payment_method') || 'UPI'),
      reference: String(form.get('reference') || '').trim() || null,
      notes: String(form.get('notes') || '').trim() || null,
    };

    const result = validate(paymentSchema, data);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setSaving(true);
    setErrors({});
    addPayment(result.data);
    setSaving(false);
    onDone?.();
  }

  const [amount, setAmount] = useState('');

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <label>
        Expense *
        <select name="expense_id" required defaultValue={expense?.id || ''}>
          <option value="" disabled>Select an expense</option>
          {activeExpenses.map((exp) => (
            <option key={exp.id} value={exp.id}>
              {exp.name} — {formatINR(getWorkingAmount(exp))}
            </option>
          ))}
        </select>
        {errors.expense_id && <span className="field-hint" style={{ color: '#b45309' }}>{errors.expense_id}</span>}
      </label>

      <label>
        Payment amount (₹) *
        <input
          name="amount"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          placeholder="e.g. 5000"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^0-9]/g, ''));
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
          }}
          autoFocus
        />
        {errors.amount && <span className="field-hint" style={{ color: '#b45309' }}>{errors.amount}</span>}
      </label>

      <label>
        Payment date
        <input
          name="paid_at"
          type="date"
          defaultValue={todayISO()}
        />
        {errors.paid_at && <span className="field-hint" style={{ color: '#b45309' }}>{errors.paid_at}</span>}
      </label>

      <label>
        Payment method
        <select name="payment_method" defaultValue="UPI">
          <option value="UPI">UPI</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="credit_card">Credit Card</option>
          <option value="debit_card">Debit Card</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        Reference / transaction ID
        <input
          name="reference"
          maxLength={200}
          placeholder="Optional"
        />
      </label>

      <label>
        Notes
        <input
          name="notes"
          maxLength={300}
          placeholder="e.g. Advance, second instalment"
        />
      </label>

      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={onDone}>
          Cancel
        </button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save payment'}
        </button>
      </div>
    </form>
  );
}
