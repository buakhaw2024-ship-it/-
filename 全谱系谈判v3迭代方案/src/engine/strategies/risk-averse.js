// engine/strategies/risk-averse.js — 稳健吴·风险规避型
// 核心：偏好确定性、回避极端、接受"足够好"。破绽：压力下（耐心耗尽/对手强硬）过度让步。

import { chance } from '../util.js';

export default function riskAverse(ctx, persona, mem, mood) {
  const pressured = mood.patience < 0.4 || mem.aggression > 0.6; // 压力下过度让步

  switch (ctx.kind) {
    case 'pd':
      return chance(0.70)
        ? { move: 'coop', reason: '规避双输风险，倾向稳定合作' }
        : { move: 'defect', reason: '谨慎自保' };
    case 'trust-return':
      return { move: Math.round(ctx.tripled * 0.4), reason: '稳健返还，留有余地' };
    case 'bargain-counter': {
      const red = pressured ? 11 : 6 + (chance(0.5) ? 3 : 0);
      return {
        move: Math.max(ctx.trueVal, Math.round(ctx.currentOppOffer - red)),
        reason: pressured ? '压力之下过度让步（破绽）' : '稳健小步让',
      };
    }
    case 'pg-contribute':
      return { move: 5, reason: '中庸贡献，避免极端' };
    case 'ultimatum-propose':
      return { move: 55, reason: '求稳，留略多但不贪' };
    case 'ultimatum-respond': {
      const share = 100 - ctx.playerKeep;
      return { move: share >= 25, reason: share >= 25 ? '接受以规避零收益风险' : '过低，拒绝' };
    }
    default:
      return { move: null, reason: '' };
  }
}
