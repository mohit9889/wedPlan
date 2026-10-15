'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Layers3, ReceiptText, Settings, Plus,
  ChevronRight, Heart, CreditCard, Sparkles, Download,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const NAV_ITEMS = [
  { label: 'Overview', path: '/', icon: LayoutDashboard, mobileLabel: 'Home' },
  { label: 'Categories', path: '/categories', icon: Layers3 },
  { label: 'Expenses', path: '/expenses', icon: ReceiptText },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    workspaceName, cloudStatus, userEmail, totals, message,
  } = useWorkspace();

  const navigate = (path) => router.push(path);
  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <main className="app-shell">
      {/* ─── Desktop Sidebar ─────────────────────────────── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Heart size={21} fill="currentColor" /></div>
          <div><strong>WedPlan</strong><span>Wedding budget</span></div>
        </div>

        <div className="workspace-chip">
          <div className="avatar">W</div>
          <div><b>{workspaceName}</b><span>Shared workspace</span></div>
          <ChevronRight size={16} />
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              className={`nav-link ${isActive(path) ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === 'Payments' && totals.totalOutstanding > 0 && (
                <i className="nav-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sync-state">
            <span className={`status-dot ${cloudStatus === 'connected' ? 'online' : ''}`} />
            <div>
              <b>
                {cloudStatus === 'connected' ? 'Cloud synced'
                  : cloudStatus === 'signed-out' ? 'Sign in to sync'
                  : 'Demo mode'}
              </b>
              <span>{cloudStatus === 'connected' ? userEmail : 'Local preview data'}</span>
            </div>
          </div>
          <div className="sidebar-note">
            <Sparkles size={17} />
            <span>One less thing to worry about.</span>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Area ───────────────────────────── */}
      <section className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark"><Heart size={18} fill="currentColor" /></div>
            <strong>WedPlan</strong>
          </div>
          <div className="breadcrumb">
            Wedding planner <ChevronRight size={14} />
            <b>{NAV_ITEMS.find((i) => isActive(i.path))?.label || 'Overview'}</b>
          </div>
          <div className="top-actions">
            <span className={`cloud-pill ${cloudStatus === 'connected' ? 'is-online' : ''}`}>
              <span className="status-dot" />
              {cloudStatus === 'connected' ? 'Synced' : 'Preview mode'}
            </span>
            <button
              className="icon-button"
              aria-label="Export expenses"
              onClick={() => navigate('/settings')}
            >
              <Download size={18} />
            </button>
            <div className="profile-avatar">
              {userEmail ? userEmail[0].toUpperCase() : 'W'}
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </section>

      {/* ─── Mobile Bottom Navigation ────────────────────── */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ label, path, icon: Icon, mobileLabel }) => (
          <button
            key={path}
            className={isActive(path) ? 'active' : ''}
            onClick={() => navigate(path)}
          >
            <Icon size={20} />
            <span>{mobileLabel || label}</span>
          </button>
        ))}
      </nav>

      {/* ─── Mobile FAB ──────────────────────────────────── */}
      <button
        className="mobile-fab"
        aria-label="Add expense"
        onClick={() => navigate('/expenses?action=new')}
      >
        <Plus size={24} />
      </button>

      {/* ─── Toast ───────────────────────────────────────── */}
      {message && <div className="toast" role="status">{message}</div>}
    </main>
  );
}
