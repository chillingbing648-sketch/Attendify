/* ============================================================
   ATTENDIFY — utils.js
   Generic, stateless helper functions used across modules.
   ============================================================ */

const Utils = (() => {

  /** Generate a reasonably unique id. */
  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /** Clamp a number between min/max. */
  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /**
   * Safe attendance percentage. Never returns NaN.
   * @param {number} attended
   * @param {number} total
   * @returns {number} percentage rounded to 1 decimal
   */
  function safePercent(attended, total) {
    const a = Number(attended) || 0;
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    const pct = (a / t) * 100;
    if (!isFinite(pct) || isNaN(pct)) return 0;
    return Math.round(pct * 10) / 10;
  }

  /** Returns 'safe' | 'warn' | 'critical' given a percentage and threshold config. */
  function statusForPercent(pct, thresholds) {
    const { safe, warn } = thresholds;
    if (pct >= safe) return 'safe';
    if (pct >= warn) return 'warn';
    return 'critical';
  }

  function statusLabel(status) {
    return { safe: 'Safe', warn: 'Warning', critical: 'Critical' }[status] || 'Unknown';
  }

  /**
   * How many future classes (all attended) can be missed while staying >= threshold.
   * Formula: find max x such that attended / (total + x) >= threshold/100
   * => x <= attended*100/threshold - total
   */
  function classesCanMiss(attended, total, thresholdPct) {
    const a = Number(attended) || 0;
    const t = Number(total) || 0;
    if (thresholdPct <= 0) return 0;
    if (t === 0) return 0;
    const currentPct = safePercent(a, t);
    if (currentPct < thresholdPct) return 0;
    const maxX = Math.floor((a * 100) / thresholdPct - t);
    return Math.max(0, maxX);
  }

  /**
   * How many consecutive future classes (all attended) are needed to reach threshold.
   * Formula: find min x such that (attended + x) / (total + x) >= threshold/100
   * => x >= (threshold*total - 100*attended) / (100 - threshold)
   */
  function classesNeededToRecover(attended, total, thresholdPct) {
    const a = Number(attended) || 0;
    const t = Number(total) || 0;
    if (thresholdPct >= 100) return Infinity;
    const currentPct = safePercent(a, t);
    if (currentPct >= thresholdPct) return 0;
    const numerator = (thresholdPct * t) - (100 * a);
    const denominator = 100 - thresholdPct;
    if (denominator <= 0) return Infinity;
    const x = numerator / denominator;
    return Math.max(0, Math.ceil(x - 1e-9));
  }

  /** Format a Date (or ISO string) as "12 Feb 2026". */
  function formatDate(d) {
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Format as "Feb 12" (short, no year) */
  function formatDateShort(d) {
    const date = (d instanceof Date) ? d : new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  /** Relative time e.g. "2h ago", "Just now", "3d ago". */
  function timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    const diffSec = Math.floor((Date.now() - then) / 1000);
    if (diffSec < 30) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(then);
  }

  /** ISO date (yyyy-mm-dd) for "today". */
  function todayISO() {
    return toISODate(new Date());
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Escape a string for safe insertion into innerHTML. */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Debounce helper. */
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  /** Trigger a browser download of textual content. */
  function downloadFile(filename, content, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Convert an array of flat objects to CSV text. */
  function toCSV(rows) {
    if (!rows || !rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escapeCell = (val) => {
      const s = val === null || val === undefined ? '' : String(val);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(',')];
    rows.forEach(row => {
      lines.push(headers.map(h => escapeCell(row[h])).join(','));
    });
    return lines.join('\n');
  }

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    uid, clamp, safePercent, statusForPercent, statusLabel,
    classesCanMiss, classesNeededToRecover,
    formatDate, formatDateShort, timeAgo, todayISO, toISODate,
    escapeHTML, debounce, downloadFile, toCSV,
    DAY_NAMES, DAY_SHORT
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
