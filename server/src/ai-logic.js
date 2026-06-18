// ai-logic.js — provider-agnostic core for the 谈判博弈 AI 代理。
// Mirrors the game's front-end prompts so 后端安全模式 produces the same
// shaped JSON the game already knows how to parse. The API key lives here
// (server side), never in the browser.
//
// Contract with the game (POST body.task):
//   (no task)                  -> 结构化回合  -> {opponentResponse,opponentHearing,coachNote,betterNextMove,riskSignal,pressureLevel,provider,model}
//   rewrite_response_options   -> 选项改写    -> {options:{key:话术}}
//   generate_turn              -> 动态对手台词 -> {beat, options:{key:话术}}
//   generate_coach_note        -> 教练复盘    -> {review, detail, better}
//   generate_duel_scenario     -> 试炼场剧情  -> {director:{...}, phases:[{...}]}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'nousresearch/hermes-3-llama-3.1-70b';

function str(v, fallback) {
  const s = (v == null ? '' : String(v)).trim();
  return s || fallback || '';
}
function truncate(v, max) {
  const s = str(v, '');
  return s.length > max ? s.slice(0, max) : s;
}
// Tolerant JSON extraction — same idea as the game's safeJsonParse: take the
// whole thing, else the first {...} block. Lets non-strict models through.
function safeJsonParse(content) {
  if (content == null) return null;
  if (typeof content === 'object') return content;
  try { return JSON.parse(content); } catch (_) {}
  const m = String(content).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}
function personaBrief(p) {
  if (!p || typeof p !== 'object') return '';
  const parts = [];
  if (p.style) parts.push('风格' + p.style);
  if (p.passive && p.passive.name) parts.push('招式' + p.passive.name);
  if (p.weakness) parts.push('软肋' + p.weakness);
  if (p.voiceStyle) parts.push('语气' + p.voiceStyle);
  if (Array.isArray(p.sceneLexicon) && p.sceneLexicon.length) parts.push('多用场景词' + p.sceneLexicon.slice(0, 6).join('、'));
  if (Array.isArray(p.bannedWords) && p.bannedWords.length) parts.push('禁用词' + p.bannedWords.join('、'));
  if (!parts.length) return '';
  return '你的人物设定:' + parts.join(';') + '。须符合真实谈判原则(锚定/BATNA/聚焦利益而非立场/让步必换取/制造期限/护面子)。';
}

