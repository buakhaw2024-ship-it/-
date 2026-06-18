// worker.js — Cloudflare Worker entry for 谈判博弈 AI 代理。
//
// `wrangler dev` serves this on http://localhost:8787 by default, which is
// exactly the game's DEFAULT_ENDPOINT — so 后端安全模式 works with zero config.
// For production: `wrangler deploy`, then point the game's 后端接口 at the
// deployed URL (…/api/ai/negotiation-turn).
//
// Secret:   wrangler secret put OPENROUTER_API_KEY
// Var:      OPENROUTER_MODEL (optional, see wrangler.toml)

import { handleAiRequest } from './ai-logic.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);
    // health check
    if (request.method === 'GET') {
      return json({ ok: true, service: 'negotiation-ai-proxy', endpoint: '/api/ai/negotiation-turn' });
    }
    if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
    // accept the documented path, or root (single-purpose worker)
    if (!(url.pathname === '/' || url.pathname.endsWith('/api/ai/negotiation-turn'))) {
      return json({ error: 'Not Found', hint: 'POST /api/ai/negotiation-turn' }, 404);
    }

    let body;
    try { body = await request.json(); }
    catch (_) { return json({ error: 'Invalid JSON body' }, 400); }

    const cfg = {
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || undefined,
      baseUrl: env.OPENROUTER_BASE_URL || undefined,
      referer: env.PUBLIC_ORIGIN || undefined,
      providerLabel: 'OpenRouter',
    };
    try {
      const result = await handleAiRequest(body, cfg);
      return json(result);
    } catch (err) {
      // The game already degrades to local 话术 on non-2xx, so a clean error
      // status here just means "use local"; we still log for debugging.
      const status = err && err.status ? err.status : 502;
      return json({ error: String(err && err.message || err) }, status);
    }
  },
};
