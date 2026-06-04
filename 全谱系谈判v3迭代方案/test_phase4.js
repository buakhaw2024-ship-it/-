#!/usr/bin/env node
/**
 * test_phase4.js — Phase 4 集成测试
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ─── 从 dist HTML 提取 bundle JS ────────────────────────────────────────────
const html = fs.readFileSync(path.join(__dirname, 'dist', 'game_trainer.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('✗ 无法提取 bundle JS'); process.exit(1); }

// 剥离外层 IIFE，获取内部脚本
const inner = m[1]
  .replace(/^\s*"use strict";\s*\(function\s*\(\)\s*\{/, '')
  .replace(/\}\)\(\);\s*$/, '');

// 追加一个暴露块，把所有需要测试的名称写入 sandbox 对象 G
const expose = `
;(function(){
  var names = ['buildReplay','loadPlayer','accumulate','computeProfile',
               'getProfileType','hasEnoughData','detectWeakPoints',
               'EventBus','EVENTS','Store',
               'OPPONENTS','C','SCENARIO_REGISTRY','SCENARIO_META',
               'getDifficultyMod','applyDifficulty','canUnlockBoss','isGrandMaster',
               'getRank','TRUMP_BOSS',
               // v4Pro
               'loadReputation','saveReputation','updateReputation','applyReputation',
               'freshReputation','Mood','OpponentAI','Memory','BaseScenario',
               'BargainingGame','CrisisNegotiation','CoalitionGame'];
  for(var i=0;i<names.length;i++){
    try{ G[names[i]] = eval(names[i]); } catch(e){}
  }
})();
`;

// ─── 运行时垫片 ───────────────────────────────────────────────────────────────
const lsStore = {};
const G = {
  localStorage: {
    getItem:    (k) => lsStore[k] ?? null,
    setItem:    (k, v) => { lsStore[k] = v; },
    removeItem: (k) => { delete lsStore[k]; },
  },
  document: (() => {
    const el = () => ({
      innerHTML: '',
      value: '',
      getAttribute: () => null,
      setAttribute: () => {},
      addEventListener: () => {},
      querySelector: () => el(),
      querySelectorAll: () => [],
      focus: () => {},
      blur: () => {},
      click: () => {},
    });
    const appEl = el();
    appEl.id = 'app';
    return {
      getElementById:   () => appEl,
      querySelector:    () => el(),
      querySelectorAll: () => [],
      addEventListener: () => {},
      readyState: 'complete',
    };
  })(),
  setTimeout: (fn) => { fn(); return 0; },
  console,
  Math,
  JSON,
  Date,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Error,
  isNaN,
  isFinite,
  parseFloat,
  parseInt,
  G: null, // will be set below
};
G.G = G;
G.globalThis = G;
G.global = G;
G.window = G;
G.scrollTo = () => {};
G.location = { href: '' };

const ctx = vm.createContext(G);
try {
  vm.runInContext(inner + expose, ctx, { filename:'bundle.js' });
} catch (e) {
  console.error('✗ bundle 执行失败:', e.message);
  console.error(e.stack);
  process.exit(1);
}

// 解构需要的名称
const {
  buildReplay, loadPlayer, accumulate, computeProfile,
  getProfileType, hasEnoughData, EventBus, EVENTS, Store, OPPONENTS, C,
} = G;

if (!buildReplay) { console.error('✗ buildReplay 未暴露'); process.exit(1); }

// ─── 测试工具 ─────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ✓ ${msg}`); passed++; }
  else       { console.error(`  ✗ ${msg}`); failed++; }
}

// ─── Test 1: buildReplay 囚徒困境 ─────────────────────────────────────────────
console.log('\n[1] buildReplay — 囚徒困境');
{
  const rounds = [
    { round:1, player:'coop',   opp:'coop',   mood:{ trust:0.6, anger:0.1, patience:0.8, confidence:0.7 } },
    { round:2, player:'defect', opp:'coop',   mood:{ trust:0.5, anger:0.2, patience:0.7, confidence:0.6 } },
    { round:3, player:'coop',   opp:'defect', mood:{ trust:0.4, anger:0.4, patience:0.5, confidence:0.5 } },
    { round:4, player:'defect', opp:'defect', mood:{ trust:0.2, anger:0.7, patience:0.3, confidence:0.4 } },
  ];
  const opp = { id:'rational', name:'理性者', type:'rational' };
  const replay = buildReplay('prisoners', rounds, opp, { playerScore:30, outcome:'lose' });

  assert(Array.isArray(replay.perRound) && replay.perRound.length === 4, 'perRound 4 条');
  assert(replay.perRound[0].score === 85, `CC=85 (得 ${replay.perRound[0].score})`);
  assert(replay.perRound[1].score === 66, `DC=66 (得 ${replay.perRound[1].score})`);
  assert(replay.perRound[2].score === 40, `CD=40 (得 ${replay.perRound[2].score})`);
  assert(replay.perRound[3].score === 32, `DD=32 (得 ${replay.perRound[3].score})`);
  const exp = Math.round((85+66+40+32)/4);
  assert(replay.avgScore === exp, `avgScore=${replay.avgScore} (期望${exp})`);
  assert(replay.turning !== null, '有转折点');
  assert(replay.turning.type === 'bad', `turning.type=bad`);
  assert(Array.isArray(replay.moodSeries) && replay.moodSeries.length === 4, 'moodSeries 4 个');
  assert(Array.isArray(replay.advice) && replay.advice.length >= 1, `建议 ${replay.advice.length} 条`);
}

// ─── Test 2: buildReplay 信任博弈 ─────────────────────────────────────────────
console.log('\n[2] buildReplay — 信任博弈');
{
  const rounds = [
    { round:1, invested:5, returned:8, myNet:3,  mood:{ trust:0.7, anger:0.1 } },
    { round:2, invested:8, returned:6, myNet:-2, mood:{ trust:0.5, anger:0.3 } },
  ];
  const replay = buildReplay('trust', rounds, { id:'emotional', name:'情感型' }, {});
  assert(replay.perRound.length === 2, 'trust 2 轮');
  assert(replay.perRound[0].score > replay.perRound[1].score, '正回报得分高于负回报');
  assert(Array.isArray(replay.moodSeries) && replay.moodSeries.length === 2, 'moodSeries 2 个');
}

// ─── Test 3: buildReplay staged ───────────────────────────────────────────────
console.log('\n[3] buildReplay — 联盟（staged）');
{
  const rounds = [
    { stage:'第1阶段', ps:15, maxPs:15 },
    { stage:'第2阶段', ps:20, maxPs:20 },
    { stage:'第3阶段', ps:5,  maxPs:18 },
    { stage:'第4阶段', ps:15, maxPs:20 },
  ];
  const replay = buildReplay('coalition', rounds, null, {});
  assert(replay.perRound.length === 4, '4 阶段');
  assert(replay.perRound[0].score === 100, `满分=100 (得 ${replay.perRound[0].score})`);
  assert(replay.perRound[2].score < 50, `最差<50 (得 ${replay.perRound[2].score})`);
  assert(replay.moodSeries === null, '无情绪序列');
}

// ─── Test 4: accumulate + computeProfile ──────────────────────────────────────
console.log('\n[4] accumulate + computeProfile');
{
  const player = loadPlayer('__test_p4__');
  const opp = { id:'rational', name:'理性者', type:'rational' };

  accumulate(player, 'prisoners',
    [{ round:1, player:'coop', opp:'coop' }, { round:2, player:'coop', opp:'defect' }, { round:3, player:'defect', opp:'defect' }],
    { outcome:'draw', playerScore:40 }, opp);

  accumulate(player, 'trust',
    [{ round:1, invested:6, returned:9, myNet:3 }, { round:2, invested:3, returned:2, myNet:-1 }],
    { outcome:'win', playerScore:60 }, opp);

  assert(player.behaviorStats.games === 2, `games=${player.behaviorStats.games}`);
  assert(player.behaviorStats.coopMoves >= 2, `coopMoves=${player.behaviorStats.coopMoves}`);
  assert(player.behaviorStats.totalMoves >= 5, `totalMoves=${player.behaviorStats.totalMoves}`);
  assert(player.behaviorStats.trustInvested === 9, `trustInvested=${player.behaviorStats.trustInvested}`);
  assert(player.behaviorStats.wins === 1, `wins=${player.behaviorStats.wins}`);

  const profile = computeProfile(player);
  const dims = ['cooperation_rate','risk','fairness','depth','emotion','assert','adapt','trust'];
  let ok = true;
  for (const k of dims) {
    if (typeof profile[k] !== 'number' || profile[k] < 0 || profile[k] > 1) {
      console.error(`  ✗ profile.${k} = ${profile[k]}`); ok = false; failed++;
    }
  }
  if (ok) { console.log('  ✓ 8 维 profile 均在 [0,1]'); passed++; }

  const pt = getProfileType(profile);
  assert(typeof pt.name === 'string' && pt.name.length > 0, `心理类型: ${pt.name}`);
  assert(Array.isArray(pt.advice) && pt.advice.length > 0, `成长建议 ${pt.advice.length} 条`);
}

// ─── Test 5: hasEnoughData ────────────────────────────────────────────────────
console.log('\n[5] hasEnoughData');
{
  assert(!hasEnoughData(1), '1 场不足');
  assert(hasEnoughData(2),  '2 场足够');
}

// ─── Test 6: 全场景完整运行（含 peek）────────────────────────────────────────
console.log('\n[6] 全场景完整运行 + peek 动作');
{
  let gameEndCount = 0;
  EventBus.on(EVENTS.GAME_END, () => { gameEndCount++; });

  const oppId = OPPONENTS[0].id;
  const scenarios = [
    { key:'prisoners', actions:[
        { type:'peek' },
        { type:'choice', value:'coop' }, { type:'choice', value:'coop' },
        { type:'choice', value:'defect' }, { type:'choice', value:'coop' },
        { type:'choice', value:'coop' },
      ]},
    { key:'ultimatum',  actions:[
        { type:'propose', value:'50' },   // round 0: proposer
        { type:'respond', value:'accept'},// round 1: acceptor (opp proposes via sync setTimeout)
        { type:'propose', value:'55' },   // round 2: proposer → _finish()
      ]},
    { key:'trust',      actions:[
        { type:'peek' },
        { type:'invest', value:'5' }, { type:'invest', value:'6' }, { type:'invest', value:'4' },
      ]},
    { key:'bargaining', actions:[
        { type:'counter', value:'40' }, { type:'counter', value:'50' },
        { type:'counter', value:'58' }, { type:'accept' },
      ]},
    { key:'crisis',     actions:[
        { type:'stage', value:'0' }, { type:'stage', value:'1' },
        { type:'stage', value:'2' }, { type:'stage', value:'0' },
      ]},
    { key:'publicgoods',actions:[
        { type:'contribute', value:'7' }, { type:'contribute', value:'5' },
        { type:'contribute', value:'8' }, { type:'contribute', value:'6' },
      ]},
    { key:'coalition',  actions:[
        { type:'stage', value:'0' }, { type:'stage', value:'0' },
        { type:'stage', value:'0' }, { type:'stage', value:'0' },
      ]},
  ];

  let prevCount = 0;
  for (const { key, actions } of scenarios) {
    EventBus.emit(EVENTS.GAME_START, { scenarioKey: key, opponentId: oppId });
    for (const a of actions) EventBus.emit(EVENTS.PLAYER_ACTION, a);
    const fired = gameEndCount > prevCount;
    const lr = Store.get('lastResult');
    const hasReplay = fired && lr && lr.replay && Array.isArray(lr.replay.perRound);
    assert(fired, `${key}: game:end 触发`);
    assert(hasReplay, `${key}: replay 存在 (${hasReplay ? lr.replay.perRound.length : 0} 轮)`);
    prevCount = gameEndCount;
  }
}

// ─── Test 7: moodSparkline ────────────────────────────────────────────────────
console.log('\n[7] C.moodSparkline');
{
  const svg = C.moodSparkline([
    { trust:0.6, anger:0.2 }, { trust:0.5, anger:0.4 }, { trust:0.3, anger:0.7 },
  ]);
  assert(svg.includes('<svg'), 'SVG 元素存在');
  assert(svg.includes('polyline'), 'polyline 存在');
  assert(svg.includes('var(--cyan)'), '信任线 cyan');
  assert(svg.includes('var(--red)'),  '愤怒线 red');
  assert(C.moodSparkline(null) === '', '空序列 → 空字符串');
}

// ─── Test 8: getDifficultyMod ─────────────────────────────────────────────────
console.log('\n[8] getDifficultyMod');
{
  const { getDifficultyMod } = G;
  const easy = getDifficultyMod('easy');
  const hard = getDifficultyMod('hard');
  const ext  = getDifficultyMod('extreme');
  assert(easy.coopFactor > 1,              'easy coopFactor > 1');
  assert(hard.coopFactor < 1,              'hard coopFactor < 1');
  assert(ext.coopFactor < hard.coopFactor, 'extreme < hard coopFactor');
  assert(easy.acceptShift > 0,             'easy acceptShift > 0');
  assert(ext.acceptShift < 0,              'extreme acceptShift < 0');
  assert(easy.toughFactor < 1,             'easy toughFactor < 1');
  assert(hard.toughFactor > 1,             'hard toughFactor > 1');
}

// ─── Test 9: applyDifficulty ──────────────────────────────────────────────────
console.log('\n[9] applyDifficulty');
{
  const { applyDifficulty, getDifficultyMod } = G;
  const easy = getDifficultyMod('easy');
  const hard = getDifficultyMod('hard');

  // trust-return
  assert(applyDifficulty('trust-return', 12, { tripled:30 }, easy) > 12, 'easy inflates trust return');
  assert(applyDifficulty('trust-return', 12, { tripled:30 }, hard) < 12, 'hard deflates trust return');

  // pg-contribute
  assert(applyDifficulty('pg-contribute', 5, {}, easy) >= 5, 'easy inflates pg contribution');
  assert(applyDifficulty('pg-contribute', 5, {}, hard) <= 5, 'hard deflates pg contribution');

  // ultimatum-propose (opp keeps — hard keeps more)
  assert(applyDifficulty('ultimatum-propose', 62, {}, easy) < 62, 'easy: opp keeps less');
  assert(applyDifficulty('ultimatum-propose', 62, {}, hard) > 62, 'hard: opp keeps more');

  // bargain-counter (smaller concession = harder)
  const ctx = { currentOppOffer: 80, trueVal: 60 };
  const counterEasy = applyDifficulty('bargain-counter', 70, ctx, easy); // concession=10, easy inflates → bigger drop
  const counterHard = applyDifficulty('bargain-counter', 70, ctx, hard);
  assert(counterEasy <= counterHard, 'easy makes bigger bargain concession than hard');
}

// ─── Test 10: TRUMP_BOSS + canUnlockBoss ─────────────────────────────────────
console.log('\n[10] TRUMP_BOSS + canUnlockBoss');
{
  const { TRUMP_BOSS, canUnlockBoss, isGrandMaster, getRank } = G;

  assert(TRUMP_BOSS !== undefined,          'TRUMP_BOSS 存在');
  assert(TRUMP_BOSS && TRUMP_BOSS.id === 'trumpBoss', 'id = trumpBoss');
  assert(TRUMP_BOSS && TRUMP_BOSS.boss === true,       'boss = true');
  assert(TRUMP_BOSS && TRUMP_BOSS.assert >= 0.95,      'assert >= 0.95');

  // Rank check
  assert(getRank(0, 0) === '新兵',          'getRank 0局 = 新兵');
  const gmPlayer = { total: 35, wins: 30 };
  assert(getRank(gmPlayer.total, gmPlayer.wins) === '宗师级', '宗师级条件满足');

  // Unlock gating
  assert(!canUnlockBoss({ total:5, wins:4 }, 'extreme'),   '非宗师 → 不解锁');
  assert(!canUnlockBoss(gmPlayer, 'hard'),                  '宗师+高级 → 不解锁');
  assert(!canUnlockBoss(gmPlayer, 'medium'),                '宗师+中级 → 不解锁');
  assert( canUnlockBoss(gmPlayer, 'extreme'),               '宗师+终局 → 解锁');
  assert(!canUnlockBoss(null, 'extreme'),                   'null player → 不解锁');
}

// ─── Test 11: detectWeakPoints ────────────────────────────────────────────────
console.log('\n[11] detectWeakPoints');
{
  const { detectWeakPoints } = G;

  // No data → no weak points
  assert(detectWeakPoints(null).length === 0, 'null profile → empty');

  // Low assert
  const lowAssert = { assert:0.20, depth:0.55, adapt:0.50, risk:0.25, emotion:0.45, fairness:0.50 };
  assert(detectWeakPoints(lowAssert).includes('主张强度不足'), 'low assert → 主张强度不足');

  // Low depth
  const lowDepth = { assert:0.35, depth:0.35, adapt:0.50, risk:0.30, emotion:0.50, fairness:0.50 };
  assert(detectWeakPoints(lowDepth).includes('策略深度不足'), 'low depth → 策略深度不足');

  // Good profile → no weak points
  const strong = { assert:0.50, depth:0.60, adapt:0.55, risk:0.35, emotion:0.60, fairness:0.60 };
  assert(detectWeakPoints(strong).length === 0, 'strong profile → no weak points');

  // fairness trap
  const trap = { assert:0.20, depth:0.55, adapt:0.50, risk:0.30, emotion:0.50, fairness:0.80 };
  const tw = detectWeakPoints(trap);
  assert(tw.includes('公平敏感偏高，可能过度让步'), 'fairness trap detected');
}

// ─── Test 12: recorder enriches session fields ────────────────────────────────
console.log('\n[12] recorder — session 包含 scenarioKey / opponentId / difficulty');
{
  const { EventBus, EVENTS, Store } = G;
  Store.set('difficulty', 'hard');
  const player = loadPlayer('test_rec');
  Store.set('player', player);

  let captured = null;
  EventBus.on(EVENTS.GAME_START, () => {}); // already registered by runner

  // Manually fire game:end with minimal result
  EventBus.emit(EVENTS.GAME_END, {
    result: { kind:'prisoners', rounds:[], playerScore:10, oppScore:8, outcome:'win', summary:'' }
  });

  const lr = Store.get('lastResult');
  assert(lr !== null, 'lastResult 存在');

  // Check that session was added with new fields
  const savedPlayer = Store.get('player');
  const lastSess = savedPlayer && savedPlayer.sessions.slice(-1)[0];
  assert(lastSess && lastSess.difficulty === 'hard', 'session.difficulty = hard');
  assert(lastSess && 'scenarioKey' in lastSess, 'session.scenarioKey 字段存在');
  assert(lastSess && 'opponentId' in lastSess, 'session.opponentId 字段存在');
}

// ─── Test v4Pro-1: 跨局记忆 ────────────────────────────────────────────────────
console.log('\n[v4Pro-1] 跨局记忆 reputation');
{
  const { freshReputation, updateReputation, applyReputation, loadReputation } = G;
  assert(typeof freshReputation === 'function', 'freshReputation 已导出');

  // 清理上一次测试残留
  for (const k of Object.keys(lsStore)) {
    if (k.startsWith('gts_reputation_')) delete lsStore[k];
  }

  const fresh = freshReputation();
  assert(fresh.games === 0 && fresh.coopRate === 0.5, '新档默认值正确');

  // <2 局 → bias=0
  const eff0 = applyReputation('rational', fresh);
  assert(eff0.openerBias === 0, '<2 局 openerBias=0');

  // 两局连胜 + 高合作率 → bias > 0
  updateReputation('rational', { coopRate: 0.8, aggression: 0.2, avgConcession: 6 }, 'win');
  updateReputation('rational', { coopRate: 0.8, aggression: 0.2, avgConcession: 6 }, 'win');
  const repHigh = loadReputation('rational');
  const eff1 = applyReputation('rational', repHigh);
  assert(eff1.openerBias > 0, `高合作率 + 连胜 → bias>0 (=${eff1.openerBias.toFixed(2)})`);

  // 持久化验证
  const persisted = loadReputation('rational');
  assert(persisted.games === 2, '持久化 games=2');
  assert(persisted.lastOutcome === 'win', '持久化 lastOutcome=win');

  // bias 上限不超过 0.4
  for (let i = 0; i < 8; i++) updateReputation('rational', { coopRate: 0.95, aggression: 0.1, avgConcession: 8 }, 'win');
  const repMax = loadReputation('rational');
  const effMax = applyReputation('rational', repMax);
  assert(effMax.openerBias <= 0.4, `bias 上限 ≤ 0.4 (=${effMax.openerBias.toFixed(2)})`);
}

// ─── Test v4Pro-2: 情绪伪装 ────────────────────────────────────────────────────
console.log('\n[v4Pro-2] 情绪伪装 deception');
{
  const { Mood } = G;
  assert(typeof Mood.setDeception === 'function', 'Mood.setDeception 已导出');
  assert(typeof Mood.getDeceptiveSnapshot === 'function', 'getDeceptiveSnapshot 已导出');

  // easy: 关闭伪装，返回真值
  Mood.setDeception('easy');
  assert(!Mood.isDeceptionActive(), 'easy 不启用伪装');
  Mood.reset('test-opp', { id: 'rational', assert: 0.5 });
  const real = Mood.get('test-opp');
  const snap = Mood.getDeceptiveSnapshot('test-opp', { id: 'rational' });
  assert(snap.trust === real.trust, 'easy: 快照=真实');

  // hell + manipulative: 启用强伪装
  Mood.setDeception('hell');
  assert(Mood.isDeceptionActive(), 'hell 启用伪装');
  assert(Mood.getDeceptionLevel() === 3, 'hell level=3');

  Mood.reset('test-manip', { id: 'manipulative', assert: 0.8 });
  // 调用 1 次伪装快照，应该不会等于真实快照（除非 RNG 极端）
  let diffsFound = 0;
  for (let i = 0; i < 10; i++) {
    const r = Mood.get('test-manip');
    const s = Mood.getDeceptiveSnapshot('test-manip', { id: 'manipulative' });
    if (Math.abs(s.confidence - r.confidence) > 0.01 || Math.abs(s.anger - r.anger) > 0.01) diffsFound++;
  }
  assert(diffsFound >= 8, `hell+manipulative: 10次至少 8 次有偏移 (=${diffsFound})`);

  // hell + cooperative: 伪装强度减半（manipTendency=0.5）
  Mood.reset('test-coop', { id: 'cooperative', assert: 0.3 });
  let coopDiffs = 0;
  for (let i = 0; i < 10; i++) {
    const r = Mood.get('test-coop');
    const s = Mood.getDeceptiveSnapshot('test-coop', { id: 'cooperative' });
    if (Math.abs(s.confidence - r.confidence) > 0.01) coopDiffs++;
  }
  assert(coopDiffs >= 5, `hell+cooperative: 仍有伪装但强度较弱 (=${coopDiffs})`);

  // 关闭再验证
  Mood.setDeception('easy');
  assert(!Mood.isDeceptionActive(), '关闭伪装');
}

// ─── Test v4Pro-3: 动态锚定 / 蚕食 ─────────────────────────────────────────────
console.log('\n[v4Pro-3] 蚕食机制 cram');
{
  const { BaseScenario, Store } = G;
  assert(typeof BaseScenario === 'function', 'BaseScenario 已导出');

  // easy: 无蚕食
  Store.set('difficulty', 'easy');
  const easy = new BaseScenario({ id: 'aggressive', name: '钢铁王', boss: false });
  assert(easy._maxCramAttempts === 0, 'easy: maxCramAttempts=0');
  assert(easy.tryCram({ round: 2, totalRounds: 5 }) === null, 'easy: 不触发');

  // hell: 最高 3 次
  Store.set('difficulty', 'hell');
  const hell = new BaseScenario({ id: 'aggressive', name: '钢铁王', boss: false });
  assert(hell._maxCramAttempts === 3, 'hell: maxCramAttempts=3');

  // 强行尝试 30 次，应至少有 1 次触发（hell + aggressive）
  let triggered = 0;
  for (let i = 0; i < 30; i++) {
    if (hell._cramAttempts >= hell._maxCramAttempts) break;
    hell._cramCooldown = 0; // 强制清除冷却
    const r = hell.tryCram({ round: 2, totalRounds: 5, text: 'test' });
    if (r) { triggered++; hell.consumeCram(); }
  }
  assert(triggered >= 1, `hell + aggressive 触发 ≥ 1 次 (=${triggered})`);
  assert(hell._cramAttempts <= hell._maxCramAttempts, '不超过 max 次数');

  // cooperative 永不触发（非 Boss / aggressive / manipulative）
  const coop = new BaseScenario({ id: 'cooperative', name: '和谐李', boss: false });
  let coopTrig = 0;
  for (let i = 0; i < 30; i++) {
    coop._cramCooldown = 0;
    if (coop.tryCram({ round: 2, totalRounds: 5 })) coopTrig++;
  }
  assert(coopTrig === 0, 'cooperative 永不蚕食');

  // 中期外（第 0 轮或最后一轮）不触发
  Store.set('difficulty', 'hell');
  const edge = new BaseScenario({ id: 'aggressive', name: '钢铁王', boss: false });
  assert(edge.tryCram({ round: 0, totalRounds: 5 }) === null, '第 0 轮不触发');
  edge._cramCooldown = 0;
  assert(edge.tryCram({ round: 4, totalRounds: 5 }) === null, '最后一轮不触发');

  // Boss 启用
  const boss = new BaseScenario({ id: 'trumpBoss', name: '极限交易者', boss: true });
  let bossTrig = 0;
  for (let i = 0; i < 30; i++) {
    if (boss._cramAttempts >= boss._maxCramAttempts) break;
    boss._cramCooldown = 0;
    const r = boss.tryCram({ round: 2, totalRounds: 5, text: 'boss' });
    if (r) { bossTrig++; boss.consumeCram(); }
  }
  assert(bossTrig >= 1, `Boss 启用 ≥ 1 次 (=${bossTrig})`);

  // cramControls / consumeCram
  const c = new BaseScenario({ id: 'trumpBoss', name: 'Boss', boss: true });
  c._pendingCram = { text: 'hello', kind: 'bargaining' };
  const ctrl = c.cramControls();
  assert(ctrl.includes('hello'), 'cramControls 包含文本');
  assert(ctrl.includes('resist-cram'), '含拒绝按钮');
  assert(ctrl.includes('accept-cram'), '含接受按钮');
  c.consumeCram();
  assert(c._pendingCram === null, 'consumeCram 清空');
  assert(c.cramControls() === '', '无 pending 时返回空');

  // 还原 difficulty
  Store.set('difficulty', 'medium');
}

// ─── Test v4Pro-4: 蚕食在 bargaining/crisis/coalition 三场景接入 ───────────────
console.log('\n[v4Pro-4] 蚕食场景接入');
{
  const { BargainingGame, CrisisNegotiation, CoalitionGame, Store, EventBus, EVENTS } = G;
  assert(typeof BargainingGame === 'function', 'BargainingGame 已导出');
  assert(typeof CrisisNegotiation === 'function', 'CrisisNegotiation 已导出');
  assert(typeof CoalitionGame === 'function', 'CoalitionGame 已导出');

  // bargaining: hell 难度 + Boss → 强制注入 cram，验证 handleAction 走 resist 分支
  Store.set('difficulty', 'hell');
  const bg = new BargainingGame({ id: 'trumpBoss', name: 'Boss', boss: true });
  bg._pendingCram = { text: 'test bargain', kind: 'bargaining' };
  const trueValBefore = bg.trueVal;
  let rendered = false;
  const offHandler = EventBus.on(EVENTS.GAME_RENDER, () => { rendered = true; });
  bg.handleAction({ type: 'resist-cram', value: '' });
  assert(bg._pendingCram === null, 'bargaining resist 清空 pending');
  assert(bg.trueVal === trueValBefore, 'bargaining resist 不改 trueVal');
  rendered = false;
  bg._pendingCram = { text: 't', kind: 'bargaining' };
  bg.handleAction({ type: 'accept-cram', value: '' });
  assert(bg.trueVal > trueValBefore, 'bargaining accept 提高 trueVal');

  // crisis
  const cr = new CrisisNegotiation({ id: 'trumpBoss', name: 'Boss', type: 'boss', desc: '极限', boss: true });
  cr.playerScore = 30; cr.oppScore = 20;
  cr._pendingCram = { text: 't', kind: 'crisis' };
  cr.handleAction({ type: 'resist-cram', value: '' });
  assert(cr.oppScore === 25, 'crisis resist 风险 +5');
  assert(cr.playerScore === 30, 'crisis resist 不扣分');
  cr._pendingCram = { text: 't', kind: 'crisis' };
  cr.handleAction({ type: 'accept-cram', value: '' });
  assert(cr.playerScore === 22, 'crisis accept 扣 8 分');
  assert(cr.oppScore === 20, 'crisis accept 风险 -5');

  // coalition
  const co = new CoalitionGame({ id: 'trumpBoss', name: 'Boss', boss: true });
  co.playerScore = 30; co.allies = 2;
  co._pendingCram = { text: 't', kind: 'coalition' };
  co.handleAction({ type: 'resist-cram', value: '' });
  assert(co.allies === 1, 'coalition resist 失 1 盟友');
  co._pendingCram = { text: 't', kind: 'coalition' };
  co.handleAction({ type: 'accept-cram', value: '' });
  assert(co.playerScore === 22, 'coalition accept 稀释 8 分');

  // 还原
  Store.set('difficulty', 'medium');
}

// ─── 汇总 ─────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) process.exit(1);
