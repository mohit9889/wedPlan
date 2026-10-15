-- WedPlan Seed Data
-- Run AFTER schema.sql to populate a workspace with the user's wedding expenses.
-- This creates a workspace and inserts seed data without authentication.
-- In production, workspace creation should be done through a trusted server-side flow.
--
-- IMPORTANT NOTES ON DATA:
-- - Jewellery items sum to ₹15,98,551 but user stated ₹16,13,000 (₹14,449 discrepancy)
-- - Silver entries listed as three separate items — confirm if correct
-- - "₹33,000 left" note for jewellery not attached to any specific expense
-- - Sarees: "₹8,500 remaining" is ambiguous — preserved in notes
-- - Haldi & Mehndi: amount unknown, created as placeholder
-- - Sherwani/Suits payments are DERIVED from stated remaining, not explicitly said "paid"

-- Create the workspace
insert into public.workspaces (id, name, total_budget, currency)
values ('00000000-0000-0000-0000-000000000001', 'Our Wedding', 2000000, 'INR')
on conflict (id) do nothing;

-- ─── Categories ────────────────────────────────────────
insert into public.categories (id, workspace_id, name, icon, budget, sort_order) values
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Jewellery', 'gem', 1600000, 0),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Clothes', 'shirt', 150000, 1),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Other Expenses', 'calendar', 100000, 2)
on conflict (id) do nothing;

-- ─── Jewellery Expenses ────────────────────────────────
insert into public.expenses (id, workspace_id, category_id, name, estimated_cost, final_cost, status, notes) values
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ring', 55257, 55257, 'paid', '18k, 4.460 g'),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Long Set', 415957, 415957, 'paid', '22k, 27.490 g'),
  ('e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Choori', 540789, 540789, 'paid', '22k, 35.740 g'),
  ('e0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Mangalsutra', 118326, 118326, 'paid', '22k, 7.820 g'),
  ('e0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Tika', 60222, 60222, 'paid', '22k, 3.980 g'),
  ('e0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Engagement Ring', 107000, 107000, 'paid', '14k, diamonds'),
  ('e0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Silver (1)', 60000, 60000, 'paid', 'Silver item — confirm if separate items'),
  ('e0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Silver (2)', 5000, 5000, 'paid', 'Silver item — confirm if separate item'),
  ('e0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Silver (3)', 3000, 3000, 'paid', 'Silver item — confirm if separate item'),
  ('e0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Small Necklace', 200000, 200000, 'paid', '20k, 16.5 g'),
  ('e0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Deepak Ring', 33000, 33000, 'paid', '18k, 2.5 g. NOTE: User noted "₹33,000 left" — unclear if refers to this item')
on conflict (id) do nothing;

-- ─── Clothes Expenses ──────────────────────────────────
insert into public.expenses (id, workspace_id, category_id, name, estimated_cost, final_cost, status, notes) values
  ('e0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Lehenga', 37000, 37000, 'paid', null),
  ('e0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Sherwani', 23000, 23000, 'partially_paid', '₹10,000 remaining. Paid ₹13,000 derived from total minus remaining.'),
  ('e0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Suits', 21400, 21400, 'partially_paid', '₹11,400 remaining. Paid ₹10,000 derived from total minus remaining.'),
  ('e0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Sony Saree', 41065, 41065, 'paid', null),
  ('e0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', '9 Petticoats', 1080, 1080, 'paid', null),
  ('e0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Sarees', 19500, 19500, 'partially_paid', '₹11,000 + ₹8,500 with ₹8,500 remaining. AMBIGUOUS: unclear whether ₹8,500 is outstanding or separate purchase.')
on conflict (id) do nothing;

-- ─── Other Expenses ────────────────────────────────────
insert into public.expenses (id, workspace_id, category_id, name, estimated_cost, final_cost, status, notes) values
  ('e0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Band', 30000, 30000, 'booked', 'Token paid. ₹28,000 remaining.'),
  ('e0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Bus', 15000, 15000, 'booked', 'Token paid. ₹14,000 remaining.'),
  ('e0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Camera', 15000, 15000, 'booked', 'Token paid. ₹14,000 remaining.'),
  ('e0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Haldi & Mehndi', null, null, 'planned', 'Amount not provided. Created as placeholder. ⚠️ Confirm if should be pre-added.')
on conflict (id) do nothing;

-- ─── Payments ──────────────────────────────────────────
-- Only creating payment records for amounts explicitly described as paid/token paid,
-- plus derived payments from stated remaining amounts (flagged in notes).

insert into public.payments (id, workspace_id, expense_id, amount, paid_at, payment_method, notes) values
  -- Token payments (explicitly stated)
  ('ba000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000018', 2000, '2026-10-01', 'cash', 'Token payment'),
  ('ba000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000019', 1000, '2026-10-01', 'cash', 'Token payment'),
  ('ba000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000020', 1000, '2026-10-01', 'cash', 'Token payment'),
  -- Derived from stated remaining amounts (not explicitly described as "paid")
  ('ba000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000013', 13000, '2026-10-01', null, 'Derived: ₹10,000 listed as remaining from ₹23,000 total. Confirm details.'),
  ('ba000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000014', 10000, '2026-10-01', null, 'Derived: ₹11,400 listed as remaining from ₹21,400 total. Confirm details.'),
  ('ba000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000017', 11000, '2026-10-01', null, 'Derived: ₹8,500 remaining from combined ₹19,500. Ambiguous — confirm actual payment.')
on conflict (id) do nothing;
