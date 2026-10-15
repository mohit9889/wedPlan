'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, ChevronRight, Wallet, Clock3, CheckCircle2, Heart,
  ArrowUpRight, Sparkles, CircleDollarSign, ReceiptText, Layers3,
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import Modal from '../components/ui/Modal';
import ExpenseForm from '../components/forms/ExpenseForm';
import CategoryForm from '../components/forms/CategoryForm';

export default function DashboardPage() {
  const router = useRouter();
  const {
    budget, totals, budgetHealth, categoriesWithStats, activeCategories,
    expenses, payments, formatINR, getWorkingAmount, getPaidAmount,
  } = useWorkspace();

  const [modal, setModal] = useState(null); // 'expense' | 'category' | 'budget' | null
  const { updateWorkspaceSettings } = useWorkspace();

  const recentExpenses = expenses
    .filter((e) => !e.is_archived)
    .slice(-5)
    .reverse();

  const activeCatStats = categoriesWithStats.filter((c) => !c.is_archived);

  return (
    <>
      {/* ─── Heading ──────────────────────────────────────── */}
      <div className="page-heading">
        <div>
          <div className="eyebrow"><Sparkles size={14} /> YOUR WEDDING, ORGANIZED</div>
          <h1>Good things are coming.</h1>
          <p>Keep every expense and payment in one happy place.</p>
        </div>
        <button className="primary-button desktop-add" onClick={() => setModal('expense')}>
          <Plus size={18} /> Add expense
        </button>
      </div>

      {/* ─── Hero Budget Card ─────────────────────────────── */}
      <section className="hero-card">
        <div className="hero-top">
          <div>
            <span className="hero-label">TOTAL WEDDING BUDGET</span>
            <div className="hero-total">{formatINR(budget)}</div>
          </div>
          <div className="hero-icon"><Heart size={22} /></div>
        </div>
        <div className="hero-progress">
          <div style={{ width: `${Math.min(100, budgetHealth.budgetUsedPercent)}%` }} />
        </div>
        <div className="hero-bottom">
          <span>
            <b>{Math.round(budgetHealth.budgetUsedPercent)}%</b> of budget committed
          </span>
          <button onClick={() => setModal('budget')}>
            Edit budget <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="hero-stats">
          <div>
            <span className="stat-icon pale"><Wallet size={17} /></span>
            <span className="stat-label">Committed</span>
            <b>{formatINR(totals.totalWorking)}</b>
          </div>
          <div>
            <span className="stat-icon pale"><CheckCircle2 size={17} /></span>
            <span className="stat-label">Paid so far</span>
            <b>{formatINR(totals.totalPaid)}</b>
          </div>
          <div>
            <span className="stat-icon pale"><Clock3 size={17} /></span>
            <span className="stat-label">Still to pay</span>
            <b>{formatINR(totals.totalOutstanding)}</b>
          </div>
        </div>
      </section>

      {/* ─── Category Grid ────────────────────────────────── */}
      <div className="section-heading">
        <div>
          <h2>Budget at a glance</h2>
          <p>A little clarity goes a long way.</p>
        </div>
        <button className="text-button" onClick={() => router.push('/categories')}>
          All categories <ChevronRight size={16} />
        </button>
      </div>
      <div className="category-grid">
        {activeCatStats.slice(0, 4).map((cat, i) => (
          <button
            className="category-card"
            key={cat.id}
            onClick={() => router.push(`/expenses?category=${cat.id}`)}
          >
            <div className={`category-icon tint-${i % 4}`}><Layers3 size={19} /></div>
            <span className="category-arrow"><ArrowUpRight size={16} /></span>
            <h3>{cat.name}</h3>
            <div className="category-amount">{formatINR(cat.totalWorking)}</div>
            <p>
              {cat.expenseCount} {cat.expenseCount === 1 ? 'item' : 'items'} · {formatINR(cat.totalOutstanding)} due
            </p>
            <div className="mini-progress">
              <div style={{
                width: `${Math.min(100, Number(cat.budget_amount) > 0
                  ? (cat.totalWorking / Number(cat.budget_amount)) * 100 : 0)}%`
              }} />
            </div>
          </button>
        ))}
        <button className="add-category-card" onClick={() => setModal('category')}>
          <span><Plus size={20} /></span>
          <b>Create a category</b>
          <small>Make room for something new</small>
        </button>
      </div>

      {/* ─── Lower Grid ───────────────────────────────────── */}
      <div className="lower-grid">
        {/* Recent Expenses */}
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent expenses</h2>
              <p>Your latest wedding costs</p>
            </div>
            <button className="text-button" onClick={() => router.push('/expenses')}>
              See all <ChevronRight size={15} />
            </button>
          </div>
          <div className="recent-list">
            {recentExpenses.length === 0 && (
              <div className="empty-state" style={{ minHeight: 120 }}>
                <ReceiptText size={22} />
                <span>No expenses yet. Add your first one!</span>
              </div>
            )}
            {recentExpenses.map((exp) => {
              const cat = activeCategories.find((c) => c.id === exp.category_id);
              const cost = getWorkingAmount(exp) || 0;
              const paid = getPaidAmount(exp.id, payments);
              const isFullyPaid = paid >= cost && cost > 0;
              return (
                <button
                  className="recent-row"
                  key={exp.id}
                  onClick={() => router.push(`/expenses?edit=${exp.id}`)}
                >
                  <div className="recent-symbol"><ReceiptText size={17} /></div>
                  <div className="recent-info">
                    <b>{exp.name}</b>
                    <span>{cat?.name || 'Uncategorized'}</span>
                  </div>
                  <div className="recent-money">
                    <b>{formatINR(cost)}</b>
                    <span className={isFullyPaid ? 'paid-text' : ''}>
                      {isFullyPaid ? 'Paid' : `${formatINR(Math.max(0, cost - paid))} due`}
                    </span>
                  </div>
                  <ChevronRight size={16} className="muted-chevron" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Budget Health */}
        <section className="panel budget-panel">
          <div className="panel-heading">
            <div>
              <h2>Budget health</h2>
              <p>How your plan is shaping up</p>
            </div>
            <CircleDollarSign size={21} className="teal-icon" />
          </div>
          <div className="health-number">{formatINR(budgetHealth.budgetRemaining)}</div>
          <span className="health-caption">
            {budgetHealth.isOverBudget
              ? 'over your overall budget'
              : 'left in your overall budget'}
          </span>
          <div className="health-track">
            <div style={{ width: `${Math.min(100, budgetHealth.budgetUsedPercent)}%` }} />
          </div>
          <div className="health-legend">
            <span><i className="legend-teal" /> Committed</span>
            <span><i className="legend-gray" /> Remaining</span>
          </div>
          <div className="tip-box">
            <Sparkles size={16} />
            <span>
              {budgetHealth.isOverBudget
                ? 'Your planned costs exceed your budget. Review categories to rebalance.'
                : "You're making progress. Keep adding costs as you confirm them."}
            </span>
          </div>
        </section>
      </div>

      {/* ─── Modals ───────────────────────────────────────── */}
      <Modal
        open={modal === 'expense'}
        onClose={() => setModal(null)}
        title="Add an expense"
        eyebrow="EXPENSE DETAILS"
      >
        <ExpenseForm
          expense={null}
          onDone={() => setModal(null)}
          onSwitchToCategory={() => setModal('category')}
        />
      </Modal>

      <Modal
        open={modal === 'category'}
        onClose={() => setModal(null)}
        title="New category"
        eyebrow="MAKE SPACE FOR MORE"
      >
        <CategoryForm category={null} onDone={() => setModal(null)} />
      </Modal>

      <Modal
        open={modal === 'budget'}
        onClose={() => setModal(null)}
        title="Update wedding budget"
        eyebrow="PLAN WITH CONFIDENCE"
      >
        <form className="modal-form" onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          updateWorkspaceSettings({ overall_budget: Number(form.get('budget') || 0) });
          setModal(null);
        }}>
          <label>
            Overall wedding budget (₹)
            <input
              name="budget"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={budget ? String(budget) : ''}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
              }}
              required
              autoFocus
            />
          </label>
          <p className="field-hint">
            Current committed expenses: {formatINR(totals.totalWorking)}.
            This changes the overall planning target, not individual costs.
          </p>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button>
            <button className="primary-button" type="submit">Save budget</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
