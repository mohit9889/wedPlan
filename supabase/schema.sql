-- WedPlan Wedding Budget Tracker — Full Schema
-- Run this script in Supabase SQL Editor.
-- Supports shared workspaces for a couple with RLS.

create extension if not exists pgcrypto;

-- ─── Workspaces ────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Wedding',
  event_date date,
  currency text not null default 'INR',
  total_budget numeric(14,2) check (total_budget is null or total_budget >= 0),
  invite_code text unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Workspace Members ─────────────────────────────────
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ─── Profiles ──────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  display_name text,
  created_at timestamptz not null default now()
);

-- ─── Categories ────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  icon text not null default 'folder',
  budget numeric(14,2) check (budget is null or budget >= 0),
  color text,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Expenses ──────────────────────────────────────────
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  vendor text,
  estimated_cost numeric(14,2) check (estimated_cost is null or estimated_cost >= 0),
  final_cost numeric(14,2) check (final_cost is null or final_cost >= 0),
  due_date date,
  status text not null default 'planned' check (status in ('planned', 'booked', 'partially_paid', 'paid', 'cancelled')),
  notes text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Payments ──────────────────────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  paid_at date not null default current_date,
  payment_method text check (payment_method is null or payment_method in ('cash', 'UPI', 'bank_transfer', 'credit_card', 'debit_card', 'other')),
  reference text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Activity Log (optional) ───────────────────────────
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text,
  created_at timestamptz not null default now()
);

-- ─── Indexes ───────────────────────────────────────────
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_categories_workspace on public.categories(workspace_id);
create index if not exists idx_categories_sort on public.categories(workspace_id, sort_order);
create index if not exists idx_expenses_workspace on public.expenses(workspace_id);
create index if not exists idx_expenses_category on public.expenses(category_id);
create index if not exists idx_expenses_status on public.expenses(workspace_id, status);
create index if not exists idx_payments_expense on public.payments(expense_id);
create index if not exists idx_payments_workspace on public.payments(workspace_id);
create index if not exists idx_activity_log_workspace on public.activity_log(workspace_id);

-- ─── Membership Check Function ─────────────────────────
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace and user_id = auth.uid()
  );
$$;

-- ─── Enable RLS ────────────────────────────────────────
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;
alter table public.activity_log enable row level security;

-- ─── RLS Policies ──────────────────────────────────────

-- Workspaces
drop policy if exists "members can read their workspaces" on public.workspaces;
create policy "members can read their workspaces" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
drop policy if exists "members can update their workspaces" on public.workspaces;
create policy "members can update their workspaces" on public.workspaces
  for update to authenticated using (public.is_workspace_member(id)) with check (public.is_workspace_member(id));

-- Workspace Members
drop policy if exists "members can read workspace membership" on public.workspace_members;
create policy "members can read workspace membership" on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- Profiles
drop policy if exists "users can read their profile" on public.profiles;
create policy "users can read their profile" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "users can update their profile" on public.profiles;
create policy "users can update their profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Categories
drop policy if exists "members manage categories" on public.categories;
create policy "members manage categories" on public.categories
  for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Expenses
drop policy if exists "members manage expenses" on public.expenses;
create policy "members manage expenses" on public.expenses
  for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Payments
drop policy if exists "members manage payments" on public.payments;
create policy "members manage payments" on public.payments
  for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Activity Log
drop policy if exists "members can view activity" on public.activity_log;
create policy "members can view activity" on public.activity_log
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "members can insert activity" on public.activity_log;
create policy "members can insert activity" on public.activity_log
  for insert to authenticated with check (public.is_workspace_member(workspace_id));

-- ─── Updated At Trigger ────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspaces_updated_at on public.workspaces;
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.handle_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute function public.handle_updated_at();

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.handle_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments
  for each row execute function public.handle_updated_at();

-- ─── Profile Auto-Create Trigger ───────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Account/workspace bootstrap and invitation are handled via SECURITY DEFINER functions below.
-- These run with elevated privileges but are called through the Supabase client (anon key),
-- so the user must be authenticated. Never expose the service-role key in the browser.

-- Add invite_code column to workspaces
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'workspaces' and column_name = 'invite_code')
  then
    alter table public.workspaces add column invite_code text unique;
  end if;
end $$;

-- ─── Workspace Bootstrap Function ──────────────────────
-- Creates a workspace, adds the caller as owner, and sets their profile.
create or replace function public.bootstrap_workspace(ws_name text, ws_budget numeric default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  code text;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Check if user already has a workspace
  if exists (select 1 from profiles where id = uid and workspace_id is not null) then
    raise exception 'You already belong to a workspace. Sign out or leave first.';
  end if;

  -- Generate a simple 8-char invite code
  code := upper(substr(md5(random()::text || now()::text), 1, 8));

  -- If there is an unowned seed workspace (e.g. from seed.sql), claim it!
  select id into ws_id from workspaces where id = '00000000-0000-0000-0000-000000000001' and created_by is null;
  if ws_id is not null then
    update workspaces
    set name = coalesce(nullif(ws_name, ''), name),
        total_budget = case when ws_budget > 0 then ws_budget else total_budget end,
        created_by = uid,
        invite_code = code
    where id = ws_id;
  else
    insert into workspaces (name, total_budget, created_by, invite_code)
    values (ws_name, coalesce(ws_budget, 0), uid, code)
    returning id into ws_id;
  end if;

  insert into workspace_members (workspace_id, user_id, role)
  values (ws_id, uid, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  update profiles set workspace_id = ws_id where id = uid;

  return jsonb_build_object('workspace_id', ws_id, 'invite_code', code);
end;
$$;

-- ─── Join Workspace by Invite Code ─────────────────────
-- Allows a partner to join a workspace using the invite code.
create or replace function public.join_workspace(code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  member_count int;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Check if user already has a workspace
  if exists (select 1 from profiles where id = uid and workspace_id is not null) then
    raise exception 'You already belong to a workspace.';
  end if;

  -- Find workspace by invite code
  select id into ws_id from workspaces where invite_code = upper(trim(code));
  if ws_id is null then
    raise exception 'Invalid invite code. Please check and try again.';
  end if;

  -- Check member count (max 2 for a couple)
  select count(*) into member_count from workspace_members where workspace_id = ws_id;
  if member_count >= 2 then
    raise exception 'This workspace already has two members.';
  end if;

  -- Add as member
  insert into workspace_members (workspace_id, user_id, role)
  values (ws_id, uid, 'member')
  on conflict (workspace_id, user_id) do nothing;

  update profiles set workspace_id = ws_id where id = uid;

  return jsonb_build_object('workspace_id', ws_id, 'status', 'joined');
end;
$$;

-- ─── Get Invite Code ───────────────────────────────────
-- Returns the invite code for the caller's workspace (owner only).
create or replace function public.get_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  code text;
begin
  select workspace_id into ws_id from profiles where id = auth.uid();
  if ws_id is null then return null; end if;

  select invite_code into code from workspaces where id = ws_id;
  return code;
end;
$$;
