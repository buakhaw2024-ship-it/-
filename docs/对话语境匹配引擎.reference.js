// 参考文件：本文件为修复新增的运行时代码，已内联进 dist/*.html 的打包模板。
// 仅供审阅/复用，单独引入需配合 NegotiationLLMBridge / Store / EventBus / getStoryScript 等既有全局。

function storyBeatText(sAct, roundInAct) {
  if (!sAct || !sAct.beats || !sAct.beats.length) return '';
  const b = sAct.beats[Math.min(Math.max(0, roundInAct || 0), sAct.beats.length - 1)];
  return (b && typeof b === 'object') ? (b.line || b.text || '') : (b || '');
}

function resolveStoryVoices(sAct, script, roundInAct) {
  if (!sAct) return (script && script.voices) || {};
  const idx = Math.max(0, roundInAct || 0);
  // 1) 节拍对象自带 voices  2) act.beatVoices[round]  3) act.voices  4) 链级 voices
  const beat = sAct.beats ? sAct.beats[Math.min(idx, sAct.beats.length - 1)] : null;
  if (beat && typeof beat === 'object' && beat.voices) return beat.voices;
  if (Array.isArray(sAct.beatVoices) && sAct.beatVoices.length) {
    const bv = sAct.beatVoices[Math.min(idx, sAct.beatVoices.length - 1)];
    if (bv) return bv;
  }
  if (sAct.voices) return sAct.voices;
  return (script && script.voices) || {};
}

function buildStoryRoundContext(state, script, sAct, act) {
  const mentor = (typeof getEquippedMentor === 'function') ? getEquippedMentor() : null;
  return {
    key: [state.chainId, state.actIndex, state.roundInAct].join(':'),
    chainId: state.chainId,
    chainTitle: state.chain && state.chain.title,
    actIndex: state.actIndex,
    actTitle: act && act.title,
    roundInAct: state.roundInAct,
    era: script && script.era,
    playerRole: script && script.playerRole,
    opponentName: sAct && sAct.opponent,
    scene: sAct && sAct.scene,
    beat: storyBeatText(sAct, state.roundInAct),
    lesson: sAct && sAct.lesson,
    focusTag: act && act.focusTag,
    equippedMentor: mentor ? mentor.name : null,
    history: (state.log || []).slice(-4).map((l) => ({ round: l.round, choice: l.label, key: l.choiceKey }))
  };
}

