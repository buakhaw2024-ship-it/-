// engine/reputation.js — 跨局记忆：对手记住你的历史风格，并用它调整开局倾向
// 数据存在 localStorage `gts_reputation_<oppId>` 下，每个对手独立一份记录。

import { clamp, ema } from './util.js';

const REP_KEY_PREFIX = 'gts_reputation_';

export function freshReputation() {
  return {
    games: 0,                 // 与该对手交手次数
    wins: 0,                  // 你赢的次数
    coopRate: 0.5,            // 你对该对手的平均合作率（EMA）
    aggressionRate: 0.5,      // 你的平均激进率（EMA）
    avgConcession: 5,         // 你的平均让步幅度（EMA）
    lastOutcome: null,        // 上一场结果: 'win'|'lose'|'draw'|'coop'
    latestStrategies: [],     // 最近 5 场的合作率
  };
}

export function loadReputation(oppId) {
  if (typeof localStorage === 'undefined') return freshReputation();
  try {
    const saved = localStorage.getItem(REP_KEY_PREFIX + oppId);
    if (saved) return { ...freshReputation(), ...JSON.parse(saved) };
  } catch (e) { /* ignore */ }
  return freshReputation();
}

export function saveReputation(oppId, rep) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(REP_KEY_PREFIX + oppId, JSON.stringify(rep));
  } catch (e) { /* ignore */ }
}

// 一局结束后调用：累计该对手的跨局记忆
export function updateReputation(oppId, playerStats, outcome) {
  const rep = loadReputation(oppId);
  rep.games += 1;
  if (outcome === 'win' || outcome === 'coop') rep.wins += 1;
  rep.coopRate = ema(rep.coopRate, playerStats.coopRate != null ? playerStats.coopRate : 0.5, 0.3);
  rep.aggressionRate = ema(rep.aggressionRate, playerStats.aggression != null ? playerStats.aggression : 0.5, 0.3);
  rep.avgConcession = ema(rep.avgConcession, playerStats.avgConcession != null ? playerStats.avgConcession : 5, 0.3);
  rep.lastOutcome = outcome;
  rep.latestStrategies.push(playerStats.coopRate != null ? playerStats.coopRate : 0.5);
  if (rep.latestStrategies.length > 5) rep.latestStrategies.shift();
  saveReputation(oppId, rep);
  return rep;
}

// 对手装载新一局时调用：根据跨局记忆生成开局偏置
// openerBias: −0.3 ~ +0.4，越高代表对手开局越鹰派/越警惕
export function applyReputation(oppId, rep) {
  if (rep.games < 2) return { openerBias: 0 };

  let bias = 0;
  // 你上局赢了 → 对手警惕，开局更强硬
  if (rep.lastOutcome === 'win') bias += 0.12;
  // 你上局输了 → 对手觉得你弱，略微松懈
  if (rep.lastOutcome === 'lose') bias -= 0.08;

  // 你历史合作率高 → 对手预判你合作，针对性背叛
  if (rep.coopRate > 0.65) bias += 0.15;
  // 你爱背叛 → 对手反而倾向尝试合作钓鱼
  if (rep.coopRate < 0.35) bias -= 0.10;

  // 连续 3 场以上的稳定模式 → 对手摸清你
  if (rep.latestStrategies.length >= 3) {
    const recent = rep.latestStrategies.slice(-3);
    const allHigh = recent.every((r) => r > 0.6);
    const allLow = recent.every((r) => r < 0.4);
    if (allHigh) bias += 0.10;
    if (allLow) bias += 0.05;
  }

  return { openerBias: clamp(bias, -0.3, 0.4) };
}
