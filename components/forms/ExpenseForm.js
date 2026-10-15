'use client';

import { useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { validate, expenseSchema } from '../../lib/validation';

/**
 * Expense create/edit form used inside a Modal.
 * @param {object} props
 * @param {object|null} props.expense - Existing expense for editing, null for create
 * @param {string} [props.defaultCategoryId] - Pre-selected category
 * @param {function} props.onDone - Called after successful save
 * @param {function} [props.onSwitchToCategory] - Switch to category creation
 */
export default function ExpenseForm({ expense, defaultCategoryId, onDone, onSwitchToCategory }) {
  const { addExpense, updateExpense, activeCategories, categories, notify } = useWorkspace();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const defaultCatId = expense?.category_id
    || defaultCategoryId
    || activeCategories[0]?.id
    || '';

  function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: String(form.get('name') || '').trim(),
      category_id: String(form.get('category_id') || ''),
      vendor: String(form.get('vendor') || '').trim() || null,
      estimated_amount: form.get('estimated_amount'),
      final_amount: form.get('final_amount'),
      due_date: String(form.get('due_date') || '') || null,
      notes: String(form.get('notes') || '').trim() || null,
      status: String(form.get('status') || 'planned'),
    };

    const result = validate(expenseSchema, data);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    // Ensure category belongs to same workspace (all local categories are workspace-scoped)
    const targetCat = categories.find((c) => c.id === result.data.category_id);
    if (!targetCat) {
      setErrors({ category_id: 'Invalid category.' });
      return;
    }

    setSaving(true);
    setErrors({});

    if (expense) {
      updateExpense(expense.id, result.data);
    } else {
      addExpense(result.data);
    }

    setSaving(false);
    onDone?.();
  }

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <label>
        Item name *
        <input
          name="name"
          required
          maxLength={120}
          placeholder="e.g. Wedding dinner, venue booking"
          defaultValue={expense?.name || ''}
          autoFocus
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

      <div className="form-two-col">
        <label>
          Estimated cost (₹)
          <input
            name="estimated_amount"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            defaultValue={expense?.estimated_amount ?? ''}
          />
          {errors.estimated_amount && <span className="field-hint" style={{ color: '#b45309' }}>{errors.estimated_amount}</span>}
        </label>
        <label>
          Final cost (₹)
          <input
            name="final_amount"
            type="number"
            min="0"
            step="1"
            placeholder="Leave blank until confirmed"
            defaultValue={expense?.final_amount ?? ''}
          />
          {errors.final_amount && <span className="field-hint" style={{ color: '#b45309' }}>{errors.final_amount}</span>}
        </label>
      </div>

      <label>
        Status
        <select name="status" defaultValue={expense?.status || 'planned'}>
          <option value="planned">Planned</option>
          <option value="booked">Booked</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>

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

      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={onDone}>
          Cancel
        </button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : expense ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}
