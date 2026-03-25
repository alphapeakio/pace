/**
 * Generic calculator renderer.
 * Works with any event's segment structure.
 */
import { getPacingModel, getConfidenceBands, getDatabaseRanking, computeDifferential } from './pacing-model.js';
import { formatTime, fmt, velocity, parseTime } from './utils.js';

/**
 * Initialize calculator for an event page.
 *
 * @param {Object} params
 * @param {Object} params.eventMeta - event metadata
 * @param {Object} params.pacingModels - { male: [...], female: [...] }
 * @param {Array} params.menData - men's race data
 * @param {Array} params.womenData - women's race data
 * @param {Object} params.config - event-specific calculator config
 */
export function initCalculator({ eventMeta, pacingModels, menData, womenData, config }) {
  let currentGender = 'male';

  const els = {
    gm: document.getElementById('gm'),
    gf: document.getElementById('gf'),
    targetTime: document.getElementById('targetTime'),
    targetMMSS: document.getElementById('targetMMSS'),
    levelLabel: document.getElementById('levelLabel'),
    splitBars: document.getElementById('splitBars'),
    summaryGrid: document.getElementById('summaryGrid'),
    velocityRow: document.getElementById('velocityRow'),
    confidenceBand: document.getElementById('confidenceBand'),
    rankingCard: document.getElementById('rankingCard'),
  };

  function setGender(g) {
    currentGender = g;
    els.gm.classList.toggle('active', g === 'male');
    els.gf.classList.toggle('active', g === 'female');
    calculate();
  }

  function calculate() {
    const time = parseFloat(els.targetTime.value);
    if (isNaN(time) || time < eventMeta.timeRange.min || time > eventMeta.timeRange.max) return;

    const data = currentGender === 'male' ? menData : womenData;
    const model = getPacingModel(pacingModels, currentGender, time, eventMeta);
    const segments = eventMeta.segments;
    const { splits, pcts, velocities, level } = model;

    // Level label
    const genderSymbol = currentGender === 'male' ? '\u2642' : '\u2640';
    els.levelLabel.textContent = `Performance Level: ${level} (${genderSymbol})`;

    // Split bars
    const maxSplit = Math.max(...splits);
    let barsHtml = '';
    splits.forEach((s, i) => {
      const barPct = (s / maxSplit * 100).toFixed(0);
      const vel = segments[i] ? (segments[i].distance / s).toFixed(2) : '';
      const velStr = vel ? ` (${vel} m/s)` : '';
      barsHtml += `
        <div class="split-bar">
          <div class="label">
            <span>${segments[i]?.label || `Seg ${i + 1}`}</span>
            <span>${formatTime(s, 'seconds')}s${velStr}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill seg-${i % 10}" style="width:${barPct}%">${pcts[i].toFixed(1)}%</div>
          </div>
        </div>`;
    });
    els.splitBars.innerHTML = barsHtml;

    // Summary grid — show halves and differential for events with even segments
    const halfPoint = Math.floor(splits.length / 2);
    const firstHalf = splits.slice(0, halfPoint).reduce((s, v) => s + v, 0);
    const secondHalf = splits.slice(halfPoint).reduce((s, v) => s + v, 0);
    const diff = secondHalf - firstHalf;

    // Determine half labels based on event
    const halfDist = segments.slice(0, halfPoint).reduce((s, seg) => s + seg.distance, 0);
    const totalDist = eventMeta.distance;
    const firstLabel = `0\u2013${halfDist}m`;
    const secondLabel = `${halfDist}\u2013${totalDist}m`;

    const diffColor = Math.abs(diff) > 3 ? 'var(--red)' : Math.abs(diff) > 2 ? 'var(--yellow)' : 'var(--green)';

    els.summaryGrid.innerHTML = `
      <div class="stat-card"><div class="val">${formatTime(firstHalf)}</div><div class="lbl">${firstLabel}</div></div>
      <div class="stat-card"><div class="val">${formatTime(secondHalf)}</div><div class="lbl">${secondLabel}</div></div>
      <div class="stat-card"><div class="val" style="color:${diffColor}">${diff > 0 ? '+' : ''}${diff.toFixed(2)}</div><div class="lbl">Differential</div></div>`;

    // Velocity row
    els.velocityRow.innerHTML = velocities.map((v, i) =>
      `<div class="vel-chip"><div class="v">${v.toFixed(1)}</div><div class="l">${segments[i]?.label || ''} m/s</div></div>`
    ).join('');

    // Confidence bands
    if (els.confidenceBand) {
      const bands = getConfidenceBands(data, time, segments.length);
      if (bands.low && bands.high) {
        els.confidenceBand.innerHTML = `
          <div class="title">Confidence Range (${bands.sampleSize} similar performances)</div>
          ${bands.low.map((l, i) => `
            <div class="confidence-range" style="margin-bottom:4px">
              <span style="color:var(--text3);font-size:0.75rem;min-width:80px">${segments[i]?.label || ''}</span>
              <span class="low">${fmt(l)}</span>
              <span class="dash">—</span>
              <span class="high">${fmt(bands.high[i])}</span>
            </div>
          `).join('')}`;
      } else {
        els.confidenceBand.innerHTML = `<div class="title">Confidence Range</div><p style="color:var(--text3);font-size:0.8rem">Not enough data near this time (need 3+ performances within 15%)</p>`;
      }
    }

    // Database ranking
    if (els.rankingCard) {
      const ranking = getDatabaseRanking(data, time);
      if (ranking.total > 0) {
        const nearestHtml = ranking.nearestAthletes.map(a =>
          `<div style="font-size:0.8rem;color:var(--text2);margin-top:4px">
            ${a.athlete} — ${formatTime(a.time)} (${a.comp})
          </div>`
        ).join('');
        els.rankingCard.innerHTML = `
          <div class="percentile">Top ${ranking.percentile}%</div>
          <div class="context">#${ranking.rank} of ${ranking.total} performances in database</div>
          <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:8px">
            <div style="font-size:0.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Nearest Performances</div>
            ${nearestHtml}
          </div>`;
      } else {
        els.rankingCard.innerHTML = '<div style="color:var(--text3);font-size:0.85rem">No data available for ranking</div>';
      }
    }

    // Dispatch custom event for charts to react
    document.dispatchEvent(new CustomEvent('calculator-update', {
      detail: { gender: currentGender, targetTime: time, model, splits, pcts, velocities }
    }));
  }

  function parseMMSS() {
    const secs = parseTime(els.targetMMSS.value);
    if (!isNaN(secs) && secs > 0) {
      els.targetTime.value = secs.toFixed(2);
      calculate();
    }
  }

  // Bind events
  els.gm.addEventListener('click', () => setGender('male'));
  els.gf.addEventListener('click', () => setGender('female'));
  els.targetTime.addEventListener('input', calculate);
  if (els.targetMMSS) els.targetMMSS.addEventListener('input', parseMMSS);

  // Initial calculation
  calculate();

  return { calculate, setGender };
}