const StoryDialogueAI = (() => {
  const inFlight = {};
  function ensureStore(state) {
    state.aiStoryRounds = state.aiStoryRounds || {};
    state.aiStoryStatus = state.aiStoryStatus || {};
    return state;
  }
  function getRound(state, key) { return state && state.aiStoryRounds ? state.aiStoryRounds[key] : null; }
  function getStatus(state, key) { return state && state.aiStoryStatus ? state.aiStoryStatus[key] : null; }
  function buildMessages(ctx) {
    const system = '你是《全谱系谈判博弈模拟系统·传奇剧情链》的导演兼对手。'
      + '请在同一回合上下文内，同时生成：(1) 对手此刻说出的一句话 opponentLine；'
      + '(2) 玩家可选的五种策略话术 voices：info(查敌情/探询信息)、reframe(定边界/重定议题)、'
      + 'pressure(借外压/施压)、build(给台阶/建立信任)、lock(锁条款/拍板)。'
      + '硬性要求：五句 voices 必须都在直接回应同一个 opponentLine，与对手人物、时代、场景、当前节拍严格一致，'
      + '彼此语境吻合、不得答非所问；语言贴合人物身份与历史语感，每句不超过45字。'
      + '不要决定胜负、不要改分数、不要解释，只返回 JSON：'
      + '{"opponentLine":"...","voices":{"info":"...","reframe":"...","pressure":"...","build":"...","lock":"..."}}';
    const user = '【剧情链】' + (ctx.chainTitle || '') + '\n【时代】' + (ctx.era || '')
      + '\n【玩家身份】' + (ctx.playerRole || '') + '\n【对手】' + (ctx.opponentName || '')
      + '\n【本幕】' + (ctx.actTitle || '') + '（焦点：' + (ctx.focusTag || '') + '）'
      + '\n【回合】' + ((ctx.roundInAct || 0) + 1) + '/4'
      + '\n【情境】' + (ctx.scene || '')
      + '\n【对手当前节拍 · 剧本草稿（可润色，但须保持其意图）】' + (ctx.beat || '')
      + '\n【本幕要义】' + (ctx.lesson || '')
      + '\n【最近交手】' + JSON.stringify(ctx.history || [])
      + '\n请据此生成 opponentLine 与配套 voices，只返回 JSON。';
    return [{ role: 'system', content: system }, { role: 'user', content: user }];
  }
  function parseJson(content) {
    if (!content) return null;
    try { return JSON.parse(content); } catch (_) {}
    const m = String(content).match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
    return null;
  }
  function normalize(raw, ctx) {
    if (!raw || typeof raw !== 'object') return null;
    const v = raw.voices || {};
    const keys = ['info', 'reframe', 'pressure', 'build', 'lock'];
    const voices = {};
    let ok = 0;
    keys.forEach((k) => { const s = v[k] != null ? String(v[k]).trim() : ''; if (s) { voices[k] = s; ok++; } });
    if (ok < 3) return null; // 语境匹配不足，宁可回退剧本台词
    return { opponentLine: raw.opponentLine != null ? String(raw.opponentLine).trim() : (ctx.beat || ''), voices: voices };
  }
  async function callModel(ctx) {
    const mode = NegotiationLLMBridge.getMode();
    if (mode === 'direct') {
      const cfg = NegotiationLLMBridge.getDirectConfig();
      if (!cfg.apiKey && cfg.provider !== 'ollama') throw new Error('前端直连模式未填写 API Key');
      const headers = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey;
      if (cfg.provider === 'openrouter') {
        headers['HTTP-Referer'] = location.origin === 'null' ? 'http://localhost' : location.origin;
        headers['X-Title'] = 'Negotiation Story Chain AI';
      }
      const body = { model: cfg.model, messages: buildMessages(ctx), temperature: 0.7, max_tokens: 700, response_format: { type: 'json_object' } };
      const res = await fetch(String(cfg.baseUrl || '').replace(/\/+$/, '') + '/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Direct API failed: ' + res.status);
      const data = await res.json();
      const content = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '{}';
      return parseJson(content);
    }
    // 后端安全模式：把 story-round 上下文交给后端代理统一处理
    const res = await fetch(NegotiationLLMBridge.getEndpoint(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'story-round', messages: buildMessages(ctx), context: ctx })
    });
    if (!res.ok) throw new Error('Backend LLM failed: ' + res.status);
    const data = await res.json();
    return (data && data.voices) ? data : parseJson(data && data.content);
  }
  function rerenderIfSameRound(latest, ctx) {
    if (latest && latest.chainId === ctx.chainId && latest.actIndex === ctx.actIndex
        && latest.roundInAct === ctx.roundInAct && !latest.completed) {
      try { EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.STORY_PLAY, params: {} }); } catch (_) {}
    }
  }
  function ensureRound(state) {
    if (!state || !NegotiationLLMBridge.isEnabled()) return;
    const script = (typeof getStoryScript === 'function') ? getStoryScript(state.chainId) : null;
    if (!script || !script.acts || !script.acts[state.actIndex]) return;
    const sAct = script.acts[state.actIndex];
    const act = state.chain && state.chain.acts ? state.chain.acts[state.actIndex] : null;
    const ctx = buildStoryRoundContext(state, script, sAct, act);
    ensureStore(state);
    if (state.aiStoryRounds[ctx.key] || inFlight[ctx.key]) return; // 已有结果或正在生成
    inFlight[ctx.key] = true;
    state.aiStoryStatus[ctx.key] = { state: 'pending', ts: Date.now() };
    Store.set('storyState', state);
    // 先展示"正在生成"状态（异步重渲染，避免在 afterRender 内同步重入）
    setTimeout(() => { rerenderIfSameRound(Store.get('storyState'), ctx); }, 0);
    callModel(ctx).then((raw) => {
      const norm = normalize(raw, ctx);
      const latest = Store.get('storyState');
      if (!latest) return;
      ensureStore(latest);
      if (norm) {
        latest.aiStoryRounds[ctx.key] = norm;
        latest.aiStoryStatus[ctx.key] = { state: 'ready', ts: Date.now() };
      } else {
        latest.aiStoryStatus[ctx.key] = { state: 'error', message: 'empty/invalid result', ts: Date.now() };
      }
      Store.set('storyState', latest);
      rerenderIfSameRound(latest, ctx);
    }).catch((err) => {
      console.warn('[StoryDialogueAI]', err);
      const latest = Store.get('storyState');
      if (latest) {
        ensureStore(latest);
        latest.aiStoryStatus[ctx.key] = { state: 'error', message: err && err.message, ts: Date.now() };
        Store.set('storyState', latest);
        rerenderIfSameRound(latest, ctx);
      }
    }).finally(() => { delete inFlight[ctx.key]; });
  }
  return { ensureRound, getRound, getStatus, buildMessages };
})();
window.StoryDialogueAI = StoryDialogueAI;

// 包裹剧情链 step：记录"本回合实际展示的玩家话术"，供下一回合回显时保持语境一致
if (typeof StoryChain !== 'undefined' && StoryChain && typeof StoryChain.step === 'function') {
  const __ORIG_STORYCHAIN_STEP = StoryChain.step;
  StoryChain.step = function (choiceKey) {
    let shown = '';
    try {
      const pre = Store.get('storyState');
      if (pre) {
        const script = (typeof getStoryScript === 'function') ? getStoryScript(pre.chainId) : null;
        const sAct = script && script.acts ? script.acts[pre.actIndex] : null;
        const aiKey = [pre.chainId, pre.actIndex, pre.roundInAct].join(':');
        const aiRound = pre.aiStoryRounds && pre.aiStoryRounds[aiKey];
        const voices = (aiRound && aiRound.voices) ? aiRound.voices : resolveStoryVoices(sAct, script, pre.roundInAct);
        shown = (voices && voices[choiceKey]) || '';
      }
    } catch (_) {}
    const next = __ORIG_STORYCHAIN_STEP.call(StoryChain, choiceKey);
    try {
      const st = Store.get('storyState');
      if (st && st.log && st.log.length) { st.log[st.log.length - 1].shownVoice = shown; Store.set('storyState', st); }
    } catch (_) {}
    return next;
  };
}
