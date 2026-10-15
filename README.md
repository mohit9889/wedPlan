# WedPlan — Wedding Budget Tracker

A mobile-first Next.js PWA for tracking wedding budgets, categories, expenses, and partial payments. Built with pure JavaScript (no TypeScript), Tailwind CSS v4, and Supabase cloud storage with couple workspace sharing.

## Features

- **Mobile-first** teal dashboard with desktop sidebar layout
- **Decomposed App Router** pages: Dashboard, Categories, Expenses, Payments, Settings, Auth
- **Workspace Sharing**: Two partners can share the same wedding workspace with real-time invite codes and RLS protection
- **Categories**: Create, edit, archive, restore, set budgets, and reorder
- **Expenses**: Create, edit, archive, restore; estimated vs final cost; vendor, due date, status, notes
- **Move expenses** between categories within the same workspace
- **Payments**: Record multiple partial payments per expense with date, method, reference, notes
- **Financial clarity**: Committed, paid, outstanding, and budget remaining clearly distinguished
- **Overpayment detection**: Shows overpaid amounts explicitly rather than silently discarding
- **CSV export**: Expenses and payments with formula injection protection
- **Form validation**: Zod schemas with inline error messages and full accessible labeling
- **Confirmation dialogs**: Archive actions require confirmation and explain cascade impact
- **Full PWA Experience**: Manifest, 192px and 512px PNG icons, Apple touch icon, service worker caching for offline assets
- **Supabase schema**: PostgreSQL schema with RLS policies, auto-profile trigger, and RPC functions for workspace creation & invite code joining
- **67 unit tests**: Covering financial calculations (35), validation rules (27), and CSV exports (5)

## Seed Data Notes

The app ships with initial demo data based on wedding expenses. Discrepancies and ambiguities are documented as notes:

- Jewellery items sum to ₹15,98,551 but initial stated budget was ₹16,13,000 (₹14,449 discrepancy documented in notes)
- Silver listed as three separate entries — pending confirmation
- Sarees "₹8,500 remaining" is ambiguous — preserved in notes
- Sherwani/Suits paid amounts derived from stated remaining, not explicitly marked as paid
- Haldi & Mehndi created as placeholder with unknown amount

## Requirements

- Node.js 20.9+
- npm

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs in **demo mode** with seed data in memory if Supabase credentials are not provided.

## Run Tests

```bash
npm test           # Single run (67 tests)
npm run test:watch # Watch mode
```

## Production Build

```bash
npm run build
npm start
```

## Supabase Cloud Setup & Partner Sharing

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Run `supabase/schema.sql` to create all tables, indexes, RLS policies, and bootstrap/join RPC functions.
4. (Optional) Run `supabase/seed.sql` to populate sample data.
5. Create a `.env.local` file with your project keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

6. Enable Email/Password authentication in Supabase Auth Settings.
7. Set the Site URL to your domain (or `http://localhost:3000` for development), and add `http://localhost:3000/auth/callback` to the Redirect URLs.
8. How partner sharing works:
   - **Partner 1 (Owner)** signs in, clicks "Create workspace", enters the wedding name & budget, and receives an 8-character invite code (e.g., `A1B2C3D4`).
   - **Partner 2** signs in, clicks "Join your partner's workspace", enters the 8-character invite code, and joins instantly.
   - All categories, expenses, and payments are automatically scoped to that workspace and synced via Supabase RLS.

## Deploying to Vercel

1. Push your repository to GitHub / GitLab.
2. Import the project in [Vercel](https://vercel.com).
3. In Project Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://YOUR_PROJECT.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `YOUR_SUPABASE_ANON_KEY`
4. Deploy. Vercel automatically assigns an HTTPS URL, which enables full PWA installability on iOS and Android devices.
5. Add your Vercel deployment URL to the Supabase Auth Redirect URLs list (e.g. `https://your-app.vercel.app/auth/callback`).

## PWA Installation

- **Android Chrome**: Tap the three-dot menu (⋮) → **Add to Home screen** / **Install app**.
- **iOS Safari**: Tap the Share button → **Add to Home Screen**.
- **Desktop Chrome**: Click the install icon in the URL bar.

## Project Structure

```
app/
  layout.js               # Root layout with metadata, icons, and ServiceWorker
  page.js                 # Dashboard overview
  categories/page.js      # Categories management
  expenses/page.js        # Expenses with filters and search
  payments/page.js        # Payment history and recording
  settings/page.js        # Workspace configuration, invite code, cloud sync, exports
  auth/page.js            # Sign in / sign up standalone page
  auth/callback/route.js  # OAuth & email confirmation callback
components/
  layout/AppShell.js      # Responsive sidebar, topbar, mobile bottom nav, toast
  forms/CategoryForm.js   # Validated category create/edit modal
  forms/ExpenseForm.js    # Validated expense create/edit modal
  forms/PaymentForm.js    # Validated payment recording modal
  pwa/ServiceWorkerRegister.js # PWA service worker registration
  ui/Modal.js             # Accessible modal with backdrop & escape listener
  ui/ConfirmDialog.js     # Destructive action confirmation dialog
contexts/
  WorkspaceContext.js     # State management, cloud sync, CRUD, and RPC calls
lib/
  calculations.js         # Documented financial formulas
  currency.js             # INR formatting with Indian numbering system
  dates.js                # Date formatting and ISO helpers
  exports.js              # CSV export with formula injection escaping
  seed-data.js            # Initial seed dataset with notes
  validation.js           # Zod schemas for all models
  supabase/
    client.js             # Browser Supabase client
    server.js             # Server Components / Route Handler Supabase client
    middleware.js         # Auth session refresh middleware helper
middleware.js             # Next.js middleware
public/
  manifest.json           # Web app manifest
  sw.js                   # Service worker for offline asset caching
  icon.svg                # Vector app icon
  icon-192.png            # 192x192 PNG app icon
  icon-512.png            # 512x512 PNG app icon
  apple-touch-icon.png    # 180x180 iOS touch icon
supabase/
  schema.sql              # Database schema with RLS and bootstrap functions
  seed.sql                # SQL seed script
tests/
  calculations.test.js    # 35 calculation tests
  validation.test.js      # 27 validation tests
  exports.test.js         # 5 CSV export tests
```

## Financial Calculation Definitions

| Term | Definition |
|------|------------|
| **Estimated amount** | Initial planned cost before vendor confirmation |
| **Final amount** | Confirmed cost after agreement (overrides estimate) |
| **Working amount** | Final if set, otherwise estimated — the active cost figure |
| **Paid** | Sum of all payment records for an expense |
| **Outstanding** | `max(working - paid, 0)` — amount still to pay |
| **Overpaid** | `max(paid - working, 0)` — shown as credit, never discarded |
| **Budget remaining** | Overall budget minus total committed (working amounts) |
