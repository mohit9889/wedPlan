'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { createSeedCategories, createSeedExpenses, createSeedPayments } from '../lib/seed-data';
import {
  getWorkingAmount, getPaidAmount, getOutstandingAmount, getOverpaidAmount,
  getPaymentStatus, calculateTotals, calculateCategoryTotals, calculateBudgetHealth,
} from '../lib/calculations';
import { formatINR } from '../lib/currency';

const WorkspaceContext = createContext(null);

const uid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function WorkspaceProvider({ children }) {
  // ─── Core state ──────────────────────────────────────
  const [categories, setCategories] = useState(() => createSeedCategories());
  const [expenses, setExpenses] = useState(() => createSeedExpenses());
  const [payments, setPayments] = useState(() => createSeedPayments());
  const [budget, setBudget] = useState(2000000);
  const [workspaceName, setWorkspaceName] = useState('Our Wedding');
  const [eventDate, setEventDate] = useState(null);

  // ─── UI state ─────────────────────────────────────────
  const [message, setMessage] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [members, setMembers] = useState([]);
  const [needsWorkspace, setNeedsWorkspace] = useState(false);

  // ─── Cloud state ──────────────────────────────────────
  const [cloudStatus, setCloudStatus] = useState('demo'); // demo | signed-out | connecting | connected
  const [userEmail, setUserEmail] = useState('');
  const [workspaceId, setWorkspaceId] = useState(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseReady = Boolean(supabaseUrl && supabaseKey);
  const supabase = useMemo(
    () => (supabaseReady ? createClient() : null),
    [supabaseReady]
  );

  // ─── Toast helper ────────────────────────────────────
  const notify = useCallback((text) => {
    setMessage(text);
    const timer = setTimeout(() => setMessage(''), 2800);
    return () => clearTimeout(timer);
  }, []);

  // ─── Cloud sync ──────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    async function loadCloud() {
      setCloudStatus('connecting');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;

        if (!user) {
          setCloudStatus('signed-out');
          return;
        }

        setUserEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.workspace_id) {
          if (mounted) {
            setCloudStatus('signed-in-no-workspace');
            setNeedsWorkspace(true);
          }
          return;
        }

        setWorkspaceId(profile.workspace_id);

        const [wsRes, catRes, expRes, payRes, membersRes] = await Promise.all([
          supabase.from('workspaces').select('*').eq('id', profile.workspace_id).maybeSingle(),
          supabase.from('categories').select('*').eq('workspace_id', profile.workspace_id).order('created_at'),
          supabase.from('expenses').select('*').eq('workspace_id', profile.workspace_id).order('created_at'),
          supabase.from('payments').select('*').eq('workspace_id', profile.workspace_id).order('paid_at'),
          supabase.from('workspace_members').select('user_id, role, created_at').eq('workspace_id', profile.workspace_id),
        ]);

        if (!mounted) return;

        if (wsRes.data) {
          setWorkspaceName(wsRes.data.name || 'Our Wedding');
          setBudget(Number(wsRes.data.total_budget || 0));
          setInviteCode(wsRes.data.invite_code || null);
        }
        if (catRes.data) {
          setCategories(catRes.data.map((c) => ({
            ...c,
            budget_amount: Number(c.budget || 0),
            is_archived: Boolean(c.is_archived || c.archived_at),
          })));
        }
        if (expRes.data) {
          setExpenses(expRes.data.map((e) => ({
            ...e,
            estimated_amount: Number(e.estimated_cost || 0),
            final_amount: e.final_cost === null || e.final_cost === undefined ? null : Number(e.final_cost),
            status: e.status || 'planned',
            is_archived: Boolean(e.is_archived || e.archived_at),
          })));
        }
        if (payRes.data) {
          setPayments(payRes.data.map((p) => ({
            ...p,
            amount: Number(p.amount),
            paid_at: p.paid_at || p.payment_date,
            payment_method: p.payment_method || p.method || null,
            reference: p.reference || null,
          })));
        }
        if (membersRes.data) {
          setMembers(membersRes.data);
        }

        if (mounted) {
          setCloudStatus('connected');
          setNeedsWorkspace(false);
        }
      } catch (err) {
        console.error('Cloud load error:', err);
        if (mounted) {
          setCloudStatus('demo');
          notify('Cloud sync failed. Using local data.');
        }
      }
    }

    loadCloud();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => loadCloud());
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, notify]);

  // ─── Persist helpers ─────────────────────────────────
  async function persistCategory(cat) {
    if (!supabase || cloudStatus !== 'connected' || !workspaceId) return;
    const payload = {
      id: cat.id,
      workspace_id: workspaceId,
      name: cat.name,
      icon: cat.icon || 'folder',
      budget: Number(cat.budget_amount || 0),
      is_archived: Boolean(cat.is_archived),
      archived_at: cat.is_archived ? (cat.archived_at || new Date().toISOString()) : null,
    };
    const { error } = await supabase.from('categories').upsert(payload);
    if (error) notify(`Cloud save failed: ${error.message}`);
  }

  async function persistExpense(exp) {
    if (!supabase || cloudStatus !== 'connected' || !workspaceId) return;
    const payload = {
      id: exp.id,
      workspace_id: workspaceId,
      category_id: exp.category_id,
      name: exp.name,
      vendor: exp.vendor || null,
      estimated_cost: Number(exp.estimated_amount || 0),
      final_cost: exp.final_amount === '' || exp.final_amount === undefined || exp.final_amount === null ? null : Number(exp.final_amount),
      due_date: exp.due_date || null,
      status: exp.status || 'planned',
      notes: exp.notes || null,
      is_archived: Boolean(exp.is_archived),
      archived_at: exp.is_archived ? (exp.archived_at || new Date().toISOString()) : null,
    };
    const { error } = await supabase.from('expenses').upsert(payload);
    if (error) notify(`Cloud save failed: ${error.message}`);
  }

  async function persistPayment(pay) {
    if (!supabase || cloudStatus !== 'connected' || !workspaceId) return;
    const payload = {
      id: pay.id,
      workspace_id: workspaceId,
      expense_id: pay.expense_id,
      amount: Number(pay.amount),
      paid_at: pay.paid_at || new Date().toISOString().slice(0, 10),
      payment_method: pay.payment_method || pay.method || null,
      reference: pay.reference || null,
      notes: pay.notes || null,
    };
    const { error } = await supabase.from('payments').upsert(payload);
    if (error) notify(`Cloud save failed: ${error.message}`);
  }

  // ─── Category CRUD ───────────────────────────────────
  const addCategory = useCallback((data) => {
    const cat = { id: uid(), sort_order: categories.length, is_archived: false, ...data };
    setCategories((prev) => [...prev, cat]);
    persistCategory(cat);
    notify('Category added.');
    return cat;
  }, [categories.length, cloudStatus, notify]);

  const updateCategory = useCallback((id, data) => {
    let updated;
    setCategories((prev) => prev.map((c) => {
      if (c.id === id) {
        updated = { ...c, ...data };
        return updated;
      }
      return c;
    }));
    if (updated) persistCategory(updated);
    notify('Category updated.');
  }, [cloudStatus, notify]);

  const archiveCategory = useCallback((id) => {
    let updated;
    setCategories((prev) => prev.map((c) => {
      if (c.id === id) {
        updated = { ...c, is_archived: true, archived_at: new Date().toISOString() };
        return updated;
      }
      return c;
    }));
    if (updated) persistCategory(updated);
    notify('Category archived. Its expenses are preserved but hidden from totals.');
  }, [cloudStatus, notify]);

  const restoreCategory = useCallback((id) => {
    let updated;
    setCategories((prev) => prev.map((c) => {
      if (c.id === id) {
        updated = { ...c, is_archived: false, archived_at: null };
        return updated;
      }
      return c;
    }));
    if (updated) persistCategory(updated);
    notify('Category restored.');
  }, [cloudStatus, notify]);

  // ─── Expense CRUD ────────────────────────────────────
  const addExpense = useCallback((data) => {
    const exp = { id: uid(), is_archived: false, status: 'planned', ...data };
    setExpenses((prev) => [...prev, exp]);
    persistExpense(exp);
    notify('Expense added.');
    return exp;
  }, [cloudStatus, notify]);

  const updateExpense = useCallback((id, data) => {
    let updated;
    setExpenses((prev) => prev.map((e) => {
      if (e.id === id) {
        updated = { ...e, ...data };
        return updated;
      }
      return e;
    }));
    if (updated) persistExpense(updated);
    notify('Expense updated.');
  }, [cloudStatus, notify]);

  const archiveExpense = useCallback((id) => {
    let updated;
    setExpenses((prev) => prev.map((e) => {
      if (e.id === id) {
        updated = { ...e, is_archived: true, archived_at: new Date().toISOString() };
        return updated;
      }
      return e;
    }));
    if (updated) persistExpense(updated);
    notify('Expense archived.');
  }, [cloudStatus, notify]);

  const restoreExpense = useCallback((id) => {
    let updated;
    setExpenses((prev) => prev.map((e) => {
      if (e.id === id) {
        updated = { ...e, is_archived: false, archived_at: null };
        return updated;
      }
      return e;
    }));
    if (updated) persistExpense(updated);
    notify('Expense restored.');
  }, [cloudStatus, notify]);

  const deleteExpense = useCallback(async (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setPayments((prev) => prev.filter((p) => p.expense_id !== id));

    if (supabase && cloudStatus === 'connected' && workspaceId) {
      await supabase.from('payments').delete().eq('expense_id', id);
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) {
        notify(`Delete failed: ${error.message}`);
        return;
      }
    }
    notify('Expense deleted.');
  }, [supabase, cloudStatus, workspaceId, notify]);

  const moveExpense = useCallback((expenseId, newCategoryId) => {
    // Validate the target category is in the same workspace (all local data is workspace-scoped)
    const targetCat = categories.find((c) => c.id === newCategoryId);
    if (!targetCat) {
      notify('Target category not found.');
      return;
    }
    updateExpense(expenseId, { category_id: newCategoryId });
    notify(`Expense moved to ${targetCat.name}.`);
  }, [categories, updateExpense, notify]);

  // ─── Payment CRUD ────────────────────────────────────
  const addPayment = useCallback((data) => {
    const pay = { id: uid(), ...data };
    setPayments((prev) => [...prev, pay]);
    persistPayment(pay);
    notify('Payment recorded.');
    return pay;
  }, [cloudStatus, notify]);

  const deletePayment = useCallback(async (id) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
    if (supabase && cloudStatus === 'connected' && workspaceId) {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) {
        notify(`Delete failed: ${error.message}`);
        return;
      }
    }
    notify('Payment deleted.');
  }, [supabase, cloudStatus, workspaceId, notify]);

  // ─── Workspace settings ──────────────────────────────
  const updateWorkspaceSettings = useCallback(async (data) => {
    if (data.name !== undefined) setWorkspaceName(data.name);
    if (data.overall_budget !== undefined) setBudget(Number(data.overall_budget));
    if (data.event_date !== undefined) setEventDate(data.event_date);

    if (supabase && cloudStatus === 'connected' && workspaceId) {
      const payload = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.overall_budget !== undefined) payload.total_budget = Number(data.overall_budget);
      const { error } = await supabase.from('workspaces').update(payload).eq('id', workspaceId);
      if (error) notify(`Cloud save failed: ${error.message}`);
      else notify('Workspace settings saved.');
    } else {
      notify('Workspace settings updated locally.');
    }
  }, [supabase, cloudStatus, workspaceId, notify]);

  // ─── Auth ────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    if (!supabase) {
      notify('Add Supabase credentials to .env.local first.');
      return { error: 'No Supabase client' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      notify(error.message);
      return { error: error.message };
    }
    notify('Signed in successfully.');
    return { error: null };
  }, [supabase, notify]);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) {
      notify('Add Supabase credentials to .env.local first.');
      return { error: 'No Supabase client' };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      notify(error.message);
      return { error: error.message };
    }
    if (data.user) {
      notify('Account created. Check your email if confirmation is enabled, then sign in.');
    }
    return { error: null };
  }, [supabase, notify]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUserEmail('');
    setCloudStatus('signed-out');
    setInviteCode(null);
    setMembers([]);
    setWorkspaceId(null);
    setNeedsWorkspace(false);
    // Reset to seed data
    setCategories(createSeedCategories());
    setExpenses(createSeedExpenses());
    setPayments(createSeedPayments());
    setBudget(2000000);
    setWorkspaceName('Our Wedding');
    notify('Signed out.');
  }, [supabase, notify]);

  // ─── Workspace Bootstrap ─────────────────────────────
  const createWorkspaceCloud = useCallback(async (name, budgetAmount) => {
    if (!supabase) return { error: 'No Supabase client' };
    const { data, error } = await supabase.rpc('bootstrap_workspace', {
      ws_name: name || 'Our Wedding',
      ws_budget: Number(budgetAmount) || 0,
    });
    if (error) {
      notify(error.message);
      return { error: error.message };
    }
    notify('Workspace created! Share the invite code with your partner.');
    // Reload cloud data
    setCloudStatus('connecting');
    return { error: null, data };
  }, [supabase, notify]);

  const joinWorkspaceCloud = useCallback(async (code) => {
    if (!supabase) return { error: 'No Supabase client' };
    const { data, error } = await supabase.rpc('join_workspace', { code });
    if (error) {
      notify(error.message);
      return { error: error.message };
    }
    notify('Successfully joined the workspace!');
    setCloudStatus('connecting');
    return { error: null, data };
  }, [supabase, notify]);

  const getInviteCodeCloud = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.rpc('get_invite_code');
    if (data) setInviteCode(data);
    return data;
  }, [supabase]);

  // ─── Derived values ──────────────────────────────────
  const activeCategories = useMemo(
    () => categories.filter((c) => !c.is_archived),
    [categories]
  );

  const activeExpenses = useMemo(
    () => expenses.filter((e) => !e.is_archived && e.status !== 'cancelled'),
    [expenses]
  );

  const totals = useMemo(
    () => calculateTotals(expenses, payments),
    [expenses, payments]
  );

  const budgetHealth = useMemo(
    () => calculateBudgetHealth(budget, totals.totalWorking, totals.totalPaid),
    [budget, totals]
  );

  const categoriesWithStats = useMemo(() => {
    return categories.map((cat) => {
      const stats = calculateCategoryTotals(cat.id, expenses, payments);
      return { ...cat, ...stats };
    });
  }, [categories, expenses, payments]);

  // ─── Context value ───────────────────────────────────
  const value = useMemo(() => ({
    // State
    categories, expenses, payments, budget, workspaceName, eventDate,
    message, showArchived, loading, cloudStatus, userEmail, supabaseReady,
    workspaceId, inviteCode, members, needsWorkspace,

    // Derived
    activeCategories, activeExpenses, totals, budgetHealth, categoriesWithStats,

    // Actions
    setShowArchived,
    notify,
    addCategory, updateCategory, archiveCategory, restoreCategory,
    addExpense, updateExpense, archiveExpense, restoreExpense, moveExpense, deleteExpense,
    addPayment, deletePayment,
    updateWorkspaceSettings,
    signIn, signUp, signOut,
    createWorkspaceCloud, joinWorkspaceCloud, getInviteCodeCloud,

    // Calculation helpers (exposed for components)
    getWorkingAmount, getPaidAmount, getOutstandingAmount, getOverpaidAmount,
    getPaymentStatus, formatINR,
  }), [
    categories, expenses, payments, budget, workspaceName, eventDate,
    message, showArchived, loading, cloudStatus, userEmail, supabaseReady,
    workspaceId, inviteCode, members, needsWorkspace,
    activeCategories, activeExpenses, totals, budgetHealth, categoriesWithStats,
    notify,
    addCategory, updateCategory, archiveCategory, restoreCategory,
    addExpense, updateExpense, archiveExpense, restoreExpense, moveExpense, deleteExpense,
    addPayment, deletePayment,
    updateWorkspaceSettings,
    signIn, signUp, signOut,
    createWorkspaceCloud, joinWorkspaceCloud, getInviteCodeCloud,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}
