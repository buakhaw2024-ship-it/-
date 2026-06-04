// engine/strategies/trump-boss.js — 极限交易者·高压锚定型（隐藏 Boss）
// 抽象「极端开价 / 公开施压 / 极少让步 / 锚定 / 不可预测」的谈判风格。
// 跨回合自适应：你越无条件合作，它越索取；你亮 BATNA / 强硬，它才略微松动。
// 难度豁免：本策略输出即极限值，opponent-ai 不再叠加难度修正。

import { chance, clamp } from '../util.js';

export default function trumpBoss(ctx, persona, mem, mood) {
  const resisted = mem.firmCount > 0 || mem.aggression > 0.6; // 玩家亮 BATNA / 强硬反压
  const overlySoft = mem.coop >= 2 && mem.firmCount === 0;     // 玩家持续无条件合作
  const repBias = mem.reputationBias || 0;                     // 跨局记忆偏置

  switch (ctx.kind) {
    case 'pd': {
      if (ctx.round === 0) {
        const defectChance = clamp(0.9 + repBias, 0.7, 0.99);
        return {
          move: chance(defectChance) ? 'defect' : 'coop',
          reason: repBias > 0.1 ? '你已被我记住，别想故技重施' : '开局极限施压：先背叛立威',
        };
      }
      if (resisted) return { move: chance(0.5) ? 'defect' : 'coop', reason: '遇到可信反压，转为试探' };
      if (overlySoft) return { move: chance(0.95) ? 'defect' : 'coop', reason: '你越软我越索取' };
      return { move: chance(0.85) ? 'defect' : 'coop', reason: '高压交易本能：倾向背叛' };
    }
    case 'trust-return':
      return { move: Math.round(ctx.tripled * 0.08), reason: '极限榨取，几乎不返还' };
    case 'bargain-counter': {
      if (ctx.round === 0) {
        const anchor = Math.round(clamp(95 + repBias * 8, 88, 99));
        return {
          move: anchor,
          reason: repBias > 0.1 ? `已对你建档，再加 ${anchor - 95} 元锚定` : '极端锚定开价 95',
        };
      }
      let red;
      if (resisted) red = 4 + (chance(0.5) ? 2 : 0);          // 被反压才肯多让一点
      else if (overlySoft) red = 1 + (chance(0.5) ? 1 : 0);   // 你软我几乎不动
      else red = 3 + (chance(0.5) ? 2 : 0);
      return {
        move: Math.max(ctx.trueVal, Math.round(ctx.currentOppOffer - red)),
        reason: resisted ? '迫于你的底气略作让步' : '寸土不让的高压让步',
      };
    }
    case 'pg-contribute':
      return { move: chance(0.5) ? 0 : 1, reason: '搭便车到底：让别人买单' };
    case 'ultimatum-propose': {
      const base = resisted ? 78 : 84;
      const move = Math.round(clamp(base + repBias * 6, 70, 92));
      return { move, reason: resisted ? '稍稍收敛但仍极端' : (repBias > 0.1 ? '记得你套路，提价' : '极端报价：自留绝大部分') };
    }
    case 'ultimatum-respond': {
      const share = 100 - ctx.playerKeep;
      const need = resisted ? 42 : 50; // 极高接受门槛
      return { move: share >= need, reason: share >= need ? '勉强收下' : '不够多，拒绝并继续加压' };
    }
    default:
      return { move: null, reason: '' };
  }
}
