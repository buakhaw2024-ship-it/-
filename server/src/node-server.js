// node-server.js — plain Node (no deps) fallback for the 谈判博弈 AI 代理.
// Same contract as the Cloudflare Worker, for people who'd rather run Node.
//
//   OPENROUTER_API_KEY=sk-or-... node src/node-server.js
//   (listens on PORT, default 8787 — matches the game's default endpoint)

import http from 'node:http';
import { handleAiRequest } from './ai-logic.js';

const PORT = process.env.PORT || 8787;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (req.method === 'GET') {
    return send(res, 200, { ok: true, service: 'negotiation-ai-proxy', endpoint: '/api/ai/negotiation-turn' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method Not Allowed' });
  if (!(req.url === '/' || req.url.endsWith('/api/ai/negotiation-turn'))) {
    return send(res, 404, { error: 'Not Found', hint: 'POST /api/ai/negotiation-turn' });
  }

  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    let body;
    try { body = JSON.parse(raw || '{}'); }
    catch (_) { return send(res, 400, { error: 'Invalid JSON body' }); }
    const cfg = {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || undefined,
      baseUrl: process.env.OPENROUTER_BASE_URL || undefined,
      referer: process.env.PUBLIC_ORIGIN || undefined,
      providerLabel: 'OpenRouter',
    };
    try {
      const result = await handleAiRequest(body, cfg);
      send(res, 200, result);
    } catch (err) {
      send(res, err && err.status ? err.status : 502, { error: String(err && err.message || err) });
    }
  });
});

server.listen(PORT, () => {
  console.log('谈判博弈 AI 代理 (Node) → http://localhost:' + PORT + '/api/ai/negotiation-turn');
  if (!process.env.OPENROUTER_API_KEY) console.warn('⚠️  未设置 OPENROUTER_API_KEY，请求会返回 500（游戏会自动回退本地话术）。');
});
