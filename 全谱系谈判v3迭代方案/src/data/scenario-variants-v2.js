// data/scenario-variants-v2.js — 场景情境变量包
// 每个变体包含：context（背景文本）/ hint（提示）/ stakes（多维筹码）/ successMetric（胜利指标）
// hiddenObjectivePool / eventPool / moodBias（开局情绪偏置）

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { Store } from '../core/store.js';
import { Mood } from '../engine/mood.js';
import { clamp } from '../engine/util.js';
import { savePlayer } from '../analytics/player-data.js';

export const SCENARIO_VARIANTS_V2 = {
  prisoners: [
    {
      id: 'pd_classic', name: '经典囚徒困境',
      context: '你和${opp}因涉嫌合伙盗窃被分别审讯。警方给出交易条件。',
      hint: '合作=沉默；背叛=供出对方。重复博弈中，信任修复比单轮收益更重要。',
      stakes: { money: 0.2, relationship: 0.5, reputation: 0.4, timePressure: 0.7, publicPressure: 0.1 },
      successMetric: ['总分', '合作率', '末轮互信'],
      hiddenObjectivePool: ['restoreTrust', 'avoidMutualDefect'],
      eventPool: ['silencePressure', 'newEvidence', 'deadlineThreat'],
      moodBias: { trust: -0.05, anger: 0.05 },
    },
    {
      id: 'pd_market', name: '市场份额博弈',
      context: '你和${opp}是市场上仅有的两家供应商。双方可以维持高价，也可以降价抢市场。',
      hint: '合作=维持价格；背叛=降价抢市场。短期抢量可能引发长期价格战。',
      stakes: { money: 0.9, relationship: 0.3, reputation: 0.6, timePressure: 0.4, publicPressure: 0.5 },
      successMetric: ['利润', '市场稳定', '长期信誉'],
      hiddenObjectivePool: ['avoidPriceWar', 'avoidMutualDefect'],
      eventPool: ['marketRumor', 'publicPressure', 'newEvidence'],
      moodBias: { confidence: 0.05 },
    },
    {
      id: 'pd_alliance', name: '战略联盟评估',
      context: '你的公司和${opp}考虑组建研发联盟。双方都需要投入核心专利。',
      hint: '合作=投入专利；背叛=保留核心技术。真正风险是被对方白嫖。',
      stakes: { money: 0.7, relationship: 0.8, reputation: 0.6, timePressure: 0.3, publicPressure: 0.2 },
      successMetric: ['技术突破', '知识保护', '伙伴关系'],
      hiddenObjectivePool: ['restoreTrust', 'avoidMutualDefect'],
      eventPool: ['silencePressure', 'newEvidence', 'coffeeBreak'],
      moodBias: { trust: 0.05 },
    },
  ],

  ultimatum: [
    {
      id: 'ult_bonus', name: '项目奖金分配',
      context: '你和${opp}共同完成一个项目，公司给出100万元项目奖金，需要由一方提出分配方案。',
      hint: '提议过贪可能被拒绝，过度让利会损失自身收益。',
      stakes: { money: 0.8, relationship: 0.6, reputation: 0.6, timePressure: 0.4, publicPressure: 0.2 },
      successMetric: ['收益', '公平感', '后续合作'],
      hiddenObjectivePool: ['fairButFirm', 'avoidEscalation'],
      eventPool: ['coffeeBreak', 'deadlineThreat', 'publicPressure'],
      moodBias: { trust: 0.05 },
    },
    {
      id: 'ult_divorce', name: '高压财产分割',
      context: '你和${opp}正在进行财产分割谈判。拒绝协议会导致漫长诉讼。',
      hint: '拒绝不是零成本。公平、情绪、时间成本会同时影响选择。',
      unlockDifficulty: 'hard',
      stakes: { money: 0.9, relationship: 0.2, reputation: 0.4, timePressure: 0.8, publicPressure: 0.3 },
      successMetric: ['净收益', '诉讼风险', '情绪控制'],
      hiddenObjectivePool: ['avoidEscalation', 'fairButFirm'],
      eventPool: ['deadlineThreat', 'publicPressure', 'newEvidence'],
      moodBias: { anger: 0.15, patience: -0.1 },
    },
  ],

  trust: [
    {
      id: 'trust_invest', name: '创业投资',
      context: '你是投资人，${opp}是创业者。你决定投入金额，他决定回报比例。',
      hint: '投入越多，回报潜力越大；但对方也可能利用你的信任。',
      stakes: { money: 0.8, relationship: 0.7, reputation: 0.5, timePressure: 0.3, publicPressure: 0.2 },
      successMetric: ['投资回报', '信任校准', '风险控制'],
      hiddenObjectivePool: ['restoreTrust', 'askForEvidence'],
      eventPool: ['newEvidence', 'coffeeBreak', 'silencePressure'],
      moodBias: { trust: 0.05 },
    },
    {
      id: 'trust_loan', name: '私人借贷',
      context: '${opp}向你提出私人借款请求。你决定借多少，对方决定最终偿还多少。',
      hint: '金钱与关系绑定。借太少伤关系，借太多风险失控。',
      stakes: { money: 0.6, relationship: 0.9, reputation: 0.4, timePressure: 0.5, publicPressure: 0.1 },
      successMetric: ['资金安全', '关系维护', '边界表达'],
      hiddenObjectivePool: ['restoreTrust', 'avoidFastConcession'],
      eventPool: ['coffeeBreak', 'newEvidence', 'silencePressure'],
      moodBias: { anger: -0.03, trust: 0.08 },
    },
  ],

  bargaining: [
    {
      id: 'bar_car', name: '二手车交易',
      context: '你想买${opp}的车。他开价${start}，你的心理价位接近${trueVal}。',
      hint: '价格只是表层，车况、付款方式、交付时间都可以成为筹码。',
      stakes: { money: 0.9, relationship: 0.2, reputation: 0.2, timePressure: 0.5, publicPressure: 0.1 },
      successMetric: ['成交价', '让步纪律', '信息收集'],
      hiddenObjectivePool: ['avoidFastConcession', 'askForEvidence'],
      eventPool: ['newEvidence', 'deadlineThreat', 'silencePressure'],
      moodBias: { confidence: 0.05 },
    },
    {
      id: 'bar_salary', name: '薪资谈判',
      context: '你拿到了${opp}公司的 offer。对方给出${start}k月薪，你期望接近${trueVal}k。',
      hint: '薪资、奖金、期权、入职时间、职级都可以打包交换。',
      unlockDifficulty: 'hard',
      stakes: { money: 0.8, relationship: 0.7, reputation: 0.7, timePressure: 0.6, publicPressure: 0.1 },
      successMetric: ['总包', '关系', '入职条件'],
      hiddenObjectivePool: ['packageDeal', 'avoidFastConcession'],
      eventPool: ['deadlineThreat', 'coffeeBreak', 'newEvidence'],
      moodBias: { patience: 0.05 },
    },
  ],

  crisis: [
    {
      id: 'crisis_hostage', name: '人质劫持事件',
      context: '${opp}劫持了一座大楼，声称持有危险物。你是现场谈判代表。',
      hint: '目标不是赢辩论，而是降温、稳住、换取安全动作。',
      stakes: { money: 0.1, relationship: 0.4, reputation: 0.9, timePressure: 0.9, publicPressure: 0.8 },
      successMetric: ['情绪降温', '安全承诺', '避免升级'],
      hiddenObjectivePool: ['avoidEscalation', 'restoreTrust'],
      eventPool: ['publicPressure', 'deadlineThreat', 'newEvidence'],
      moodBias: { anger: 0.2, patience: -0.15 },
    },
    {
      id: 'crisis_social', name: '社交媒体危机',
      context: '${opp}在公开平台持续抨击你的组织，舆论热度正在上升。',
      hint: '公开场域下，每一句话都可能被截图传播。',
      unlockDifficulty: 'hard',
      stakes: { money: 0.5, relationship: 0.5, reputation: 1.0, timePressure: 0.8, publicPressure: 1.0 },
      successMetric: ['舆论降温', '事实澄清', '关系修复'],
      hiddenObjectivePool: ['avoidEscalation', 'askForEvidence'],
      eventPool: ['publicPressure', 'newEvidence', 'deadlineThreat'],
      moodBias: { anger: 0.1, confidence: 0.1 },
    },
  ],

  publicgoods: [
    {
      id: 'pg_community', name: '社区基金',
      context: '你和${opp}都是社区居民。每人决定向公共基金投入多少。',
      hint: '公共收益会被共享，但每个人都有搭便车冲动。',
      stakes: { money: 0.4, relationship: 0.8, reputation: 0.8, timePressure: 0.2, publicPressure: 0.6 },
      successMetric: ['集体收益', '个人收益', '声誉'],
      hiddenObjectivePool: ['restoreTrust', 'fairButFirm'],
      eventPool: ['publicPressure', 'coffeeBreak', 'newEvidence'],
      moodBias: { trust: 0.08 },
    },
  ],

  coalition: [
    {
      id: 'coalition_board', name: '董事会联盟',
      context: '你需要在董事会中协调多方，与${opp}争夺关键支持票。',
      hint: '多方博弈中，单点胜利不等于联盟稳定。',
      stakes: { money: 0.7, relationship: 0.8, reputation: 0.8, timePressure: 0.6, publicPressure: 0.5 },
      successMetric: ['支持票', '联盟稳定', '未来合作'],
      hiddenObjectivePool: ['packageDeal', 'restoreTrust'],
      eventPool: ['publicPressure', 'newEvidence', 'coffeeBreak'],
      moodBias: { confidence: 0.05 },
    },
  ],
};

