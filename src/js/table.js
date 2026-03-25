/**
 * Generic sortable, searchable data table renderer.
 * Works with any event's column structure.
 */
import { formatTime, fmt, recordClass } from './utils.js';

/**
 * Initialize a data table.
 *
 * @param {Object} params
 * @param {string} params.containerId - DOM id for table container
 * @param {string} params.searchId - DOM id for search input
 * @param {string} params.sortId - DOM id for sort select
 * @param {Array} params.data - race data array
 * @param {Object} params.eventMeta - event metadata with segments
 * @param {Array} params.extraColumns - extra column definitions [{key, label, format}]
 */
export function initTable({ containerId, searchId, sortId, data, eventMeta, extraColumns = [] }) {
  const container = document.getElementById(containerId);
  const searchInput = document.getElementById(searchId);
  const sortSelect = document.getElementById(sortId);

  function render() {
    const search = (searchInput?.value || '').toLowerCase();
    const sort = sortSelect?.value || 'time-asc';
    const segments = eventMeta.segments;

    let filtered = data.filter(r => {
      const s = `${r.athlete} ${r.comp} ${r.date} ${r.nat} ${r.record} ${r.round || ''}`.toLowerCase();
      return s.includes(search);
    });

    const [key, dir] = sort.split('-');
    filtered.sort((a, b) => {
      let va, vb;
      if (key === 'time') { va = a.time; vb = b.time; }
      else if (key === 'date') { va = a.date; vb = b.date; }
      else if (key === 'diff') {
        va = a.extra?.diff ?? 99;
        vb = b.extra?.diff ?? 99;
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    // Build header
    let html = '<table><thead><tr>';
    html += '<th>Athlete</th><th>Nat</th><th>Date</th><th>Competition</th><th>Time</th>';

    // Split columns
    segments.forEach(seg => {
      html += `<th>${seg.label}</th>`;
    });

    // Extra columns
    extraColumns.forEach(col => {
      html += `<th>${col.label}</th>`;
    });

    // Differential and record
    html += '<th>Diff</th><th>Record</th>';
    html += '</tr></thead><tbody>';

    // Build rows
    filtered.forEach(r => {
      html += '<tr>';
      html += `<td><strong>${r.athlete}</strong></td>`;
      html += `<td>${r.nat}</td>`;
      html += `<td class="mono">${r.date}</td>`;
      html += `<td>${r.comp}${r.round ? ' ' + r.round : ''}</td>`;
      html += `<td class="mono"><strong>${formatTime(r.time, eventMeta.timeUnit)}</strong></td>`;

      // Splits
      if (r.splits && r.splits.length > 0) {
        segments.forEach((seg, i) => {
          html += `<td class="mono">${fmt(r.splits[i])}</td>`;
        });
      } else {
        segments.forEach(() => {
          html += '<td class="mono">—</td>';
        });
      }

      // Extra columns
      extraColumns.forEach(col => {
        const val = col.key.startsWith('extra.') ? r.extra?.[col.key.slice(6)] : r[col.key];
        if (col.format === 'time2') html += `<td class="mono">${fmt(val)}</td>`;
        else if (col.format === 'wind') html += `<td class="mono">${val != null ? (val > 0 ? '+' : '') + val.toFixed(1) : '—'}</td>`;
        else if (col.format === 'velocity') html += `<td class="mono">${fmt(val, 1)}</td>`;
        else html += `<td class="mono">${val != null ? val : '—'}</td>`;
      });

      // Differential
      const diff = r.extra?.diff;
      html += `<td class="mono">${fmt(diff)}</td>`;

      // Record
      html += `<td>${r.record ? `<span class="record-badge ${recordClass(r.record)}">${r.record}</span>` : ''}</td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // Bind events
  if (searchInput) searchInput.addEventListener('input', render);
  if (sortSelect) sortSelect.addEventListener('change', render);

  // Initial render
  render();

  return { render };
}
