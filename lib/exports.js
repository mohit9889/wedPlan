/**
 * CSV export utilities with formula injection protection.
 */

/**
 * Characters that could trigger formula execution in spreadsheet applications.
 * Prefixed with a single quote to prevent injection.
 */
const FORMULA_CHARS = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Escape a CSV cell value to prevent formula injection.
 * @param {*} value
 * @returns {string}
 */
function escapeCell(value) {
  let text = String(value ?? '');
  // Prefix with single quote if starts with a formula character
  if (FORMULA_CHARS.some((ch) => text.startsWith(ch))) {
    text = "'" + text;
  }
  // Escape double quotes by doubling them, wrap in quotes
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Convert rows of data into a CSV string with formula injection protection.
 * @param {Array<Array>} rows - Array of rows, each row is an array of cell values
 * @returns {string}
 */
export function toCsv(rows) {
  return rows
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');
}

/**
 * Download a CSV file in the browser.
 * @param {string} filename
 * @param {Array<Array>} rows - Array of rows, each row is an array of cell values
 */
export function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Build expense export rows.
 * @param {Array} expenses
 * @param {Array} categories
 * @param {Array} payments
 * @param {function} getWorkingAmountFn
 * @param {function} getPaidAmountFn
 * @returns {Array<Array>}
 */
export function buildExpenseExportRows(expenses, categories, payments, getWorkingAmountFn, getPaidAmountFn) {
  const header = [
    'Category', 'Item', 'Vendor', 'Estimated Cost', 'Final Cost',
    'Working Amount', 'Paid', 'Outstanding', 'Due Date', 'Status', 'Notes'
  ];

  const rows = expenses
    .filter((e) => !e.is_archived)
    .map((expense) => {
      const category = categories.find((c) => c.id === expense.category_id);
      const working = getWorkingAmountFn(expense);
      const paid = getPaidAmountFn(expense.id, payments);
      const outstanding = working !== null ? Math.max(0, working - paid) : '';

      return [
        category?.name || 'Unknown',
        expense.name,
        expense.vendor || '',
        expense.estimated_amount ?? '',
        expense.final_amount ?? '',
        working ?? '',
        paid,
        outstanding,
        expense.due_date || '',
        expense.status || '',
        expense.notes || '',
      ];
    });

  return [header, ...rows];
}

/**
 * Build payment export rows.
 * @param {Array} payments
 * @param {Array} expenses
 * @param {Array} categories
 * @returns {Array<Array>}
 */
export function buildPaymentExportRows(payments, expenses, categories) {
  const header = ['Expense', 'Category', 'Amount', 'Payment Date', 'Method', 'Reference', 'Notes'];

  const rows = payments.map((payment) => {
    const expense = expenses.find((e) => e.id === payment.expense_id);
    const category = expense
      ? categories.find((c) => c.id === expense.category_id)
      : null;

    return [
      expense?.name || 'Archived item',
      category?.name || '—',
      payment.amount,
      payment.paid_at || payment.payment_date || '',
      payment.payment_method || payment.method || '',
      payment.reference || '',
      payment.notes || '',
    ];
  });

  return [header, ...rows];
}
