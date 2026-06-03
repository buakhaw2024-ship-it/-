// engine/strategies/aggressive.js — 钢铁王·强硬鹰派型
// 核心：高开价、小让步、施压。破绽：合理反压使 confidence 跌破阈值后被迫妥协。

import { chance } from '../util.js';

export default function aggressive(ctx, persona, mem, mood) {
  const cracked = mood.confidence < 0.35; // 被合理反压压垮

  switch (ctx.kind) {
    case 'pd': {
      if (cracked && ctx.round > 0) return { move: 'coop', reason: '气势被你压住，转向合作' };
      return chance(0.78)
        ? { move: 'defect', reason: '鹰派本能：施压背叛' }
        : { move: 'coop', reason: '偶尔试探性合作' };
    }
    case 'trust-return': {
      const frac = cracked ? 0.35 : 0.15;
      return { move: Math.round(ctx.tripled * frac), reason: cracked ? '底气受挫，略作返还' : '强硬：返还极少' };
    }
    case 'bargain-counter': {
      const red = cracked ? 12 : 3 + (chance(0.5) ? 2 : 0); // 破绽：confidence 低 → 大幅让步
      return {
        move: Math.max(ctx.trueVal, Math.round(ctx.currentOppOffer - red)),
        reason: cracked ? '被合理反压，被迫大幅妥协' : '寸土必争，几乎不让',
      };
    }
    case 'pg-contribute':
      return { move: cracked ? 5 : 2, reason: cracked ? '有所收敛' : '搭便车，贡献极低' };
    case 'ultimatum-propose':
      return { move: cracked ? 58 : 70, reason: cracked ? '气焰收敛' : '狮子大开口，自留七成' };
    case 'ultimatum-respond': {
      const share = 100 - ctx.playerKeep;
      const need = cracked ? 35 : 45;
      return { move: share >= need, reason: share >= need ? '勉强接受' : '嫌少，拒绝施压' };
    }
    default:
      return { move: null, reason: '' };
  }
}
