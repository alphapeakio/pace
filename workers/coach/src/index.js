/**
 * POST JSON body: { context: PaceLabCoachContext }
 * Response: { narrative: string }
 *
 * Optional: header X-Coach-Key must match env.COACH_SHARED_SECRET if set.
 */

const MODEL = '@cf/meta/llama-3-8b-instruct';

const SYSTEM = `You are a track coach helping an athlete understand a pacing report from Pace Lab (AlphaPeak).

Rules:
- Use plain English. Short sentences. No markdown, no bullet symbols, no hashtags.
- Write exactly 3 short paragraphs separated by a blank line.
- Paragraph 1: what the numbers mean (their time vs the reference model for that event).
- Paragraph 2: the 1–2 segments that stand out most vs the model (faster or slower) and what that usually means in plain terms.
- Paragraph 3: the "pacing upside" numbers if provided — say they are rough estimates, not promises, and that video timing is imperfect.
- Be encouraging. Do not diagnose injury or overtrain.`;

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
