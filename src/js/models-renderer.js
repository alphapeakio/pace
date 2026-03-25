/**
 * Pacing model cards renderer.
 * Displays performance tier cards with split percentages.
 */

/**
 * Render pacing model cards for a gender.
 *
 * @param {string} containerId - DOM id for card container
 * @param {Array} models - array of model tiers with pcts arrays
 * @param {Array} segments - segment definitions from eventMeta
 * @param {string} timeUnit - 'seconds' or 'minutes'
 */
export function renderModelCards(containerId, models, segments, timeUnit = 'seconds') {
  const container = document.getElementById(containerId);
  if (!container || !models) return;

  container.innerHTML = models.map(m => {
    const gridCols = Math.min(segments.length, 6);
    const splitsHtml = m.pcts.map((p, i) => {
      if (i >= segments.length) return '';
      return `<div class="split">
        <div class="pct">${p.toFixed(1)}%</div>
        <div class="seg">${segments[i]?.label || ''}</div>
      </div>`;
    }).join('');

    const rangeStr = m.range || '';
    const targetStr = timeUnit === 'minutes'
      ? `${Math.floor(m.targetTime / 60)}:${(m.targetTime % 60).toFixed(1).padStart(4, '0')}`
      : m.targetTime.toFixed(2) + 's';

    return `
      <div class="model-card">
        <div class="tier">${m.level}</div>
        <div class="range">${rangeStr} (target: ${targetStr})</div>
        <div class="splits" style="grid-template-columns:repeat(${gridCols},1fr)">
          ${splitsHtml}
        </div>
      </div>`;
  }).join('');
}
