/**
 * INR currency formatting using Indian digit grouping.
 * Uses Intl.NumberFormat('en-IN') as specified.
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const INR_FORMATTER_WHOLE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Format a numeric value as INR with Indian digit grouping.
 * Returns "₹0" for null/undefined/NaN instead of treating missing as zero silently.
 * @param {number|string|null|undefined} value
 * @param {object} [options]
 * @param {boolean} [options.wholePaise=true] - If true, omit paise for whole numbers
 * @returns {string}
 */
export function formatINR(value, options = {}) {
  const { wholePaise = true } = options;
  const num = Number(value);
  if (isNaN(num)) return '₹0';
  if (wholePaise && Number.isInteger(num)) {
    return INR_FORMATTER_WHOLE.format(num);
  }
  return INR_FORMATTER.format(num);
}

/**
 * Parse a string or number into a safe numeric value.
 * Returns null for truly empty/missing values instead of 0.
 * @param {*} value
 * @returns {number|null}
 */
export function parseAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}
