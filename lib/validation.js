import { z } from 'zod';

/**
 * Validation schemas for WedPlan data.
 * Uses Zod for runtime validation.
 */

// ─── Category ──────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Category name is required')
    .max(80, 'Category name must be 80 characters or fewer'),
  budget_amount: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().min(0, 'Budget cannot be negative').nullable()
  ),
  color: z.string().max(20).nullable().optional(),
  icon: z.string().max(30).default('folder'),
});

// ─── Expense ───────────────────────────────────────────
export const expenseSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Expense name is required')
    .max(120, 'Expense name must be 120 characters or fewer'),
  category_id: z.string().min(1, 'Category is required'),
  vendor: z.string().max(120).nullable().optional(),
  estimated_amount: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().min(0, 'Estimated amount cannot be negative').nullable()
  ),
  final_amount: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().min(0, 'Final amount cannot be negative').nullable()
  ),
  due_date: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(['planned', 'booked', 'partially_paid', 'paid', 'cancelled']).default('planned'),
});

// ─── Payment ───────────────────────────────────────────
export const paymentSchema = z.object({
  expense_id: z.string().min(1, 'Expense is required'),
  amount: z.preprocess(
    (val) => Number(val),
    z.number().positive('Payment amount must be greater than zero')
  ),
  paid_at: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['cash', 'UPI', 'bank_transfer', 'credit_card', 'debit_card', 'other']).nullable().optional(),
  reference: z.string().max(200).nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
});

// ─── Workspace ─────────────────────────────────────────
export const workspaceSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Workspace name is required')
    .max(80, 'Workspace name must be 80 characters or fewer'),
  overall_budget: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().min(0, 'Budget cannot be negative').nullable()
  ),
  event_date: z.string().nullable().optional(),
  currency: z.string().default('INR'),
});

/**
 * Validate data against a schema and return { success, data, errors }.
 * @param {z.ZodSchema} schema
 * @param {object} data
 * @returns {{ success: boolean, data: object|null, errors: object|null }}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { success: false, data: null, errors };
}

/**
 * Check if a category name is a duplicate within the same workspace (case-insensitive).
 * @param {string} name
 * @param {Array} existingCategories
 * @param {string|null} excludeId - ID to exclude (for editing)
 * @returns {boolean}
 */
export function isCategoryNameDuplicate(name, existingCategories, excludeId = null) {
  const normalized = name.trim().toLowerCase();
  return existingCategories.some(
    (c) => c.name.trim().toLowerCase() === normalized && c.id !== excludeId
  );
}
