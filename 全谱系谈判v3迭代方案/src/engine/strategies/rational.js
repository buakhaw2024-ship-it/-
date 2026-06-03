// engine/strategies/rational.js — 陈逻辑·理性分析型
// 核心：收益最大化 + 严格以牙还牙；强记忆驱动，弱情绪。破绽：完全可预测。

import { clamp, chance } from '../util.js';

export default function rational(ctx, persona, mem, mood) {
  switch (ctx.kind) {
    case 'pd': {
      if (ctx.round === 0) return { move: 'coop', reason: '首轮释放善意，建立可预期的互惠' };
      return ctx.playerLastMove === 'defect'
        ? { move: 'defect', reason: '以牙还牙：你上轮背叛，我镜像回应' }
        : { move: 'coop', reason: '以牙还牙：你上轮合作，我维持互惠' };
    }
    case 'trust-return': {
      const frac = clamp(0.40 + 0.25 * mood.trust);
      return { move: Math.round(ctx.tripled * frac), reason: `按信任度理性返还约 ${Math.round(frac * 100)}%` };
    }
    case 'bargain-counter': {
      const red = 5 * (1 - mem.aggression * 0.5) + (chance(0.5) ? 1 : 0);
      const off = Math.max(ctx.trueVal, Math.round(ctx.currentOppOffer - red));
      return { move: off, reason: '按期望值小幅让步，你越强硬我让得越少' };
    }
    case 'pg-contribute': {
      const c = ctx.playerLastContrib == null ? 5 : Math.round(ctx.playerLastContrib * 0.9);
      return { move: clamp(c, 0, 10), reason: '条件合作：贡献与你上轮基本对齐' };
    }
    case 'ultimatum-propose':
      return { move: 57, reason: '锚定接近理性均衡的 57' };
    case 'ultimatum-respond': {
      const share = 100 - ctx.playerKeep;
      return { move: share >= 25, reason: share >= 25 ? '理性接受：有正收益就拿' : '拒绝：收益过低不值得' };
    }
    default:
      return { move: null, reason: '' };
  }
}
