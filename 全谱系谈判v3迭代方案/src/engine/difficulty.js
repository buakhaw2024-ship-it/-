// engine/difficulty.js — 难度系统：把难度映射为对手机制修正系数
// 难度真正影响博弈机制（对手慷慨度 / 强硬度 / 接受阈值），而非仅展示。
// Trump Boss 豁免（其行为已校准到极限），由 opponent-ai 调用时判断。

import { Store } from '../core/store.js';

export const DIFFICULTIES = [
  { key: 'easy',    label: '初级' },
  { key: 'medium',  label: '中级' },
  { key: 'hard',    label: '高级' },
  { key: 'extreme', label: '终局挑战' },
];

export function getDifficultyLabel(d) {
  const found = DIFFICULTIES.find((x) => x.key === d);
  return found ? found.label : '中级';
}

// 返回三个修正系数：
//  coopFactor  —— 乘在对手"慷慨度"（返还/贡献/让步）上，>1 对玩家更友好
//  toughFactor —— 乘在对手"强硬度"（锚定/自留）上，>1 更难
//  acceptShift —— 加在最后通牒接受倾向上，正值=更容易接受
export function getDifficultyMod(d) {
  const diff = d || (typeof Store !== 'undefined' ? Store.get('difficulty') : 'medium') || 'medium';
  const TABLE = {
    easy:    { coopFactor: 1.30, toughFactor: 0.82, acceptShift: 8 },
    medium:  { coopFactor: 1.00, toughFactor: 1.00, acceptShift: 0 },
    hard:    { coopFactor: 0.78, toughFactor: 1.18, acceptShift: -6 },
    extreme: { coopFactor: 0.62, toughFactor: 1.35, acceptShift: -12 },
  };
  return TABLE[diff] || TABLE.medium;
}

// 把难度修正应用到对手已决策的 move 上。纯函数（pd / ultimatum-respond 含随机微调）。
// kind 决定 move 的语义；ctx 提供所需上下文（tripled / currentOppOffer / trueVal）。
export function applyDifficulty(kind, move, ctx, mod) {
  const { coopFactor, toughFactor, acceptShift } = mod;
  switch (kind) {
    case 'pd':
      if (move === 'defect' && coopFactor > 1 && Math.random() < (coopFactor - 1)) return 'coop';
      if (move === 'coop' && coopFactor < 1 && Math.random() < (1 - coopFactor)) return 'defect';
      return move;
    case 'trust-return': {
      const cap = ctx && ctx.tripled != null ? ctx.tripled : move;
      return Math.max(0, Math.min(cap, Math.round(move * coopFactor)));
    }
    case 'pg-contribute':
      return Math.max(0, Math.min(10, Math.round(move * coopFactor)));
    case 'bargain-counter': {
      if (!ctx || ctx.currentOppOffer == null) return move;
      const concession = ctx.currentOppOffer - move;       // 对手本轮让步幅度
      const scaled = concession * coopFactor;               // 难度越高让步越小
      const floor = ctx.trueVal != null ? ctx.trueVal : move;
      return Math.max(floor, Math.round(ctx.currentOppOffer - scaled));
    }
    case 'ultimatum-propose':
      return Math.max(20, Math.min(80, Math.round(50 + (move - 50) * toughFactor)));
    case 'ultimatum-respond': {
      if (typeof move !== 'boolean') return move;
      if (!move && acceptShift > 0 && Math.random() < acceptShift / 40) return true;
      if (move && acceptShift < 0 && Math.random() < -acceptShift / 40) return false;
      return move;
    }
    default:
      return move;
  }
}
