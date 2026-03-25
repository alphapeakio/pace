/**
 * POST /api/share — body JSON { html: string } → { id, viewUrl }
 * GET  /s/:uuid — returns stored HTML
 */

const MAX_HTML_CHARS = 12_000_000;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function cors(res) {
  const h = new Headers(res.headers);
  Object.entries(corsHeaders()).forEach(([k, v]) => h.set(k, v));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function json(data, status = 200) {
  return cors(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/api/share' && request.method === 'POST') {
      return handleCreateShare(request, env, url);
    }

    const m = url.pathname.match(/^\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (m && request.method === 'GET') {
      return handleGetShare(env, m[1]);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders() });
  },
};

async function handleCreateShare(request, env, url) {
  if (!env.DB) {
    return json({ error: 'D1 binding DB is not configured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const html = body?.html;
  if (typeof html !== 'string') {
    return json({ error: 'Expected { html: string }' }, 400);
  }
  if (html.length === 0) {
    return json({ error: 'html must be non-empty' }, 400);
  }
  if (html.length > MAX_HTML_CHARS) {
    return json({ error: `html exceeds ${MAX_HTML_CHARS} characters` }, 413);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(
      'INSERT INTO share_sessions (id, html, created_at) VALUES (?, ?, ?)',
    )
      .bind(id, html, createdAt)
      .run();
  } catch (e) {
    console.error('D1 insert failed', e);
    return json({ error: 'Failed to save share' }, 500);
  }

  const origin = String(env.SHARE_PUBLIC_ORIGIN || url.origin).replace(/\/$/, '');
  const viewUrl = `${origin}/s/${id}`;
  return json({ id, viewUrl, createdAt });
}

async function handleGetShare(env, id) {
  if (!env.DB) {
    return new Response('Server misconfigured', { status: 500, headers: corsHeaders() });
  }

  let row;
  try {
    row = await env.DB.prepare('SELECT html FROM share_sessions WHERE id = ?').bind(id).first();
  } catch (e) {
    console.error('D1 select failed', e);
    return new Response('Database error', { status: 500, headers: corsHeaders() });
  }

  if (!row?.html) {
    return new Response('Not found', { status: 404, headers: corsHeaders() });
  }

  return new Response(row.html, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, max-age=120',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
