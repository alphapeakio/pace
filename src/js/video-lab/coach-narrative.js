/**
 * Coach narrative: Workers AI (Cloudflare) + optional generic API + dev OpenAI proxy.
 * Context mirrors Pace Lab tables: segments, gaps, flags, typical bands, projection.
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** gap = your split seconds − reference split seconds (same convention as result.gaps). */
const GAP_CONVENTION =
  'Each gap is (your segment time in seconds) minus (reference segment time at the same finish speed). Positive = you were slower in that segment (longer time). Negative = you were faster (shorter time).';

/**
 * Top N segments by |gap| with explicit faster/slower for coach copy (avoids LLM sign errors).
 * @param {Array<{ segment: string, gap: number }>} gaps
 * @param {number} n
 */
function coachTopGapsByMagnitude(gaps, n = 2) {
  const EPS = 0.005;
  return [...gaps]
    .map(g => {
      const gap = g.gap;
      let athleteWas;
      if (gap > EPS) athleteWas = 'slower_than_reference';
      else if (gap < -EPS) athleteWas = 'faster_than_reference';
      else athleteWas = 'about_even_with_reference';
      return {
        segment: g.segment,
        gapYouMinusModelSeconds: Number(gap.toFixed(4)),
        athleteWas,
        magnitudeSeconds: Number(Math.abs(gap).toFixed(4)),
      };
    })
    .sort((a, b) => b.magnitudeSeconds - a.magnitudeSeconds)
    .slice(0, n);
}

/**
 * Full structured context for Workers AI / other coach endpoints (Pace Lab section data).
 */
export function buildPaceLabCoachContext(result, eventMeta, athleteLabel, genderLabel) {
  if (result.error) return { error: result.error };

  const segments = eventMeta.segments.map((seg, i) => {
    const g = result.gaps[i];
    const low = result.bands?.low?.[i];
    const high = result.bands?.high?.[i];
    return {
      label: seg.label,
      distanceM: seg.distance,
      youSeconds: g ? Number(g.actual.toFixed(4)) : null,
      modelSeconds: g ? Number(g.model.toFixed(4)) : null,
      gapYouMinusModelSeconds: g ? Number(g.gap.toFixed(4)) : null,
      yourPctOfTotal: g ? Number(g.pctActual.toFixed(2)) : null,
      modelPctOfTotal: g ? Number(g.pctModel.toFixed(2)) : null,
      typicalBandSeconds:
        low != null && high != null
          ? { low: Number(low.toFixed(3)), high: Number(high.toFixed(3)) }
          : null,
    };
  });

  return {
    app: 'Pace Lab — Video / pace upload',
    gapConvention: GAP_CONVENTION,
    coachTopGapsByMagnitude: coachTopGapsByMagnitude(result.gaps, 2),
    event: {
      name: eventMeta.name,
      totalDistanceM: eventMeta.distance,
      timeUnit: eventMeta.timeUnit || 'seconds',
    },
    athleteLabel: athleteLabel?.trim() || null,
    gender: genderLabel,
    summary: {
      totalSeconds: Number(result.total.toFixed(4)),
      modelTier: result.model.level,
      shape: result.shape,
      firstHalfPercentOfTime: result.firstHalfPct != null ? Number(result.firstHalfPct.toFixed(2)) : null,
      halfDifferentialSeconds: result.diff != null ? Number(result.diff.toFixed(4)) : null,
    },
    segments,
    flagsVsTypicalBand: (result.flags || []).map(f => ({
      segment: f.segment,
      vsBand: f.type === 'below' ? 'faster_than_typical' : 'slower_than_typical',
      bandLow: f.low != null ? Number(f.low.toFixed(3)) : null,
      bandHigh: f.high != null ? Number(f.high.toFixed(3)) : null,
      youSeconds: f.actual != null ? Number(f.actual.toFixed(3)) : null,
    })),
    pacingUpsideIllustrative: result.projection
      ? {
          totalSlowVsReferenceSeconds: Number(result.projection.slowSlackSeconds.toFixed(4)),
          roughFasterBandLowSeconds: Number(result.projection.illustrativeLow.toFixed(4)),
          roughFasterBandHighSeconds: Number(result.projection.illustrativeHigh.toFixed(4)),
          explanation: result.projection.blurb,
        }
      : null,
  };
}

/**
 * Short, plain fallback when no LLM (2–3 paragraphs).
 */
