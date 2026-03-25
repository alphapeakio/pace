/**
 * Utility functions for time formatting and conversions
 */

/** Format seconds to MM:SS.cc or SS.cc depending on magnitude */
export function formatTime(seconds, unit = 'seconds') {
  if (seconds == null) return '—';
  if (unit === 'minutes' || seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds - mins * 60;
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
  }
  return seconds.toFixed(2);
}

/** Parse MM:SS.cc or SS.cc to seconds */
export function parseTime(str) {
  if (!str) return NaN;
  str = str.trim();
  const m = str.match(/^(\d+):(\d+\.?\d*)$/);
  if (m) return parseInt(m[1]) * 60 + parseFloat(m[2]);
  return parseFloat(str);
}

/** Format to fixed decimals, returning '—' for null */
export function fmt(val, decimals = 2) {
  if (val == null) return '—';
  return val.toFixed(decimals);
}

/** Calculate velocity in m/s given distance and time */
export function velocity(distance, time) {
  if (!time || !distance) return null;
  return distance / time;
}

/**
 * Ordinary least-squares line y = slope * x + intercept for scatter trend.
 * @param {{x:number,y:number}[]} points
 * @returns {{slope:number,intercept:number}|null}
 */
export function linearRegression(points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    num += dx * (ys[i] - my);
    den += dx * dx;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}

/** Get record badge CSS class */
export function recordClass(record) {
  if (!record) return '';
  if (record.includes('WR') || record.includes('WJR')) return 'wr';
  if (record.includes('OR')) return 'or';
  if (record.includes('AR') || record.includes('NR') || record.includes('CR')) return 'ar';
  if (record.includes('PB')) return 'pb';
  return 'pb';
}

/** Segment colors array */
export const SEGMENT_COLORS = [
  '#ff6b35', '#4d9fff', '#34d399', '#f87171', '#a78bfa',
  '#fbbf24', '#38bdf8', '#fb923c', '#818cf8', '#f472b6',
];

/** Chart.js default theme config */
export const CHART_THEME = {
  backgroundColor: 'rgba(255,107,53,0.1)',
  borderColor: '#ff6b35',
  gridColor: 'rgba(42,42,58,0.5)',
  textColor: '#9999aa',
  fontFamily: "'Outfit', sans-serif",
  monoFamily: "'DM Mono', monospace",
};

/** Compute standard deviation */
export function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Linear interpolation */
export function lerp(a, b, t) {
  return a + t * (b - a);
}
