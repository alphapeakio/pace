/**
 * Generalized pacing model engine.
 * Works with any number of segments. Supports interpolation,
 * confidence bands, and database ranking.
 */
import { stdDev, lerp } from './utils.js';

/**
 * Get pacing model for a given target time.
 * Uses smooth interpolation between performance tiers.
 *
 * @param {Object} pacingModels - { male: [...], female: [...] } with pcts arrays
 * @param {string} gender - 'male' or 'female'
 * @param {number} targetTime - target time in seconds
 * @param {Object} eventMeta - event metadata with segments array
 * @returns {Object} { pcts, splits, velocities, level, tierIndex }
 */
export function getPacingModel(pacingModels, gender, targetTime, eventMeta) {
  const models = pacingModels[gender];
  if (!models || models.length === 0) {
    // Fallback: even split
    const n = eventMeta.segments.length;
    const evenPct = 100 / n;
    return {
      pcts: Array(n).fill(evenPct),
      splits: Array(n).fill(targetTime / n),
      velocities: eventMeta.segments.map((seg, i) => seg.distance / (targetTime / n)),
      level: 'Estimated',
      tierIndex: -1,
    };
  }

  // Sort models by target time ascending (fastest first)
  const sorted = [...models].sort((a, b) => a.targetTime - b.targetTime);

  let upper, lower, upperIdx, lowerIdx;

  // Find bracketing tiers
  if (targetTime <= sorted[0].targetTime) {
    upper = sorted[0]; lower = sorted[0];
    upperIdx = 0; lowerIdx = 0;
  } else if (targetTime >= sorted[sorted.length - 1].targetTime) {
    upper = sorted[sorted.length - 1]; lower = sorted[sorted.length - 1];
    upperIdx = sorted.length - 1; lowerIdx = sorted.length - 1;
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      if (targetTime >= sorted[i].targetTime && targetTime <= sorted[i + 1].targetTime) {
        upper = sorted[i];
        lower = sorted[i + 1];
        upperIdx = i;
        lowerIdx = i + 1;
        break;
      }
    }
  }

  // Interpolation parameter
  let t = 0;
  if (upper !== lower && lower.targetTime !== upper.targetTime) {
    t = (targetTime - upper.targetTime) / (lower.targetTime - upper.targetTime);
  }

  // Interpolate percentages
  const numSegments = Math.min(upper.pcts.length, lower.pcts.length);
  const pcts = [];
  for (let i = 0; i < numSegments; i++) {
    pcts.push(lerp(upper.pcts[i], lower.pcts[i], t));
  }

  // Normalize percentages to sum to 100
  const pctSum = pcts.reduce((s, p) => s + p, 0);
  if (pctSum > 0 && Math.abs(pctSum - 100) > 0.01) {
    const scale = 100 / pctSum;
    for (let i = 0; i < pcts.length; i++) pcts[i] *= scale;
  }

  // Calculate splits and velocities
  const splits = pcts.map(p => targetTime * p / 100);
  const velocities = eventMeta.segments.map((seg, i) =>
    splits[i] > 0 ? seg.distance / splits[i] : 0
  );

  // Determine level label
  const level = t < 0.5 ? upper.level : lower.level;

  return { pcts, splits, velocities, level, tierIndex: t < 0.5 ? upperIdx : lowerIdx };
}

/**
 * Compute confidence bands from database entries near the target time.
 *
 * @param {Array} raceData - array of race entries with splits arrays
 * @param {number} targetTime - target time
 * @param {number} numSegments - number of segments
 * @param {number} windowPct - percentage window around target time (default 10%)
 * @returns {Object} { low: [...], high: [...], sampleSize }
 */
export function getConfidenceBands(raceData, targetTime, numSegments, windowPct = 15) {
  const window = targetTime * windowPct / 100;
  const nearby = raceData.filter(r =>
    r.time && Math.abs(r.time - targetTime) <= window &&
    r.splits && r.splits.length >= numSegments &&
    r.splits.every(s => s != null)
  );

  if (nearby.length < 3) {
    return { low: null, high: null, sampleSize: nearby.length };
  }

  const low = [];
  const high = [];

  for (let i = 0; i < numSegments; i++) {
    const segSplits = nearby.map(r => r.splits[i]);
    const mean = segSplits.reduce((s, v) => s + v, 0) / segSplits.length;
    const sd = stdDev(segSplits);
    low.push(mean - sd);
    high.push(mean + sd);
  }

  return { low, high, sampleSize: nearby.length };
}

/**
 * Compute where a target time ranks in the database.
 *
 * @param {Array} raceData - array of race entries
 * @param {number} targetTime - target time
 * @returns {Object} { percentile, rank, total, nearestAthletes }
 */
export function getDatabaseRanking(raceData, targetTime) {
  const validTimes = raceData.filter(r => r.time).sort((a, b) => a.time - b.time);
  const total = validTimes.length;

  if (total === 0) return { percentile: null, rank: null, total: 0, nearestAthletes: [] };

  // Count how many are faster
  const fasterCount = validTimes.filter(r => r.time < targetTime).length;
  const percentile = ((total - fasterCount) / total * 100);
  const rank = fasterCount + 1;

  // Find nearest athletes
  const sorted = validTimes
    .map(r => ({ ...r, delta: Math.abs(r.time - targetTime) }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);

  return {
    percentile: Math.round(percentile),
    rank,
    total,
    nearestAthletes: sorted.map(r => ({
      athlete: r.athlete,
      time: r.time,
      comp: r.comp,
      delta: r.delta,
    })),
  };
}

/**
 * Compute the differential (second half minus first half).
 * Works for events where the race naturally splits into two halves.
 */
export function computeDifferential(splits) {
  if (!splits || splits.length < 2) return null;
  const mid = Math.floor(splits.length / 2);
  const firstHalf = splits.slice(0, mid).reduce((s, v) => s + (v || 0), 0);
  const secondHalf = splits.slice(mid).reduce((s, v) => s + (v || 0), 0);
  return secondHalf - firstHalf;
}
