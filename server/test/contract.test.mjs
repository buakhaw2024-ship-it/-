// contract.test.mjs — verifies each task type returns the shape the game parses.
// Mocks the upstream model (no network / no key needed).
//   node test/contract.test.mjs

import { handleAiRequest, __test } from '../src/ai-logic.js';
import assert from 'node:assert';

// Mock global fetch -> echo a canned model "content" per task.
let lastBody = null;
const canned = {
  rewrite_response_options: { options: { info: '据你这话，先问清你的底数', lock: '把刚才共识写成可签字条款' } },
  generate_turn: { beat: '别绕了，给个准话。', options: { info: '我先把数摆明', lock: '落到纸面再谈' } },
  generate_coach_note: { review: '净失分·受挫压力权', detail: '依现有数据，你让步过早。', better: '先要对等回应再松口' },
  generate_duel_scenario: { director: { time: '黄昏', location: '军帐', opponent: '吴王' }, phases: [{ title: '开场', openingLine: '你来做什么？' }] },
  _structured: { opponentResponse: '听到了，但条件不够。', opponentHearing: '你有态度，依据不硬。', coachNote: '补事实+交换+底线。', betterNextMove: '依据+边界+空间。', riskSignal: '压迫感不足。', pressureLevel: 3 },
};
globalThis.fetch = async (url, opts) => {
  lastBody = JSON.parse(opts.body);
  const task = (lastBody.__task_for_test) || 'auto';
  // infer task from the system prompt we built
  const sys = lastBody.messages[0].content;
  let key = '_structured';
  if (sys.includes('改写成直接回应')) key = 'rewrite_response_options';
  else if (sys.includes('你扮演谈判对手')) key = 'generate_turn';
  else if (sys.includes('教练') && lastBody.messages[1].content.includes('【事实】')) key = 'generate_coach_note';
  else if (sys.includes('剧本导演')) key = 'generate_duel_scenario';
  const content = JSON.stringify(canned[key]);
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
};

const cfg = { apiKey: 'test-key', model: 'test/model', providerLabel: 'OpenRouter' };
let pass = 0;

async function check(name, body, validate) {
  const out = await handleAiRequest(body, cfg);
  validate(out);
  console.log('✓', name, '→', JSON.stringify(out).slice(0, 90));
  pass++;
}

// 1) rewrite_response_options -> {options:{key:话术}}
await check('rewrite_response_options', {
  task: 'rewrite_response_options', opponentLine: '三亿六成？别拿专访当筹码。',
  options: [{ key: 'info', strategy: '查敌情', skill: '信息获取', sample: '把牌摊一半' }, { key: 'lock', strategy: '锁条款', skill: '终局控制', sample: '落到纸面' }],
}, (o) => {
  assert(o.options && typeof o.options === 'object', 'options object');
  assert(o.options.info && o.options.lock, 'per-key 话术');
});

// 2) generate_turn -> {beat, options}
await check('generate_turn', {
  task: 'generate_turn', opponentName: '开发商本人', priorBeat: '第五大道均价没这么高。',
  weak: '压力权', playerLine: '我们先确认边界。', recent: ['查敌情'],
  options: [{ key: 'info', strategy: '查敌情' }, { key: 'lock', strategy: '锁条款' }], seed: 42,
}, (o) => {
  assert(typeof o.beat === 'string' && o.beat, 'beat string');
  assert(o.options && o.options.info, 'options map');
});

// 3) generate_coach_note (move) -> {review, detail, better}
await check('generate_coach_note(move)', {
  task: 'generate_coach_note', opponentName: '开发商本人', priorBeat: '别拿专访当筹码。',
  facts: '你这手:「借外压」。压力权 50→42(-8)。', env: '信息权领先', weak: '压力权',
}, (o) => {
  assert('review' in o && 'detail' in o && 'better' in o, 'three fields');
  assert(o.review.length > 0, 'review non-empty');
});

// 4) generate_coach_note (decision) -> {review, detail, better}
await check('generate_coach_note(decision)', {
  task: 'generate_coach_note', mode: 'decision', kind: 'trust',
  facts: '总投入12→回收9(净-3)，返还率25%。', opponentName: '掠夺型',
}, (o) => {
  assert('review' in o && 'detail' in o && 'better' in o, 'three fields');
});

// 5) generate_duel_scenario -> {director, phases}
await check('generate_duel_scenario', {
  task: 'generate_duel_scenario', persona: { name: '孙武', style: '兵家', voiceStyle: '冷峻' }, seed: 'sunzi#1',
}, (o) => {
  assert(o.director && typeof o.director === 'object', 'director');
  assert(Array.isArray(o.phases), 'phases array');
});

// 6) structured negotiation turn (no task) -> normalized fields
await check('structured-turn', {
  systemName: '全谱系谈判博弈模拟系统', scenarioName: '曼哈顿地产', opponentName: '开发商本人',
  stage: '开场', roundIndex: 1, totalRounds: 6, playerLine: '先确认边界。', storyChain: null, history: {},
}, (o) => {
  for (const k of ['opponentResponse', 'opponentHearing', 'coachNote', 'betterNextMove', 'riskSignal', 'pressureLevel', 'provider', 'model']) {
    assert(k in o, 'has ' + k);
  }
  assert(o.pressureLevel >= 1 && o.pressureLevel <= 5, 'pressure clamped');
});

// missing key -> throws 500 (game then uses local fallback)
let threw = false;
try { await handleAiRequest({ task: 'generate_turn' }, { apiKey: '' }); } catch (e) { threw = e.status === 500; }
assert(threw, 'missing key -> 500');
console.log('✓ missing key → 500 (game uses local fallback)');
pass++;

console.log('\nALL ' + pass + ' CONTRACT CHECKS PASSED ✅');