const DIFF_ORDER_V2 = ['easy', 'medium', 'hard', 'extreme', 'hell'];

export function canUseVariant(v, difficulty) {
  if (!v.unlockDifficulty) return true;
  return DIFF_ORDER_V2.indexOf(difficulty || 'medium') >= DIFF_ORDER_V2.indexOf(v.unlockDifficulty);
}

export function pickScenarioVariantV2(scenarioKey, difficulty) {
  const pool = SCENARIO_VARIANTS_V2[scenarioKey] || [];
  const available = pool.filter((v) => canUseVariant(v, difficulty));
  if (!available.length) return null;

  const player = Store.get('player');
  const lastMap = player && player._lastVariants ? player._lastVariants : {};
  const lastId = lastMap[scenarioKey];

  const filtered = available.filter((v) => v.id !== lastId);
  const list = filtered.length ? filtered : available;
  const chosen = list[Math.floor(Math.random() * list.length)];

  if (player) {
    player._lastVariants = player._lastVariants || {};
    player._lastVariants[scenarioKey] = chosen.id;
    savePlayer(player);
    Store.set('player', player);
  }

  Store.set('activeVariant', chosen);
  if (EVENTS.EXPERIENCE_VARIANT_PICKED) {
    EventBus.emit(EVENTS.EXPERIENCE_VARIANT_PICKED, { scenarioKey, variant: chosen });
  }
  return chosen;
}

export function previewVariantName(scenarioKey, difficulty) {
  const pool = SCENARIO_VARIANTS_V2[scenarioKey] || [];
  const available = pool.filter((v) => canUseVariant(v, difficulty));
  if (!available.length) return '';
  const v = available[Math.floor(Math.random() * available.length)];
  return v.name;
}

export function renderVariantText(template, opp, params = {}) {
  if (!template) return '';
  return template
    .replace(/\$\{opp\}/g, opp ? opp.name : '对手')
    .replace(/\$\{start\}/g, String(params.start || 80))
    .replace(/\$\{trueVal\}/g, String(params.trueVal || 55))
    .replace(/\$\{total\}/g, String(params.total || 100));
}

export function applyVariantMoodBias(oppId, variant) {
  if (!oppId || !variant || !variant.moodBias) return;
  const m = Mood.get(oppId);
  Object.entries(variant.moodBias).forEach(([key, delta]) => {
    if (typeof m[key] === 'number') m[key] = clamp(m[key] + delta, 0, 1);
  });
}
