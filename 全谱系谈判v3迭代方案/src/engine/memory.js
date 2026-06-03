// engine/memory.js — 跨回合记忆：对手对"当前玩家"的累计认知
// 单局内有效，每局开始 reset。用指数滑动平均使近期行为权重更高。

import { ema } from './util.js';

const _mem = new Map();

function fresh() {
  return {
    rounds: 0,
    coop: 0,            // 玩家合作次数
    defect: 0,          // 玩家背叛次数
    coopRate: 0.5,      // 滑动合作率
    betrayalStreak: 0,  // 当前连续背叛
    aggression: 0.5,    // 玩家激进度（极端施压频率）
    avgConcession: 0,   // 谈判平均让步幅度
    investFraction: 0.5,// 信任博弈投入比例
    firmCount: 0,       // 玩家强硬/防御次数
    exposureScore: 0,   // 操纵者被识破累计分
  };
}

export const Memory = {
  reset(id) { _mem.set(id, fresh()); },

  get(id) {
    if (!_mem.has(id)) _mem.set(id, fresh());
    return _mem.get(id);
  },

  // 观察玩家一次行为，更新认知。signal 字段均可选。
  observe(id, sig = {}) {
    const m = this.get(id);
    m.rounds += 1;
    if (sig.coop === true) { m.coop += 1; m.coopRate = ema(m.coopRate, 1); m.betrayalStreak = 0; }
    if (sig.coop === false) { m.defect += 1; m.coopRate = ema(m.coopRate, 0); m.betrayalStreak += 1; }
    if (sig.aggression != null) m.aggression = ema(m.aggression, sig.aggression);
    if (sig.concession != null) m.avgConcession = ema(m.avgConcession, sig.concession);
    if (sig.investFraction != null) m.investFraction = ema(m.investFraction, sig.investFraction);
    if (sig.firm) m.firmCount += 1;
    if (sig.exposes) m.exposureScore += 1;
    return m;
  },
};