// ── Per-task message builders (mirrors front-end direct-mode prompts) ───────
function buildMessages(task, body) {
  body = body || {};

  if (task === 'rewrite_response_options') {
    const opts = Array.isArray(body.options) ? body.options : [];
    const keys = opts.map((o) => o.key).join('、');
    const lines = opts.map((c) => '- key=' + c.key + ' 策略=' + (c.strategy || c.skill || c.key) + ' 原话术=' + (c.sample || '')).join('；');
    const sys = '你是谈判教练。给定对手刚说的话和若干回应策略选项，把每个选项的示范话术改写成直接回应对手这句话的一句中文。务必保持每个选项原本的策略意图与风格，只让语言贴合对手当前台词，每条不超过40字。严格只返回一个JSON对象：{options:{选项key:改写话术}}，键必须用给定的选项key(' + keys + ')，不要任何多余文字。';
    const usr = '对手刚说: ' + str(body.opponentLine) + '。需改写的回应选项: ' + lines + '。只返回JSON对象 {options:{key:话术}}。';
    return { messages: msgs(sys, usr), maxTokens: 600 };
  }

  if (task === 'generate_turn') {
    const opts = Array.isArray(body.options) ? body.options : [];
    const optDesc = opts.map((o) => o.key + '(' + (o.strategy || o.skill || '') + ')').join('、');
    const tgt = body.weak ? ('其最弱项「' + body.weak + '」') : '其上一手的破绽';
    const sys = '你扮演谈判对手「' + str(body.opponentName, '对手') + '」并兼任玩家话术教练。一次性产出:(1)beat=对手台词,直接回应玩家刚说的话、结合局势既反击又针对' + tgt + ',1-2句不超过55字、每次措辞不同、像真人即兴;(2)options=针对这句beat为每个选项各写一句贴合的玩家话术,保持各选项策略意图不变、直接回应beat、口语自然不超过40字。' + personaBrief(body.persona) + '只返回JSON对象 {beat:台词, options:{选项key:话术}}。';
    const recent = Array.isArray(body.recent) ? body.recent.join('、') : '';
    const usr = (body.focus ? ('本幕焦点:' + body.focus + '。') : '')
      + (body.env ? ('当前局势:' + body.env + '。') : '')
      + '玩家近几手:' + (recent || '无') + '。'
      + (body.playerLine ? ('玩家刚说:「' + body.playerLine + '」。') : '')
      + '你上一句:' + str(body.priorBeat) + '。选项及策略:' + optDesc
      + '。变化种子(勿读出):' + (body.seed || Math.floor(Math.random() * 1e5))
      + '。只返回JSON {beat, options:{key:话术}}。';
    return { messages: msgs(sys, usr), maxTokens: 500, temperature: 0.8 };
  }

  if (task === 'generate_coach_note') {
    if (body.mode === 'decision') {
      const sys = '你是博弈训练教练。只能依据【事实】中本局真实数据诊断,严禁编造事实外的数字。指出本局得失与改进点,强调正和博弈里合作/对等回应如何最大化你自己的长期收益(而非比对方分高)。给JSON对象 {review:总评不超30字, detail:据事实诊断不超110字, better:下一步不超40字}。中文。';
      const usr = '【事实】' + str(body.facts) + '。请据此给出本局真实诊断,只返回JSON {review,detail,better}。';
      return { messages: msgs(sys, usr), maxTokens: 400 };
    }
    const sys = '你是谈判教练。只能依据【事实】中系统记录的指标数据(facts)做诊断,严禁编造事实里没有的数字、指标或效果;信息不足就写「依现有数据」。结合对手上一句与当前局势,分析玩家这句话的得失。给三项:一句话总评review(不超过40字)、逐条对应事实的诊断detail(不超过120字)、一句更优说法better(不超过30字)。中文、犀利具体、可验证。只返回JSON对象 {review,detail,better}。';
    const usr = '对手「' + str(body.opponentName, '对手') + '」上一句:' + str(body.priorBeat) + '。【事实】' + str(body.facts) + ' 当前局势:' + str(body.env, '未知') + '。请只据上述事实分析这句的得失并给更优说法。只返回JSON {review,detail,better}。';
    return { messages: msgs(sys, usr), maxTokens: 400 };
  }

  if (task === 'generate_duel_scenario') {
    const sys = '你是历史谈判剧本导演。依据【传奇人物属性】为一场与该人物的高强度谈判对抗生成全新剧情(director)与六幕(phases)。台词贴合其时代/身份/风格style/招式passive/签名语/软肋weakness,用其语气voiceStyle、多用场景词sceneLexicon、不得出现违禁词bannedWords与现代黑话;每幕 openingLine 为对手主动发起的对抗性逼问并暗含其陷阱coreTrap;必须符合谈判原则(锚定、BATNA最佳替代、聚焦利益而非立场、让步必换取对等、制造期限、护面子);best=符合原则的最优思路,trap=违背原则的常见陷阱;firstQuestion=开场核心议题,hiddenPressure=暗线压力。全中文,phases 恰好6幕。只返回JSON对象 {director:{time,location,visual,playerRole,opponent,stakes,hiddenPressure,firstQuestion},phases:[{title,openingLine,setting,best,trap}]}。';
    const usr = '【传奇人物属性】' + JSON.stringify(body.persona || {}) + ' 随机种子:' + str(body.seed) + '。请生成贴合该人物属性、语境与谈判原则的剧情与六幕对抗。只返回上述JSON。';
    return { messages: msgs(sys, usr), maxTokens: 1400, temperature: 0.85 };
  }

  // default: structured negotiation turn (front-end buildDirectMessages)
  const ctx = body;
  const sys = '你是《全谱系谈判博弈模拟系统》中的AI谈判对手与谈判教练。\n\n你的任务：\n1. 根据故事链条、对手人物、谈判阶段和玩家发言，生成真实、拟人化、有压迫感的对手回应。\n2. 给出对手听感、教练点评、下一步建议和风险信号。\n3. 语言必须贴合当前故事链条和阶段目标。若故事链条更新，以用户传入的 storyChain/currentPhase 为准。\n4. 不要决定胜负，不要修改分数，不要控制经验、解锁和存档。\n5. 不要输出 Markdown，不要输出解释过程，只返回 JSON。\n\n必须严格返回：\n{\n  "opponentResponse": "不超过45字",\n  "opponentHearing": "不超过60字",\n  "coachNote": "不超过100字",\n  "betterNextMove": "不超过80字",\n  "riskSignal": "不超过60字",\n  "pressureLevel": 1\n}';
  const usr = '【系统】' + str(ctx.systemName, '全谱系谈判博弈模拟系统') + '\n【模式】' + str(ctx.mode) + '\n【场景】' + str(ctx.scenarioName, '未知场景') + '\n【对手】' + str(ctx.opponentName, '未知对手') + '\n【对手类型】' + str(ctx.opponentType, '未知类型') + '\n【阶段】' + str(ctx.stage, '未知阶段') + '\n【回合】' + (ctx.roundIndex || 1) + '/' + (ctx.totalRounds || 6) + '\n【玩家发言】' + str(ctx.playerLine) + '\n【当前分数】' + (ctx.playerScore == null ? '未知' : ctx.playerScore) + '\n【当前对手原台词】' + str(ctx.currentOpponentLine) + '\n\n【故事链条】\n' + JSON.stringify(ctx.storyChain || null, null, 2) + '\n\n【历史与状态】\n' + JSON.stringify(ctx.history || {}, null, 2) + '\n\n请生成当前回合的AI对手回应和教练反馈。只返回JSON。';
  return { messages: msgs(sys, usr), maxTokens: 600, temperature: 0.72 };
}
function msgs(sys, usr) {
  return [{ role: 'system', content: sys }, { role: 'user', content: usr }];
}

