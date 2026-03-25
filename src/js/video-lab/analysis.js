/**
 * Compare marked splits to pacing model + database context.
 */
import { getPacingModel, getConfidenceBands, computeDifferential } from '../pacing-model.js';
import { formatTime } from '../utils.js';

/**
 * @param {object} params
 * @param {number[]} params.segmentSeconds - final segment durations (seconds)
 * @param {object} params.eventMeta
 * @param {object} params.pacingModels
 * @param {Array} params.raceData - men or women for selected gender
 * @param {'male'|'female'} params.gender
 */
export function runVideoLabAnalysis({
  segmentSeconds,
  eventMeta,
  pacingModels,
  raceData,
  gender,
}) {
  const n = eventMeta.segments.length;
  if (!segmentSeconds || segmentSeconds.length !== n) {
    return { error: 'Invalid segment data' };
  }

  const T = segmentSeconds.reduce((a, b) => a + b, 0);
  if (T <= 0) return { error: 'Total time must be positive' };

  const model = getPacingModel(pacingModels, gender, T, eventMeta);
  const bands = getConfidenceBands(raceData, T, n, 15);
  const diff = computeDifferential(segmentSeconds);

  const gaps = segmentSeconds.map((actual, i) => ({
    segment: eventMeta.segments[i].label,
    actual,
    model: model.splits[i],
    gap: actual - model.splits[i],
    pctActual: (actual / T) * 100,
    pctModel: model.pcts[i],
  }));

  const flags = [];
  if (bands.low && bands.high) {
    gaps.forEach((g, i) => {
      const low = bands.low[i];
      const high = bands.high[i];
      if (low == null || high == null) return;
      if (g.actual < low) flags.push({ segment: g.segment, type: 'below', low, high, actual: g.actual });
      if (g.actual > high) flags.push({ segment: g.segment, type: 'above', low, high, actual: g.actual });
    });
  }

  const mid = Math.floor(n / 2);
  const firstPct = (segmentSeconds.slice(0, mid).reduce((a, b) => a + b, 0) / T) * 100;
  let shape = 'mixed';
  if (firstPct < 48) shape = 'front_loaded';
  else if (firstPct > 52) shape = 'back_loaded';
  else shape = 'even';

  const projection = computePacingUpsideProjection(gaps, T);

  return {
    total: T,
    model,
    bands,
    diff,
    gaps,
    flags,
    shape,
    firstHalfPct: firstPct,
    projection,
    velocities: eventMeta.segments.map((seg, i) =>
      segmentSeconds[i] > 0 ? seg.distance / segmentSeconds[i] : 0
    ),
    modelVelocities: model.velocities,
  };
}

/**
 * Illustrative “what if pacing matched the reference better” — not additive with other gains.
 * slowSlack = total seconds slower than model in segments where gap > 0 (equals fast “bank” at same total T).
 */
export function computePacingUpsideProjection(gaps, totalSeconds) {
  const slowSlack = gaps.reduce((s, g) => s + Math.max(0, g.gap), 0);
  const fastBank = gaps.reduce((s, g) => s + Math.max(0, -g.gap), 0);
  const cap = Math.min(totalSeconds * 0.06, slowSlack * 0.55);
  const low = slowSlack < 0.005 ? 0 : Math.min(slowSlack * 0.12, cap);
  const high = slowSlack < 0.005 ? 0 : Math.min(slowSlack * 0.38, cap);
  const mid = (low + high) / 2;
  return {
    slowSlackSeconds: slowSlack,
    fastBankSeconds: fastBank,
    illustrativeLow: low,
    illustrativeMid: mid,
    illustrativeHigh: high,
    /** Plain-language for exports / UI */
    blurb: `About ${slowSlack.toFixed(2)}s of your race was “slower than the reference” in the segments where you were behind the curve (you were about that much “faster than reference” elsewhere — same finish time). If better pacing recovered part of that without losing your strong parts, a rough band is ~${low.toFixed(2)}–${high.toFixed(2)}s faster. Not guaranteed — video marks are approximate.`,
  };
}

export function formatAnalysisSummary(result, eventMeta, formatTimeUnit = 'seconds') {
  if (result.error) return result.error;
  const lines = [
    `${eventMeta.name} — total ${formatTime(result.total, formatTimeUnit)}`,
    `Model tier: ${result.model.level}`,
    `Half-race differential: ${result.diff != null ? `${result.diff > 0 ? '+' : ''}${result.diff.toFixed(2)}s` : '—'}`,
    `Shape (by first-half % of time): ${result.shape} (~${result.firstHalfPct.toFixed(1)}% in first half)`,
    '',
    'Segment gaps (you − model, seconds):',
    ...result.gaps.map(g => `  ${g.segment}: ${g.gap > 0 ? '+' : ''}${g.gap.toFixed(3)}`),
  ];
  if (result.flags.length) {
    lines.push('', 'Outside typical range (±1 SD near your time):');
    result.flags.forEach(f => {
      lines.push(
        `  ${f.segment}: ${f.type} band (${f.low.toFixed(2)}–${f.high.toFixed(2)}), you ${f.actual.toFixed(2)}`
      );
    });
  }
  if (result.projection) {
    const p = result.projection;
    lines.push(
      '',
      'Pacing upside (illustrative vs reference curve):',
      `  Total “slow vs reference” in positive-gap segments: ${p.slowSlackSeconds.toFixed(3)}s`,
      `  Rough band if pacing moves closer to reference: ~${p.illustrativeLow.toFixed(2)}–${p.illustrativeHigh.toFixed(2)}s faster (not guaranteed; video marks are approximate).`
    );
  }
  return lines.join('\n');
}
