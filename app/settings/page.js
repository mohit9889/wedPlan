'use client';

import { useState } from 'react';
import {
  Heart, Download, ChevronRight, Layers3, Users, Copy, UserPlus, Check,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../../components/ui/Modal';
import { downloadCsv, buildExpenseExportRows, buildPaymentExportRows } from '../../lib/exports';
import { getWorkingAmount, getPaidAmount } from '../../lib/calculations';

export default function SettingsPage() {
  const {
    workspaceName, budget, eventDate, cloudStatus, userEmail, supabaseReady,
    updateWorkspaceSettings, signIn, signUp, signOut,
    expenses, categories, payments, formatINR, notify,
    inviteCode, members, needsWorkspace,
    createWorkspaceCloud, joinWorkspaceCloud,
  } = useWorkspace();

  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  async function handleWorkspaceSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await updateWorkspaceSettings({
      name: String(form.get('workspace') || 'Our Wedding'),
      overall_budget: Number(form.get('budget') || 0),
      event_date: String(form.get('event_date') || '') || null,
    });
    setSaving(false);
  }

  async function handleSignIn(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    await signIn(email, password);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    await signUp(email, password);
    setModal(null);
  }

  async function handleCreateWorkspace(e) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') || 'Our Wedding').trim();
    const budgetVal = Number(form.get('budget') || 0);
    const result = await createWorkspaceCloud(name, budgetVal);
    setSaving(false);
    if (!result.error) {
      setModal(null);
    }
  }

  async function handleJoinWorkspace(e) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const code = String(form.get('invite_code') || '').trim();
    const result = await joinWorkspaceCloud(code);
    setSaving(false);
    if (!result.error) {
      setModal(null);
    }
  }

  function copyInviteCode() {
    if (!inviteCode) return;
    navigator.clipboard?.writeText(inviteCode);
    setCopiedCode(true);
    notify('Invite code copied to clipboard.');
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function exportExpenses() {
    const rows = buildExpenseExportRows(expenses, categories, payments, getWorkingAmount, getPaidAmount);
    downloadCsv('wedding-expenses.csv', rows);
  }

  function exportPaymentsCSV() {
    const rows = buildPaymentExportRows(payments, expenses, categories);
    downloadCsv('wedding-payments.csv', rows);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE IT WORK FOR YOU</div>
          <h1>Settings</h1>
          <p>Manage your wedding workspace, partners, and data.</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* ─── Workspace Creation / Join (shown when signed in but no workspace) */}
        {needsWorkspace && (
          <section className="panel settings-panel" style={{ borderLeft: '4px solid #0f766e' }}>
            <div className="settings-icon"><Heart size={20} /></div>
            <h2>Get started</h2>
            <p>Create a new wedding workspace or join your partner&apos;s.</p>
            <button
              className="primary-button full"
              onClick={() => setModal('create-workspace')}
              style={{ marginBottom: 10 }}
            >
              <Heart size={17} /> Create a new workspace
            </button>
            <button
              className="secondary-button full"
              onClick={() => setModal('join-workspace')}
            >
              <UserPlus size={17} /> Join your partner&apos;s workspace
            </button>
          </section>
        )}

        {/* ─── Workspace Settings ────────────────────────── */}
        <section className="panel settings-panel">
          <div className="settings-icon"><Heart size={20} /></div>
          <h2>Wedding workspace</h2>
          <p>Choose a name, date, and set your overall budget.</p>
          <form onSubmit={handleWorkspaceSubmit}>
            <label>
              Workspace name
              <input
                name="workspace"
                defaultValue={workspaceName}
                maxLength={80}
              />
            </label>
            <label>
              Event date
              <input
                name="event_date"
                type="date"
                defaultValue={eventDate || ''}
              />
            </label>
            <label>
              Overall budget (₹)
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
              />
            </label>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        </section>

        {/* ─── Partner & Invite Code ─────────────────────── */}
        <section className="panel settings-panel">
          <div className="settings-icon"><Users size={20} /></div>
          <h2>Shared access</h2>
          <p>Share your workspace with your partner so you can both track expenses.</p>

          {inviteCode && (
            <div className="invite-code-box">
              <span className="invite-label">Invite code</span>
              <div className="invite-code-row">
                <code className="invite-code">{inviteCode}</code>
                <button
                  className="icon-button"
                  onClick={copyInviteCode}
                  aria-label="Copy invite code"
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <small>
                Share this code with your partner. They can enter it in Settings → &quot;Join workspace&quot;
                after creating their account.
              </small>
            </div>
          )}

          {members.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#59736c', marginBottom: 8 }}>
                Workspace members ({members.length}/2)
              </h3>
              {members.map((m, i) => (
                <div key={m.user_id} className="member-row">
                  <div className="profile-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                    {String(m.user_id).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <b style={{ fontSize: 12 }}>{m.role === 'owner' ? 'Owner' : 'Partner'}</b>
                    <span style={{ fontSize: 11, color: '#8a9b97', display: 'block' }}>
                      Joined {new Date(m.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cloudStatus !== 'connected' && !inviteCode && (
            <p className="field-hint">
              Sign in and create a workspace to get an invite code for your partner.
            </p>
          )}
        </section>

        {/* ─── Data Export ───────────────────────────────── */}
        <section className="panel settings-panel">
          <div className="settings-icon"><Download size={20} /></div>
          <h2>Your data</h2>
          <p>Export copies for your records or spreadsheets.</p>
          <button className="secondary-button full" onClick={exportExpenses}>
            <Download size={17} /> Export expenses CSV
          </button>
          <button className="secondary-button full" onClick={exportPaymentsCSV}>
            <Download size={17} /> Export payments CSV
          </button>

          <div className="settings-divider" />

          {/* ─── Cloud Sync ───────────────────────────────── */}
          <div className="cloud-setting">
            <div>
              <b>Cloud sync</b>
              <span>
                {cloudStatus === 'connected'
                  ? `Signed in as ${userEmail}`
                  : cloudStatus === 'signed-in-no-workspace'
                    ? `Signed in as ${userEmail} — no workspace yet`
                    : supabaseReady
                      ? 'Sign in to sync across devices'
                      : 'Supabase setup required — see .env.local'}
              </span>
            </div>
            <span className={`status-dot ${cloudStatus === 'connected' ? 'online' : ''}`} />
          </div>

          {supabaseReady && cloudStatus !== 'connected' && cloudStatus !== 'signed-in-no-workspace' && (
            <form onSubmit={handleSignIn} className="auth-form">
              <label>
                Email
                <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
              </label>
              <label>
                Password
                <input name="password" type="password" autoComplete="current-password" minLength={6} placeholder="At least 6 characters" required />
              </label>
              <button className="primary-button full" type="submit">Sign in</button>
              <button className="text-button" type="button" onClick={() => setModal('signup')}>
                Create an account
              </button>
            </form>
          )}

          {(cloudStatus === 'connected' || cloudStatus === 'signed-in-no-workspace') && (
            <button className="secondary-button full" onClick={signOut}>
              Sign out
            </button>
          )}
        </section>

        {/* ─── Category Management ───────────────────────── */}
        <section className="panel settings-panel">
          <div className="settings-icon"><Layers3 size={20} /></div>
          <h2>Manage categories</h2>
          <p>Categories are flexible. Add, rename, or archive them anytime.</p>
          <button
            className="secondary-button full"
            onClick={() => window.location.href = '/categories'}
          >
            Open categories <ChevronRight size={16} />
          </button>
        </section>

        {/* ─── PWA Info ──────────────────────────────────── */}
        <section className="panel settings-panel">
          <div className="settings-icon"><Heart size={20} /></div>
          <h2>Install WedPlan</h2>
          <p>
            WedPlan is a Progressive Web App. On supported devices, you can install it
            to your home screen for a native-like experience.
          </p>
          <p style={{ marginTop: 8 }}>
            <b>Android Chrome:</b> Tap the menu (⋮) → &quot;Add to Home screen&quot;<br />
            <b>iOS Safari:</b> Tap Share → &quot;Add to Home Screen&quot;
          </p>
          <p style={{ marginTop: 8 }}>
            <b>Note:</b> This MVP requires an internet connection for data operations.
            Offline editing is not yet supported.
          </p>
        </section>
      </div>

      {/* ─── Sign Up Modal ───────────────────────────────── */}
      <Modal
        open={modal === 'signup'}
        onClose={() => setModal(null)}
        title="Create an account"
        eyebrow="CREATE YOUR ACCOUNT"
      >
        <form className="modal-form" onSubmit={handleSignUp}>
          <p className="field-hint">
            Create an account to start setting up shared cloud access.
            Supabase email confirmation settings may apply.
          </p>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" minLength={6} required placeholder="At least 6 characters" />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button>
            <button className="primary-button" type="submit">Create account</button>
          </div>
        </form>
      </Modal>

      {/* ─── Create Workspace Modal ──────────────────────── */}
      <Modal
        open={modal === 'create-workspace'}
        onClose={() => setModal(null)}
        title="Create your workspace"
        eyebrow="START PLANNING"
      >
        <form className="modal-form" onSubmit={handleCreateWorkspace}>
          <p className="field-hint">
            Name your wedding workspace and set an initial budget.
            You&apos;ll get an invite code to share with your partner.
          </p>
          <label>
            Workspace name
            <input name="name" defaultValue="Our Wedding" maxLength={80} required autoFocus />
          </label>
          <label>
            Overall budget (₹)
            <input
              name="budget"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue="2000000"
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
              }}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Join Workspace Modal ────────────────────────── */}
      <Modal
        open={modal === 'join-workspace'}
        onClose={() => setModal(null)}
        title="Join your partner"
        eyebrow="ENTER INVITE CODE"
      >
        <form className="modal-form" onSubmit={handleJoinWorkspace}>
          <p className="field-hint">
            Ask your partner for the 8-character invite code from their Settings page.
          </p>
          <label>
            Invite code
            <input
              name="invite_code"
              required
              maxLength={8}
              placeholder="e.g. A1B2C3D4"
              autoFocus
              style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Joining…' : 'Join workspace'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
