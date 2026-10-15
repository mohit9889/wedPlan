/**
 * Date formatting utilities for WedPlan.
 */

/**
 * Format a date string for display.
 * @param {string|Date|null} date
 * @param {object} [options]
 * @param {boolean} [options.relative=false] - Show relative dates like "2 days ago"
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  if (options.relative) {
    return getRelativeDate(d);
  }

  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get a relative date string (e.g., "Today", "Yesterday", "3 days ago").
 * @param {Date} date
 * @returns {string}
 */
function getRelativeDate(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? 's' : ''} ago`;
  return formatDate(date);
}

/**
 * Get today's date as YYYY-MM-DD string.
 * @returns {string}
 */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check if a date is in the past.
 * @param {string|Date|null} date
 * @returns {boolean}
 */
export function isPastDue(date) {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/**
 * Check if a date is within the next N days.
 * @param {string|Date|null} date
 * @param {number} days
 * @returns {boolean}
 */
export function isDueWithin(date, days) {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now);
  future.setDate(future.getDate() + days);
  return d >= now && d <= future;
}
