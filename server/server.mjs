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
  const sys = '你扮演谈判对手，用其口吻。这是实时博弈:直接回应玩家刚说的话(playerLine)，结合当前局势(env/指标)与历史(recent)，针对其弱项(weak)反击，可引用之前交手。' +
    '若给了 persona(人物属性:风格/招式/软肋/语气voiceStyle/场景词sceneLexicon/禁用词bannedWords)，须贴合其语气、多用场景词、禁用违禁词与现代黑话，并符合谈判原则(锚定/BATNA/聚焦利益/让步必换取/制造期限/护面子)。' +
    '务必每次措辞都不同、避免套路与口头禅复读，像真人即兴交锋、生动具体。1-2句、不超过55字、中文。';
  const user = '上下文：' + JSON.stringify(body) + '\n(seed 仅用于让表达不雷同，不要读出)\n只生成对手这一回合的台词，换一种新鲜说法。';
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
const COACH_SCHEMA = { type: 'object', properties: { review: { type: 'string' }, detail: { type: 'string' }, better: { type: 'string' } }, required: ['review', 'detail', 'better'], additionalProperties: false };
async function genCoachNote(body) {
  // body.facts 是前端用系统真实指标算出的可核对事实串(玩家这句话造成的指标变化)。
  // 教练只能据此诊断，严禁编造事实中没有的数字或效果，避免幻觉。
  const sys = '你是谈判教练。只能依据下方【事实】中系统记录的指标数据(facts)做诊断，严禁编造事实里没有的数字、指标或效果；信息不足就直说「依现有数据」。结合对手上一句(priorBeat)与当前局势(env)解读玩家这句话(playerLine)的得失。给三项：一句话总评review(不超过40字)、逐条对应事实的诊断detail(不超过120字)、一句更优说法better(不超过30字)。中文、犀利具体、可验证。';
  const user = '【事实】' + (body.facts || '(无系统记录)') + '\n上下文：' + JSON.stringify(body) + '\n只据上述事实点评玩家这句的得失，detail需逐条呼应事实里的指标变化，better给更优说法。';
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 400, system: sys,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: COACH_SCHEMA } },
  });
  return JSON.parse(msg.content.find((b) => b.type === 'text').text); // { review, detail, better }
}

// ---- task: generate_duel_scenario (传奇试炼场:由人物属性生成剧情+对抗台词) ----
// 入参 persona = 该传奇人物的属性设定(name/style/passive/weakness/signature/styleTags/
//   mentorSeries/voiceStyle/sceneLexicon/bannedWords/coreTrap) + seed(随机种子,使每局不同)。
// 只生成"叙事层":开场剧情(director)与六幕的对手开场挑战(phases),
// 不触碰分数计算(动作→指标映射仍由前端引擎负责)。
const PHASE_PROPS = { title: { type: 'string' }, openingLine: { type: 'string' }, setting: { type: 'string' }, best: { type: 'string' }, trap: { type: 'string' } };
const SCENARIO_SCHEMA = {
  type: 'object',
  properties: {
    director: {
      type: 'object',
      properties: {
        time: { type: 'string' }, location: { type: 'string' }, visual: { type: 'string' },
        playerRole: { type: 'string' }, opponent: { type: 'string' }, stakes: { type: 'string' },
        hiddenPressure: { type: 'string' }, firstQuestion: { type: 'string' },
      },
      required: ['time', 'location', 'visual', 'playerRole', 'opponent', 'stakes', 'hiddenPressure', 'firstQuestion'],
      additionalProperties: false,
    },
    phases: {
      type: 'array',
      items: { type: 'object', properties: PHASE_PROPS, required: ['title', 'openingLine', 'setting', 'best', 'trap'], additionalProperties: false },
    },
  },
  required: ['director', 'phases'],
  additionalProperties: false,
};
async function genDuelScenario(body) {
  const p = body.persona || {};
  const sys =
    '你是历史谈判剧本的导演。依据给定【传奇人物属性】，为一场与该人物的高强度谈判对抗,' +
    '生成一段全新的剧情(director)与六幕(phases)。要求:\n' +
    '1) 剧情与台词必须贴合该人物的时代、身份、谈判风格(style)、招式(passive)、签名语(signature)与软肋(weakness);\n' +
    '2) 对手台词用其语气(voiceStyle),多用场景词(sceneLexicon),严禁出现违禁词(bannedWords)与现代商业黑话;\n' +
    '3) 每一幕 openingLine 是对手主动发起的"对抗性挑战/逼问",要制造真实压力,并暗含其核心陷阱(coreTrap);\n' +
    '4) 必须符合谈判原则:体现锚定、BATNA/最佳替代、聚焦利益而非立场、让步必换取对等、制造期限与稀缺、维护关系与面子等真实博弈逻辑;每一幕 best 给"符合谈判原则的最优思路", trap 给"违背原则的常见陷阱";\n' +
    '5) firstQuestion 是开场要玩家立刻回答的核心议题;hiddenPressure 是暗线压力;\n' +
    '6) 全中文。phases 恰好 6 幕,题名精炼。只产出叙事,不决定胜负、不输出指标数字。';
  const user =
    '【传奇人物属性】\n' + JSON.stringify(p, null, 2) +
    '\n随机种子(用于让本局剧情区别于其它局): ' + (body.seed || Date.now()) +
    '\n请据此生成贴合该人物属性、语境与谈判原则的剧情(director)与六幕(phases,各含对抗性 openingLine)。';
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 1600, system: sys,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCENARIO_SCHEMA } },
  });
  return JSON.parse(msg.content.find((b) => b.type === 'text').text); // { director, phases }
}

// ---- task: generate_turn (一次调用同时产出对手台词+各选项贴合话术,降延迟) ----
// 把"对手实时台词"和"按该台词改写的回应选项话术"合并为单次请求,
// 替代原来"先生成台词→再改写选项"的两次串行往返,显著降低每回合等待。
const TURN2_SCHEMA = {
  type: 'object',
  properties: {
    beat: { type: 'string' },
    options: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, text: { type: 'string' } }, required: ['key', 'text'], additionalProperties: false } },
  },
  required: ['beat', 'options'],
  additionalProperties: false,
};
async function genTurn(body) {
  const sys =
    '你扮演谈判对手并兼任玩家话术教练,一次性产出两部分:\n' +
    'beat = 对手对玩家上一手(playerLine)的实时台词:结合场景/局势/persona,既反击又针对其弱项,1-2句、<=55字、每次措辞不同、像真人即兴;\n' +
    'options = 针对这句 beat,为传入的每个选项(各含策略意图)各写一句贴合的玩家话术:保持该选项策略意图不变、直接回应 beat、口语自然、<=40字。\n' +
    '若给了 persona(语气/场景词/禁用词),beat 须贴合其语气、多用场景词、禁用违禁词;全程符合谈判原则(锚定/BATNA/聚焦利益/让步必换取/制造期限/护面子)。中文。';
  const user = '【本回合上下文】\n' + JSON.stringify(body, null, 2) + '\n为 options 数组里给出的每个 key 各生成一句 text。';
  const msg = await client.messages.create({
    model: MODEL, max_tokens: 700, system: sys,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TURN2_SCHEMA } },
  });
  return JSON.parse(msg.content.find((b) => b.type === 'text').text); // { beat, options:[{key,text}] }
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
      case 'generate_duel_scenario':   out = await genDuelScenario(body); break;
      case 'generate_turn':            out = await genTurn(body); break;
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
