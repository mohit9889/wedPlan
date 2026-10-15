'use client';

import { useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { validate, categorySchema, isCategoryNameDuplicate } from '../../lib/validation';

/**
 * Category create/edit form used inside a Modal.
 * @param {object} props
 * @param {object|null} props.category - Existing category for editing, null for create
 * @param {function} props.onDone - Called after successful save
 */
export default function CategoryForm({ category, onDone }) {
  const { addCategory, updateCategory, categories, notify } = useWorkspace();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: String(form.get('name') || '').trim(),
      budget_amount: form.get('budget_amount'),
      icon: String(form.get('icon') || 'folder'),
    };

    // Validate
    const result = validate(categorySchema, data);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    // Check duplicate name
    if (isCategoryNameDuplicate(data.name, categories, category?.id)) {
      setErrors({ name: 'A category with this name already exists.' });
      return;
    }

    setSaving(true);
    setErrors({});

    if (category) {
      updateCategory(category.id, result.data);
    } else {
      addCategory(result.data);
    }

    setSaving(false);
    onDone?.();
  }

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <label>
        Category name *
        <input
          name="name"
          required
          maxLength={80}
          placeholder="e.g. Catering, Venue, Gifts"
          defaultValue={category?.name || ''}
          autoFocus
        />
        {errors.name && <span className="field-hint" style={{ color: '#b45309' }}>{errors.name}</span>}
      </label>

      <label>
        Category budget (₹)
        <input
          name="budget_amount"
          type="number"
          min="0"
          step="1"
          placeholder="Optional"
          defaultValue={category?.budget_amount || ''}
        />
        {errors.budget_amount && <span className="field-hint" style={{ color: '#b45309' }}>{errors.budget_amount}</span>}
      </label>

      <label>
        Icon style
        <select name="icon" defaultValue={category?.icon || 'folder'}>
          <option value="folder">Folder</option>
          <option value="gem">Jewellery</option>
          <option value="shirt">Clothing</option>
          <option value="utensils">Catering</option>
          <option value="camera">Photography</option>
          <option value="car">Travel</option>
          <option value="gift">Gifts</option>
          <option value="music">Music / Band</option>
          <option value="home">Venue</option>
          <option value="flower">Decoration</option>
        </select>
      </label>

      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={onDone}>
          Cancel
        </button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : category ? 'Save changes' : 'Create category'}
        </button>
      </div>
    </form>
  );
}
