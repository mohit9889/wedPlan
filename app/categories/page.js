'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Pencil, Archive, CheckCircle2, ChevronRight, Layers3,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import CategoryForm from '../../components/forms/CategoryForm';

export default function CategoriesPage() {
  const router = useRouter();
  const {
    categories, categoriesWithStats, showArchived, setShowArchived,
    archiveCategory, restoreCategory, formatINR,
  } = useWorkspace();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'category' | null
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);

  const filtered = categories.filter((cat) => {
    const matchesSearch = cat.name.toLowerCase().includes(search.toLowerCase());
    const matchesArchived = showArchived || !cat.is_archived;
    return matchesSearch && matchesArchived;
  });

  function openEdit(cat) {
    setEditingCategory(cat);
    setModal('category');
  }

  function openNew() {
    setEditingCategory(null);
    setModal('category');
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">KEEP EVERYTHING IN ITS PLACE</div>
          <h1>Your categories</h1>
          <p>Create categories for every part of your celebration.</p>
        </div>
        <button className="primary-button" onClick={openNew}>
          <Plus size={18} /> Add category
        </button>
      </div>

      <div className="toolbar">
        <label className="search-field" htmlFor="category-search">
          <Search size={17} />
          <input
            id="category-search"
            name="category_search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories"
            aria-label="Search categories"
          />
        </label>
        <label className="toggle-label" htmlFor="show-archived-categories">
          <input
            id="show-archived-categories"
            name="show_archived"
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      <div className="category-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            <Layers3 size={25} />
            <b>No categories found</b>
            <span>
              {search
                ? 'Try a different search term.'
                : 'Create your first category to start organizing expenses.'}
            </span>
            {!search && (
              <button className="primary-button" onClick={openNew}>
                <Plus size={17} /> Add category
              </button>
            )}
          </div>
        )}

        {filtered.map((cat, i) => {
          const stats = categoriesWithStats.find((c) => c.id === cat.id) || {
            totalWorking: 0, totalOutstanding: 0, totalPaid: 0, expenseCount: 0,
          };
          const archived = cat.is_archived;

          return (
            <article
              className={`category-detail-card ${archived ? 'archived' : ''}`}
              key={cat.id}
            >
              <div className={`category-icon tint-${i % 4}`}>
                <Layers3 size={20} />
              </div>
              <div className="category-detail-main">
                <div className="category-title-row">
                  <h3>{cat.name}</h3>
                  {archived && <span className="small-badge">Archived</span>}
                </div>
                <p>
                  {stats.expenseCount} items · {formatINR(stats.totalPaid)} paid · {formatINR(stats.totalOutstanding)} outstanding
                </p>
                <div className="category-detail-progress">
                  <div style={{
                    width: `${Math.min(100,
                      Number(cat.budget_amount) > 0
                        ? (stats.totalWorking / Number(cat.budget_amount)) * 100
                        : 0
                    )}%`
                  }} />
                </div>
                <small>
                  {formatINR(stats.totalWorking)} spent of {formatINR(cat.budget_amount || 0)} category budget
                </small>
              </div>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label="Edit category"
                  onClick={() => openEdit(cat)}
                >
                  <Pencil size={16} />
                </button>
                {archived ? (
                  <button
                    className="icon-button"
                    aria-label="Restore category"
                    onClick={() => restoreCategory(cat.id)}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                ) : (
                  <button
                    className="icon-button"
                    aria-label="Archive category"
                    onClick={() => setConfirmArchive(cat)}
                  >
                    <Archive size={16} />
                  </button>
                )}
                <button
                  className="secondary-button small"
                  onClick={() => router.push(`/expenses?category=${cat.id}`)}
                >
                  View items <ChevronRight size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* ─── Category Modal ──────────────────────────────── */}
      <Modal
        open={modal === 'category'}
        onClose={() => { setModal(null); setEditingCategory(null); }}
        title={editingCategory ? 'Edit category' : 'New category'}
        eyebrow="MAKE SPACE FOR MORE"
      >
        <CategoryForm
          category={editingCategory}
          onDone={() => { setModal(null); setEditingCategory(null); }}
        />
      </Modal>

      {/* ─── Confirm Archive ─────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(confirmArchive)}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => archiveCategory(confirmArchive.id)}
        title={`Archive "${confirmArchive?.name}"?`}
        message="This category will be hidden from active views and budget calculations. Its expenses will be preserved but excluded from totals. You can restore it anytime."
        confirmLabel="Archive category"
        destructive
      />
    </>
  );
}
