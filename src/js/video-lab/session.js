/**
 * Session state + derived split math for Video Lab.
 */

/** @typedef {'scale' | 'raw'} ReconcileMode */

export function createEmptySession() {
  return {
    file: null,
    objectUrl: null,
    eventId: null,
    gender: 'male',
    tGun: null,
    /**
     * Seconds of race that already elapsed before the frame you used as “gun”
     * (e.g. recording started late). Effective gun time = tGun - missedHeadSeconds.
     */
    missedHeadSeconds: 0,
    /** Video `currentTime` at end of each segment (same length as segments) */
    segmentEndVideoTimes: [],
    /** Official finish time (seconds), optional override */
    officialTime: null,
    /** @type {ReconcileMode} */
    reconcileMode: 'scale',
    athleteLabel: '',
  };
}

/**
 * Video timeline time treated as race t=0 for clock + split math.
 */
export function getEffectiveGun(session) {
  if (session.tGun == null) return null;
  const h = Math.max(0, Number(session.missedHeadSeconds) || 0);
  const capped = Math.min(h, session.tGun);
  return session.tGun - capped;
}

/**
 * Raw segment durations from gun and per-segment end marks (seconds).
 */
export function rawSegmentDurations(tGun, segmentEndVideoTimes) {
  const d = [];
  let prev = tGun;
  for (const t of segmentEndVideoTimes) {
    d.push(t - prev);
    prev = t;
  }
  return d;
}

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * Video-implied total from gun to last segment end.
 */
export function videoTotalTime(tGun, segmentEndVideoTimes) {
  if (!segmentEndVideoTimes.length) return 0;
  return segmentEndVideoTimes[segmentEndVideoTimes.length - 1] - tGun;
}

/** Total race time from effective gun to last mark. */
export function raceTotalFromSession(session) {
  const g = getEffectiveGun(session);
  if (g == null) return 0;
  return videoTotalTime(g, session.segmentEndVideoTimes);
}

/**
 * Final segment seconds used for analysis.
 */
export function finalSegmentSeconds(session, numSegments) {
  const { segmentEndVideoTimes, officialTime, reconcileMode } = session;
  const tGun = getEffectiveGun(session);
  if (segmentEndVideoTimes.length !== numSegments || tGun == null) return null;
  const raw = rawSegmentDurations(tGun, segmentEndVideoTimes);
  const s = sum(raw);
  if (s <= 0) return null;
  if (officialTime != null && officialTime > 0 && Math.abs(officialTime - s) > 0.01) {
    if (reconcileMode === 'scale') {
      const k = officialTime / s;
      return raw.map(x => x * k);
    }
    return raw;
  }
  return raw;
}

export function analysisTotalTime(session, numSegments) {
  const d = finalSegmentSeconds(session, numSegments);
  if (!d) return null;
  return sum(d);
}
