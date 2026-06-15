/*
 * 谈判博弈 · LLM 代理后端 (Node + 官方 Anthropic SDK)
 * 客户端默认请求: POST http://localhost:8787/api/ai/negotiation-turn
 * 同一端点按 body.task 分流:
 *   - task === 'rewrite_response_options' → 改写回应选项(本次新增)
 *   - 其他(无 task)→ 你原来的"对手回应+教练反馈"(这里给了可跑的实现, 可替换成你已有逻辑)
 *
 * 安装:  npm i express cors @anthropic-ai/sdk
 * 运行:  ANTHROPIC_API_KEY=sk-ant-... node server.mjs
 */
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(cors());                 // 允许 file:// / 任意来源(本地工具); 生产可收紧 origin
app.use(express.json({ limit: '1mb' }));

const client = new Anthropic();  // 读取 ANTHROPIC_API_KEY
const MODEL = process.env.LLM_MODEL || 'claude-opus-4-8';  // 想更快更省可设 claude-haiku-4-5

// ---- task: rewrite_response_options ----
const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string' }, text: { type: 'string' } },
        required: ['key', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['options'],
  additionalProperties: false,
};

async function rewriteOptions(body) {
  const opponentLine = String(body.opponentLine || '').slice(0, 400);
  const options = Array.isArray(body.options) ? body.options : [];
  if (!opponentLine || !options.length) return { options: [] };

  const list = options
    .map((o) => `- key=${o.key} 策略=${o.strategy || o.skill || o.key} 原话术=${o.sample || ''}`)
    .join('\n');

  const system =
    '你是资深谈判教练。给定对手刚说的话，以及若干"回应策略选项"，' +
    '把每个选项的示范话术改写成"直接回应对手这句话"的一句中文。' +
    '必须保持每个选项原本的策略意图与语气风格(锚定仍锚定、提问仍提问)，' +
    '只让语言和语境贴合对手当前台词，每条不超过40字，口语自然、可直接说出口。';

  const user =
    `对手刚说：${opponentLine}\n\n需要改写的回应选项：\n${list}\n\n` +
    `为每个 key 各生成一句改写后的中文话术(保持原策略意图)。`;

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: {
      effort: 'low',                                   // 快速改写, 控延迟/成本
      format: { type: 'json_schema', schema: REWRITE_SCHEMA },
    },
  });
  const text = msg.content.find((b) => b.type === 'text');
  return JSON.parse(text.text);                         // { options: [{key,text}, ...] }
}

// ---- 既有: 对手回应 + 教练反馈 (返回 normalizeResult 期望的字段) ----
const TURN_SCHEMA = {
  type: 'object',
  properties: {
    opponentResponse: { type: 'string' },
    opponentHearing: { type: 'string' },
    coachNote: { type: 'string' },
    betterNextMove: { type: 'string' },
    riskSignal: { type: 'string' },
    pressureLevel: { type: 'integer' },
  },
  required: ['opponentResponse', 'coachNote', 'pressureLevel'],
  additionalProperties: false,
};

async function negotiationTurn(body) {
  const system =
    '你是谈判对手扮演者+教练。根据玩家这一手的选择与历史，生成对手的回应(opponentResponse,<=80字)、' +
    '对手真实意图(opponentHearing)、教练点评(coachNote)、更优下一手(betterNextMove)、风险信号(riskSignal)、' +
    '以及压力等级 pressureLevel(1-5 整数)。中文。';
  const user = '【本回合上下文】\n' + JSON.stringify(body, null, 2) + '\n\n只生成本回合内容。';
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TURN_SCHEMA } },
  });
  const text = msg.content.find((b) => b.type === 'text');
  return JSON.parse(text.text);
}

app.post('/api/ai/negotiation-turn', async (req, res) => {
  const body = req.body || {};
  try {
    const out = body.task === 'rewrite_response_options'
      ? await rewriteOptions(body)
      : await negotiationTurn(body);
    res.json(out);
  } catch (e) {
    console.error('[LLM backend error]', e && e.message ? e.message : e);
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`LLM backend on http://localhost:${PORT}/api/ai/negotiation-turn`));
