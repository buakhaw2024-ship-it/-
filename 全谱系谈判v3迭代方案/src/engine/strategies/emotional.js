// engine/strategies/emotional.js — 林敏感·情感驱动型
// 核心：决策被 mood 主导，波动大。破绽：易被同理心安抚，也易被激怒。

import { clamp } from '../util.js';

export default function emotional(ctx, persona, mem, mood) {
  switch (ctx.kind) {
    case 'pd': {
      if (mood.anger > 0.5) return { move: 'defect', reason: `情绪主导：怒值 ${mood.anger.toFixed(2)}，报复性背叛` };
      if (mood.trust > 0.6) return { move: 'coop', reason: `关系良好：信任 ${mood.trust.toFixed(2)}，慷慨合作` };
      return ctx.playerLastMove === 'defect'
        ? { move: 'defect', reason: '受上轮伤害，回敬背叛' }
        : { move: 'coop', reason: '情绪平稳，倾向合作' };
    }
    case 'trust-return': {
      const frac = clamp(0.30 + 0.40 * mood.trust - 0.25 * mood.anger);
      return { move: Math.round(ctx.tripled * frac), reason: mood.anger > 0.4 ? '带着情绪，返还偏少' : '感到被信任，慷慨回馈' };
    }
    case 'bargain-counter': {
      const red = mood.trust > 0.55 ? 10 : mood.anger > 0.4 ? 2 : 6;
      return {
        move: Math.max(ctx.trueVal, Math.round(ctx.currentOppOffer - red)),
        reason: mood.trust > 0.55 ? '关系融洽，主动大让步' : mood.anger > 0.4 ? '情绪抵触，几乎不让' : '按心情小让',
      };
    }
    case 'pg-contribute': {
      const c = mood.trust > 0.55 ? 8 : mood.anger > 0.4 ? 2 : 5;
      return { move: c, reason: '贡献随情绪起伏' };
    }
    case 'ultimatum-propose':
      return { move: mood.anger > 0.4 ? 60 : 50, reason: mood.anger > 0.4 ? '带气提案，多留给自己' : '倾向公平五五分' };
    case 'ultimatum-respond': {
      const share = 100 - ctx.playerKeep;
      const floor = mood.anger > 0.4 ? 50 : 40;
      return { move: share >= floor, reason: share >= floor ? '情绪可接受，同意' : `觉得不公平${mood.anger > 0.4 ? '又在气头上' : ''}，拒绝` };
    }
    default:
      return { move: null, reason: '' };
  }
}