export function buildHeuristicCoachNarrative(result, eventMeta, athleteLabel, genderLabel) {
  if (result.error) return result.error;
  const name = athleteLabel?.trim() || 'You';
  const ev = eventMeta.name;
  const t = result.total.toFixed(2);
  const tier = result.model.level;
  const sorted = [...result.gaps].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const notable = sorted.filter(g => Math.abs(g.gap) > 0.02);
  const p = result.projection;

  const p1 = `${name}, ${ev} (${genderLabel}): ~${t} s total. Model tier at that time: ${tier}. Chart: solid = you, dashed = reference shape at the same finish speed.`;

  const fmtGap = g =>
    `${g.segment}: about ${Math.abs(g.gap).toFixed(2)} s ${g.gap > 0 ? 'slower' : 'faster'} than reference`;
  let p2;
  if (notable.length === 0) {
    p2 = 'Splits are close to the reference in every segment.';
  } else if (notable.length === 1) {
    p2 = `Largest deviation: ${fmtGap(notable[0])}.`;
  } else {
    p2 = `Largest deviations vs reference: ${fmtGap(notable[0])}; ${fmtGap(notable[1])}.`;
  }

  let p3 = '';
  if (p && p.slowSlackSeconds >= 0.005) {
    p3 = `Rough upside if slow segments matched the reference better: ~${p.illustrativeLow.toFixed(2)}–${p.illustrativeHigh.toFixed(2)} s. Estimate only.`;
  } else {
    p3 = 'Little room left vs the reference on shape — focus on fitness and execution.';
  }

  return [p1, p2, p3].join('\n\n');
}

async function fetchWorkersCoach(workerBaseUrl, context, extraHeaders = {}) {
  const base = workerBaseUrl.replace(/\/$/, '');
  const url = base.includes('/coach') ? base : `${base}`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify({ context }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const t = j.narrative || j.text || j.message;
    return typeof t === 'string' && t.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}

async function fetchOpenAIViaDevProxy(context) {
  try {
    const r = await fetch('/__openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a track coach. Be direct and short: exactly 3 brief paragraphs, blank line between. No filler or pep talk, no markdown. Use numbers from the JSON. Gaps: positive gapYouMinusModelSeconds = athlete slower in that segment; negative = faster. For paragraph 2, use coachTopGapsByMagnitude and respect athleteWas (faster_than_reference vs slower_than_reference) — never call a faster segment slower. One sentence on upside if present; say estimate only.',
          },
          {
            role: 'user',
            content: `Pace Lab context JSON:\n${JSON.stringify(context)}`,
          },
        ],
        max_tokens: 450,
        temperature: 0.65,
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function fetchRemoteCoachApi(url, context) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const t = j.narrative || j.text || j.message;
    return typeof t === 'string' && t.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}

/**
 * @returns {{ paragraphs: string[], source: 'workers-ai' | 'llm' | 'heuristic' }}
 */
export async function resolveCoachNarrative(result, eventMeta, athleteLabel, genderLabel) {
  if (result.error) {
    return { paragraphs: [result.error], source: 'heuristic' };
  }

  const context = buildPaceLabCoachContext(result, eventMeta, athleteLabel, genderLabel);
  const workersUrl = import.meta.env.VITE_COACH_WORKER_URL;
  const shared = import.meta.env.VITE_COACH_SHARED_KEY;
  const headers = shared ? { 'X-Coach-Key': shared } : {};

  let llmText = null;
  let source = 'heuristic';

  if (workersUrl) {
    llmText = await fetchWorkersCoach(workersUrl, context, headers);
    if (llmText) source = 'workers-ai';
  }
  if (!llmText) {
    const generic = import.meta.env.VITE_PACE_COACH_API;
    if (generic) {
      llmText = await fetchRemoteCoachApi(generic, context);
      if (llmText) source = 'llm';
    }
  }
  if (!llmText && import.meta.env.DEV) {
    llmText = await fetchOpenAIViaDevProxy(context);
    if (llmText) source = 'llm';
  }

  if (llmText) {
    const parts = llmText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(Boolean);
    return { paragraphs: parts.length ? parts : [llmText], source };
  }

  const h = buildHeuristicCoachNarrative(result, eventMeta, athleteLabel, genderLabel);
  return {
    paragraphs: h.split(/\n\n+/).map(p => p.trim()).filter(Boolean),
    source: 'heuristic',
  };
}

export function narrativeParagraphsToHtml(paragraphs) {
  return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

export { escapeHtml };
