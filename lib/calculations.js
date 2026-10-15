/**
 * Financial calculation rules for WedPlan.
 *
 * Terminology:
 * - estimated_amount: The initial planned/estimated cost before final confirmation
 * - final_amount: The confirmed/committed cost after vendor agreement
 * - working_amount: final_amount if set, otherwise estimated_amount (the "active" cost figure)
 * - paid: Sum of all payment records for an expense
 * - outstanding: max(working_amount - paid, 0) — amount still to pay
 * - overpaid: max(paid - working_amount, 0) — credit if payments exceed cost
 * - budget_remaining: overall_budget - total committed (using working amounts)
 *
 * Rules:
 * - Money stored as numeric in DB; derived totals computed from source records.
 * - Missing amounts (null) are treated as "unknown", NOT as zero in labels.
 * - Overpayment is never silently discarded — shown as overpaid state.
 * - Cancelled/archived expenses are excluded from budget totals by default.
 */

/**
 * Get the working cost for an expense (final if set, otherwise estimated).
 * Returns null if neither is set (unknown cost).
 * @param {object} expense
 * @param {number|null} expense.estimated_amount
 * @param {number|null} expense.final_amount
 * @returns {number|null}
 */
export function getWorkingAmount(expense) {
  if (expense.final_amount !== null && expense.final_amount !== undefined && expense.final_amount !== '') {
    return Number(expense.final_amount);
  }
  if (expense.estimated_amount !== null && expense.estimated_amount !== undefined && expense.estimated_amount !== '') {
    return Number(expense.estimated_amount);
  }
  return null;
}

/**
 * Calculate total paid amount for an expense from its payment records.
 * @param {string} expenseId
 * @param {Array} payments
 * @returns {number}
 */
export function getPaidAmount(expenseId, payments) {
  return payments
    .filter((p) => p.expense_id === expenseId)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

/**
 * Calculate outstanding amount for an expense.
 * Returns null if working amount is unknown.
 * @param {object} expense
 * @param {Array} payments
 * @returns {number|null}
 */
export function getOutstandingAmount(expense, payments) {
  const working = getWorkingAmount(expense);
  if (working === null) return null;
  const paid = getPaidAmount(expense.id, payments);
  return Math.max(0, working - paid);
}

/**
 * Calculate overpaid amount for an expense.
 * Returns 0 if not overpaid, null if working amount is unknown.
 * @param {object} expense
 * @param {Array} payments
 * @returns {number|null}
 */
export function getOverpaidAmount(expense, payments) {
  const working = getWorkingAmount(expense);
  if (working === null) return null;
  const paid = getPaidAmount(expense.id, payments);
  return Math.max(0, paid - working);
}

/**
 * Determine the payment status of an expense based on its amounts and payments.
 * @param {object} expense
 * @param {Array} payments
 * @returns {'unknown'|'unpaid'|'partially_paid'|'fully_paid'|'overpaid'|'cancelled'}
 */
export function getPaymentStatus(expense, payments) {
  if (expense.is_archived || expense.status === 'cancelled') return 'cancelled';

  const working = getWorkingAmount(expense);
  if (working === null) return 'unknown';
  if (working === 0) return 'fully_paid';

  const paid = getPaidAmount(expense.id, payments);
  if (paid === 0) return 'unpaid';
  if (paid >= working) {
    return paid > working ? 'overpaid' : 'fully_paid';
  }
  return 'partially_paid';
}

/**
 * Calculate aggregate totals for a set of expenses and payments.
 * Excludes archived/cancelled expenses by default.
 * @param {Array} expenses
 * @param {Array} payments
 * @param {object} [options]
 * @param {boolean} [options.includeArchived=false]
 * @returns {object}
 */
export function calculateTotals(expenses, payments, options = {}) {
  const { includeArchived = false } = options;

  const activeExpenses = includeArchived
    ? expenses
    : expenses.filter((e) => !e.is_archived && e.status !== 'cancelled');

  let totalEstimated = 0;
  let totalFinal = 0;
  let totalWorking = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalOverpaid = 0;
  let expensesWithFinal = 0;
  let expensesWithEstimate = 0;

  for (const expense of activeExpenses) {
    const est = expense.estimated_amount !== null && expense.estimated_amount !== undefined
      ? Number(expense.estimated_amount) : 0;
    const fin = expense.final_amount !== null && expense.final_amount !== undefined
      ? Number(expense.final_amount) : null;
    const working = getWorkingAmount(expense) || 0;
    const paid = getPaidAmount(expense.id, payments);

    totalEstimated += est;
    if (fin !== null) {
      totalFinal += fin;
      expensesWithFinal++;
    }
    if (est > 0) expensesWithEstimate++;
    totalWorking += working;
    totalPaid += paid;

    if (working > 0 || paid > 0) {
      if (paid > working) {
        totalOverpaid += (paid - working);
      } else {
        totalOutstanding += (working - paid);
      }
    }
  }

  return {
    totalEstimated,
    totalFinal,
    totalWorking,      // "committed" — the active cost figure
    totalPaid,
    totalOutstanding,   // still to pay
    totalOverpaid,      // excess payments
    expenseCount: activeExpenses.length,
    expensesWithFinal,
    expensesWithEstimate,
  };
}

/**
 * Calculate totals for a specific category.
 * @param {string} categoryId
 * @param {Array} expenses
 * @param {Array} payments
 * @returns {object}
 */
export function calculateCategoryTotals(categoryId, expenses, payments) {
  const categoryExpenses = expenses.filter((e) => e.category_id === categoryId);
  return calculateTotals(categoryExpenses, payments);
}

/**
 * Calculate budget health metrics.
 * @param {number|null} overallBudget
 * @param {number} totalWorking - Total committed/working amount
 * @param {number} totalPaid
 * @returns {object}
 */
export function calculateBudgetHealth(overallBudget, totalWorking, totalPaid) {
  const budget = Number(overallBudget) || 0;
  const budgetRemaining = budget - totalWorking;
  const budgetUsedPercent = budget > 0 ? Math.min(100, (totalWorking / budget) * 100) : 0;
  const isOverBudget = budgetRemaining < 0;

  return {
    budget,
    budgetRemaining,
    budgetUsedPercent,
    isOverBudget,
    overBudgetAmount: isOverBudget ? Math.abs(budgetRemaining) : 0,
  };
}