// ── Shape the parsed model output into exactly what the game expects ────────
function shapeResult(task, parsed, body, cfg) {
  parsed = parsed && typeof parsed === 'object' ? parsed : {};
  const providerLabel = cfg.providerLabel || 'OpenRouter';

  if (task === 'rewrite_response_options' || task === 'generate_turn') {
    // game parses {options:{...}} (and {beat} for generate_turn) itself
    return parsed;
  }
  if (task === 'generate_coach_note') {
    return {
      review: str(parsed.review || parsed.coach || parsed.coachNote),
      detail: str(parsed.detail || parsed.diagnosis),
      better: str(parsed.better || parsed.betterMove || parsed.betterNextMove),
    };
  }
  if (task === 'generate_duel_scenario') {
    return { director: parsed.director || null, phases: Array.isArray(parsed.phases) ? parsed.phases : [] };
  }
  // structured negotiation turn -> normalize like the game's normalizeResult
  const pressure = Number(parsed.pressureLevel);
  return {
    opponentResponse: truncate(parsed.opponentResponse, 80),
    opponentHearing: truncate(parsed.opponentHearing, 120),
    coachNote: truncate(parsed.coachNote, 180),
    betterNextMove: truncate(parsed.betterNextMove, 150),
    riskSignal: truncate(parsed.riskSignal, 100),
    pressureLevel: Number.isFinite(pressure) ? Math.max(1, Math.min(5, Math.round(pressure))) : 2,
    provider: providerLabel,
    model: cfg.model || DEFAULT_MODEL,
  };
}

// ── OpenRouter (OpenAI-compatible) call ─────────────────────────────────────
async function callModel(messages, opts, cfg) {
  const baseUrl = (cfg.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const res = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey,
      // OpenRouter attribution headers (harmless for other OpenAI-compatible APIs)
      'HTTP-Referer': cfg.referer || 'https://negotiation-game.local',
      'X-Title': 'Negotiation Game AI Enhance',
    },
    body: JSON.stringify({
      model: cfg.model || DEFAULT_MODEL,
      messages,
      temperature: opts.temperature == null ? 0.72 : opts.temperature,
      max_tokens: opts.maxTokens || 600,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    const err = new Error('Upstream model error ' + res.status + ' ' + t.slice(0, 200));
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content : '{}';
}

// Main entry: takes the raw POST body + server config, returns the shaped object.
export async function handleAiRequest(body, cfg) {
  if (!cfg || !cfg.apiKey) {
    const e = new Error('未配置 OPENROUTER_API_KEY（服务端密钥）');
    e.status = 500;
    throw e;
  }
  const task = body && body.task;
  const { messages, maxTokens, temperature } = buildMessages(task, body);
  const content = await callModel(messages, { maxTokens, temperature }, cfg);
  const parsed = safeJsonParse(content) || {};
  return shapeResult(task, parsed, body || {}, cfg);
}

export const __test = { buildMessages, shapeResult, safeJsonParse };
export const DEFAULTS = { DEFAULT_BASE_URL, DEFAULT_MODEL };
