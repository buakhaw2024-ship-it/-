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


// ---- task: generate_opponent_beat (动态对手台词, 记忆+抓软肋) ----
const BEAT_SCHEMA = { type: 'object', properties: { beat: { type: 'string' } }, required: ['beat'], additionalProperties: false };
async function genOpponentBeat(body) {
  const sys = '你扮演谈判对手，用其口吻。这是实时博弈:直接回应玩家刚说的话(playerLine)，结合当前局势(env/指标)与历史(recent)，针对其弱项(weak)反击，可引用之前交手。1-2句、不超过55字、中文、像真人即兴交锋。';
  const user = '上下文：' + JSON.stringify(body) + '\n只生成对手这一回合的台词。';
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 300, system: sys,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: BEAT_SCHEMA } },
  });
  return JSON.parse(msg.content.find((b) => b.type === 'text').text); // { beat }
}

// ---- task: generate_act_twist (剧情微事件/转折) ----
const TWIST_SCHEMA = { type: 'object', properties: { twist: { type: 'string' } }, required: ['twist'], additionalProperties: false };
async function genActTwist(body) {
  const sys = '你是剧情导演。为这一幕谈判注入一个简短情境转折(新约束/第三方介入/突发消息)，增加张力但不改变胜负规则。一句、不超过40字、中文。';
  const user = '上下文：' + JSON.stringify(body) + '\n只生成本幕开场的情境转折。';
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 200, system: sys,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TWIST_SCHEMA } },
  });
  return JSON.parse(msg.content.find((b) => b.type === 'text').text); // { twist }
}


// ---- task: generate_coach_note (针对玩家这句话的实时复盘) ----
const COACH_SCHEMA = { type: 'object', properties: { review: { type: 'string' }, better: { type: 'string' } }, required: ['review', 'better'], additionalProperties: false };
async function genCoachNote(body) {
  const sys = '你是谈判教练。针对玩家刚说的这句话(playerLine)，结合当前局势(env)与对手上一句(priorBeat)，简评其得失(为何加分/丢分)，并给一句更优说法。中文、犀利具体。';
  const user = '上下文：' + JSON.stringify(body) + '\n只点评玩家这句的得失并给更优说法。';
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 300, system: sys,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: COACH_SCHEMA } },
  });
  return JSON.parse(msg.content.find((b) => b.type === 'text').text); // { review, better }
}

app.post('/api/ai/negotiation-turn', async (req, res) => {
  const body = req.body || {};
  try {
    let out;
    switch (body.task) {
      case 'rewrite_response_options': out = await rewriteOptions(body); break;
      case 'generate_opponent_beat':   out = await genOpponentBeat(body); break;
      case 'generate_act_twist':       out = await genActTwist(body); break;
      case 'generate_coach_note':      out = await genCoachNote(body); break;
      default:                         out = await negotiationTurn(body);
    }
    res.json(out);
  } catch (e) {
    console.error('[LLM backend error]', e && e.message ? e.message : e);
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`LLM backend on http://localhost:${PORT}/api/ai/negotiation-turn`));
