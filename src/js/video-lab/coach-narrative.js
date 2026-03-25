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
  const top = sorted[0];
  const p = result.projection;

  const p1 = `${name} — ${ev} (${genderLabel}). Finish time from your marks is about ${t} seconds. The orange line on the chart is you; the dashed line is the reference curve for that same speed (${tier}). It is a shape guide, not a score.`;

  let p2 =
    top && Math.abs(top.gap) > 0.02
      ? `The biggest gap is ${top.segment}: you were about ${Math.abs(top.gap).toFixed(2)} seconds ${top.gap > 0 ? 'slower' : 'faster'} than the reference there.`
      : `Your splits are already very close to the reference in every segment.`;

  let p3 = '';
  if (p && p.slowSlackSeconds >= 0.005) {
    p3 = `Rough upside if pacing hugged the reference better on the slow parts (without losing your fast parts): on the order of ${p.illustrativeLow.toFixed(2)} to ${p.illustrativeHigh.toFixed(2)} seconds faster. That is only an estimate from these marks, not a promise.`;
  } else {
    p3 = 'There is little “slow vs reference” left in the splits — the next gains are more about fitness and race execution than small shape fixes.';
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
              'You are a track coach. Use simple words. Exactly 3 short paragraphs, separated by blank lines. No markdown. Mention numbers from the JSON. Say estimates are uncertain.',
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
