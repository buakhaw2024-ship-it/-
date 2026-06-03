// engine/strategies/cooperative.js — 和谐李·合作共赢型
// 核心：高合作、主动让步。v3 新增"被骗觉醒"：被连续背叛后转宽容版 TfT，避免成为人形提款机。

import { chance } from '../util.js';

export default function cooperative(ctx, persona, mem, mood) {
  const awakened = mem.betrayalStreak >= 2; // 善意被反复利用后觉醒

  switch (ctx.kind) {
    case 'pd': {
      if (awakened) return { move: 'defect', reason: `善意被连续 ${mem.betrayalStreak} 次背叛消耗，宽容版TfT反击` };
      return chance(0.85)
        ? { move: 'coop', reason: '寻求双赢，主动合作' }
        : { move: 'defect', reason: '偶发防御' };
    }
    case 'trust-return': {
      const frac = awakened ? 0.30 : 0.60;
      return { move: Math.round(ctx.tripled * frac), reason: awakened ? '信任受损，返还转保守' : '高度信任，慷慨回馈六成' };
    }
    case 'bargain-counter': {
      const red = awakened ? 6 : 11 + (chance(0.5) ? 2 : 0);
      return {
        move: Math.max(ctx.trueVal, Math.round(ctx.currentOppOffer - red)),
        reason: awakened ? '谨慎让步' : '追求成交，大幅让步',
      };
    }
    case 'pg-contribute':
      return { move: awakened ? 4 : 8, reason: awakened ? '减少贡献以自保' : '带头贡献，造福集体' };
    case 'ultimatum-propose':
      return { move: awakened ? 52 : 46, reason: awakened ? '略偏自保' : '偏向对方的公平分配' };
    case 'ultimatum-respond': {
      const share = 100 - ctx.playerKeep;
      return { move: share >= 30, reason: share >= 30 ? '宽容接受，维系关系' : '实在过低，婉拒' };
    }
    default:
      return { move: null, reason: '' };
  }
}
