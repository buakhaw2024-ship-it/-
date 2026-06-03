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
               'getProfileType','hasEnoughData','EventBus','EVENTS','Store',
               'OPPONENTS','C','SCENARIO_REGISTRY'];
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

// ─── 汇总 ─────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`结果：${passed} 通过 / ${failed} 失败`);
if (failed > 0) process.exit(1);
