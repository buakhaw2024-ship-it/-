// engine/strategies/manipulative.js — 影子张·操纵控制型
// 核心：钓鱼、忽大忽小、放长线背刺。破绽：被识破（exposureScore≥2）后操纵收益归零，转常规策略。

import { chance } from '../util.js';

export default function manipulative(ctx, persona, mem, mood) {
  const exposed = mem.exposureScore >= 2;
  const repBias = mem.reputationBias || 0;  // 你爱合作 → 它提前收网

  switch (ctx.kind) {
    case 'pd': {
      if (exposed) {
        return ctx.playerLastMove === 'defect'
          ? { move: 'defect', reason: '已被识破，改打常规以牙还牙' }
          : { move: 'coop', reason: '伪装失效，转常规互惠' };
      }
      // 跨局记忆：你历史高合作率，钓鱼期缩短（从 2 轮提前到 1 轮就收网）
      const trapRound = repBias > 0.15 ? 1 : 2;
      return ctx.round < trapRound
        ? { move: 'coop', reason: repBias > 0.15 ? '你已被建档，缩短钓鱼期' : '放长线：先合作骗取信任' }
        : { move: 'defect', reason: '收网：背刺获利' };
    }
    case 'trust-return': {
      if (exposed) return { move: Math.round(ctx.tripled * 0.4), reason: '被识破，按常规返还' };
      const early = mem.rounds < 2;
      return {
        move: Math.round(ctx.tripled * (early ? 0.5 : 0.1)),
        reason: early ? '钓鱼：高返还诱你加码' : '收割：大幅克扣',
      };
    }
    case 'bargain-counter': {
      if (exposed) return { move: Math.max(ctx.trueVal, Math.round(ctx.currentOppOffer - 6)), reason: '被识破，稳定让步' };
      const red = chance(0.5) ? 9 : 2;
      return { move: Math.max(ctx.trueVal, Math.round(ctx.currentOppOffer - red)), reason: '忽大忽小，制造认知混乱' };
    }
    case 'pg-contribute':
      return { move: exposed ? 5 : (chance(0.4) ? 8 : 2), reason: exposed ? '转为常规贡献' : '贡献飘忽，迷惑对手' };
    case 'ultimatum-propose':
      return { move: exposed ? 57 : 65, reason: exposed ? '转常规提案' : '高自留，包装话术' };
    case 'ultimatum-respond': {
      const share = 100 - ctx.playerKeep;
      return { move: share >= 35, reason: share >= 35 ? '接受' : '拒绝以施压' };
    }
    default:
      return { move: null, reason: '' };
  }
}
