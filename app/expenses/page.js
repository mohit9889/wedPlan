'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus, Search, Pencil, Archive, CheckCircle2, ReceiptText, ArrowRightLeft, Trash2,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// Wrapper for Suspense boundary (Next.js requires this for useSearchParams in SSG)
export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="page-content"><p>Loading expenses…</p></div>}>
      <ExpensesContent />
    </Suspense>
  );
}

import ExpenseForm from '../../components/forms/ExpenseForm';
import PaymentForm from '../../components/forms/PaymentForm';
import CategoryForm from '../../components/forms/CategoryForm';

function ExpensesContent() {
  const searchParams = useSearchParams();
  const {
    expenses, categories, activeCategories, payments, showArchived, setShowArchived,
    archiveExpense, restoreExpense, moveExpense, deleteExpense,
    formatINR, getWorkingAmount, getPaidAmount,
  } = useWorkspace();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [paymentExpense, setPaymentExpense] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);

  // Handle URL params for deep links
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const actionParam = searchParams.get('action');
    const editParam = searchParams.get('edit');

    if (categoryParam) setSelectedCategory(categoryParam);
    if (actionParam === 'new') setModal('expense');
    if (editParam) {
      const exp = expenses.find((e) => e.id === editParam);
      if (exp) {
        setEditingExpense(exp);
        setModal('expense');
      }
    }
  }, [searchParams, expenses]);

  const visibleExpenses = expenses.filter((exp) => {
    const categoryOk = selectedCategory === 'all' || exp.category_id === selectedCategory;
    const searchOk = `${exp.name} ${exp.vendor || ''}`.toLowerCase().includes(search.toLowerCase());
    const archivedOk = showArchived || !exp.is_archived;
    const statusOk = statusFilter === 'all' || exp.status === statusFilter;
    return categoryOk && searchOk && archivedOk && statusOk;
  });

  function openNewExpense() {
    setEditingExpense(null);
    setModal('expense');
  }

  function openEditExpense(exp) {
    setEditingExpense(exp);
    setModal('expense');
  }

  function openPayment(exp) {
    setPaymentExpense(exp);
    setModal('payment');
  }

  function openMove(exp) {
    setMoveTarget(exp);
    setModal('move');
  }

  function handleMove(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newCatId = String(form.get('category_id'));
    if (newCatId && moveTarget) {
      moveExpense(moveTarget.id, newCatId);
    }
    setModal(null);
    setMoveTarget(null);
  }

  const STATUS_LABELS = {
    planned: 'Planned',
    booked: 'Booked',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    cancelled: 'Cancelled',
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVERY DETAIL, ACCOUNTED FOR</div>
          <h1>Expenses</h1>
          <p>Track estimated costs, final amounts, and what remains.</p>
        </div>
        <button className="primary-button" onClick={openNewExpense}>
          <Plus size={18} /> Add expense
        </button>
      </div>

      <div className="toolbar">
        <label className="search-field" htmlFor="expense-search">
          <Search size={17} />
          <input
            id="expense-search"
            name="expense_search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses or vendors"
            aria-label="Search expenses or vendors"
          />
        </label>
        <select
          id="category-filter"
          name="category_filter"
          aria-label="Filter by category"
          className="select-field"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {activeCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          id="status-filter"
          name="status_filter"
          aria-label="Filter by status"
          className="select-field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <label className="toggle-label" htmlFor="show-archived-expenses">
          <input
            id="show-archived-expenses"
            name="show_archived"
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Archived
        </label>
      </div>

      <div className="expense-list">
        {visibleExpenses.length === 0 && (
          <div className="empty-state">
            <ReceiptText size={25} />
            <b>No expenses found</b>
            <span>
              {search || selectedCategory !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Add your first expense to start tracking.'}
            </span>
            <button className="primary-button" onClick={openNewExpense}>
              <Plus size={17} /> Add expense
            </button>
          </div>
        )}

        {visibleExpenses.map((exp) => {
          const cat = categories.find((c) => c.id === exp.category_id);
          const cost = getWorkingAmount(exp);
          const paid = getPaidAmount(exp.id, payments);
          const costNum = cost || 0;
          const archived = exp.is_archived;
          const isFullyPaid = paid >= costNum && costNum > 0;
          const isOverpaid = paid > costNum && costNum > 0;

          return (
            <article
              className={`expense-row ${archived ? 'archived' : ''}`}
              key={exp.id}
            >
              <div className="expense-icon"><ReceiptText size={19} /></div>
              <div className="expense-main">
                <div className="expense-title">
                  <h3>{exp.name}</h3>
                  {archived && <span className="small-badge">Archived</span>}
                  {exp.status && exp.status !== 'planned' && (
                    <span className="small-badge">{STATUS_LABELS[exp.status] || exp.status}</span>
                  )}
                </div>
                <p>
                  {cat?.name || 'Uncategorized'}
                  {exp.vendor ? ` · ${exp.vendor}` : ''}
                </p>
                <span className="expense-subline">
                  {cost === null ? 'Amount unknown' : exp.final_amount !== null && exp.final_amount !== undefined ? 'Final cost set' : 'Estimate only'}
                  {exp.due_date ? ` · Due ${exp.due_date}` : ''}
                </span>
              </div>
              <div className="expense-cost">
                <b>{cost !== null ? formatINR(cost) : '—'}</b>
                <span className={isFullyPaid ? 'paid-text' : ''}>
                  {cost === null
                    ? 'Unknown'
                    : isOverpaid
                      ? `Overpaid by ${formatINR(paid - costNum)}`
                      : isFullyPaid
                        ? 'Fully paid'
                        : `${formatINR(Math.max(0, costNum - paid))} outstanding`
                  }
                </span>
              </div>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label="Edit expense and payment"
                  title="Edit expense and payment details"
                  onClick={() => openEditExpense(exp)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Move to another category"
                  onClick={() => openMove(exp)}
                  title="Move to another category"
                >
                  <ArrowRightLeft size={16} />
                </button>
                {archived ? (
                  <button
                    className="icon-button"
                    aria-label="Restore expense"
                    title="Restore expense"
                    onClick={() => restoreExpense(exp.id)}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                ) : (
                  <button
                    className="icon-button"
                    aria-label="Archive expense"
                    title="Archive expense"
                    onClick={() => setConfirmArchive(exp)}
                  >
                    <Archive size={16} />
                  </button>
                )}
                <button
                  className="icon-button danger"
                  aria-label="Delete expense"
                  title="Permanently delete expense"
                  onClick={() => setConfirmDelete(exp)}
                >
                  <Trash2 size={16} />
                </button>
                {!archived && (
                  <button
                    className="secondary-button small"
                    onClick={() => openEditExpense(exp)}
                    title="Update status or record payment"
                  >
                    Edit / Pay
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* ─── Expense Modal ───────────────────────────────── */}
      <Modal
        open={modal === 'expense'}
        onClose={() => { setModal(null); setEditingExpense(null); }}
        title={editingExpense ? 'Edit expense' : 'Add an expense'}
        eyebrow="EXPENSE DETAILS"
      >
        <ExpenseForm
          expense={editingExpense}
          defaultCategoryId={selectedCategory !== 'all' ? selectedCategory : undefined}
          onDone={() => { setModal(null); setEditingExpense(null); }}
          onSwitchToCategory={() => setModal('category')}
        />
      </Modal>

      {/* ─── Category Modal (for inline create) ──────────── */}
      <Modal
        open={modal === 'category'}
        onClose={() => setModal('expense')}
        title="New category"
        eyebrow="MAKE SPACE FOR MORE"
      >
        <CategoryForm
          category={null}
          onDone={() => setModal('expense')}
        />
      </Modal>

      {/* ─── Payment Modal ───────────────────────────────── */}
      <Modal
        open={modal === 'payment'}
        onClose={() => { setModal(null); setPaymentExpense(null); }}
        title="Record a payment"
        eyebrow="PAYMENT RECORD"
      >
        <PaymentForm
          expense={paymentExpense}
          onDone={() => { setModal(null); setPaymentExpense(null); }}
        />
      </Modal>

      {/* ─── Move Expense Modal ──────────────────────────── */}
      <Modal
        open={modal === 'move'}
        onClose={() => { setModal(null); setMoveTarget(null); }}
        title={`Move "${moveTarget?.name}"`}
        eyebrow="REORGANIZE"
      >
        <form className="modal-form" onSubmit={handleMove}>
          <p className="field-hint">
            Currently in: {categories.find((c) => c.id === moveTarget?.category_id)?.name || 'Unknown'}
          </p>
          <label>
            Move to category *
            <select name="category_id" required defaultValue="">
              <option value="" disabled>Select a category</option>
              {activeCategories
                .filter((c) => c.id !== moveTarget?.category_id)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))
              }
            </select>
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => { setModal(null); setMoveTarget(null); }}>Cancel</button>
            <button className="primary-button" type="submit">Move expense</button>
          </div>
        </form>
      </Modal>

      {/* ─── Confirm Archive ─────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(confirmArchive)}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => archiveExpense(confirmArchive.id)}
        title={`Archive "${confirmArchive?.name}"?`}
        message="This expense will be hidden from active views and excluded from budget totals. Payment records are preserved. You can restore it anytime."
        confirmLabel="Archive expense"
        destructive
      />

      {/* ─── Confirm Delete ──────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteExpense(confirmDelete.id)}
        title={`Delete "${confirmDelete?.name}"?`}
        message="Are you sure you want to permanently delete this expense? All associated payments for this item will also be permanently deleted. This cannot be undone."
        confirmLabel="Delete permanently"
        destructive
      />
    </>
  );
}
