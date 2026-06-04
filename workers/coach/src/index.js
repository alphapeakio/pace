/**
 * POST JSON body: { context: PaceLabCoachContext }
 * Response: { narrative: string }
 *
 * Optional: header X-Coach-Key must match env.COACH_SHARED_SECRET if set.
 */

const MODEL = '@cf/meta/llama-3-8b-instruct';

const SYSTEM = `You are a track coach. The athlete has a Pace Lab pacing report (JSON).

Output exactly 3 short paragraphs, separated by one blank line. No markdown, bullets, or hashtags.

Tone: direct and factual. No fluff, no motivational filler, no “great job” unless the data clearly supports it.

Paragraph 1: Their time, model tier, and what the reference curve represents (shape at that speed — not a grade).

Paragraph 2: Use ONLY the array coachTopGapsByMagnitude (1–2 entries), sorted by largest magnitude. Each entry has gapYouMinusModelSeconds, magnitudeSeconds, and athleteWas. Rules: athleteWas faster_than_reference means they ran that segment faster (lower time) than the reference — say “faster,” not slower. slower_than_reference means they took longer in that segment. about_even_with_reference means roughly matched. Never describe a faster_than_reference segment as slower. Follow gapConvention in the JSON for sign meaning. Quote magnitudes as “about X s.”

Paragraph 3: If pacing upside numbers exist, give the rough range in plain words and one line that it is an estimate from marks/video, not a promise. If upside is negligible, say so briefly.

Do not diagnose injury or prescribe training load.`;

function corsHeaders(origin) {
  const allow = origin || '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Coach-Key',
    'Access-Control-Max-Age': '86400',
  };
}

function extractText(aiResult) {
  if (aiResult == null) return '';
  if (typeof aiResult === 'string') return aiResult;
  if (typeof aiResult.response === 'string') return aiResult.response;
  if (Array.isArray(aiResult.response)) {
    return aiResult.response.map(x => (typeof x === 'string' ? x : x?.text ?? '')).join('');
  }
  const r = aiResult.result;
  if (r && typeof r.response === 'string') return r.response;
  return '';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Use POST with { context }' }), {
        status: 405,
        headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const secret = env.COACH_SHARED_SECRET;
    if (secret) {
      const key = request.headers.get('X-Coach-Key');
      if (key !== secret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
        });
      }
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const context = body.context ?? body;
    const userContent = `Pace Lab analysis (JSON). Use only this data:\n${JSON.stringify(context)}`;

    let narrative = '';
    try {
      const out = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent },
        ],
        max_tokens: 512,
      });
      narrative = extractText(out).trim();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Workers AI error', detail: String(e?.message || e) }),
        { status: 500, headers: { 'content-type': 'application/json', ...corsHeaders(origin) } }
      );
    }

    if (!narrative) {
      return new Response(JSON.stringify({ error: 'Empty model output' }), {
        status: 502,
        headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify({ narrative }), {
      headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
    });
  },
};
