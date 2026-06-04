// engine/opponent-ai.js — AI 决策引擎统一入口
// 装配性格(静态) + 记忆(动态认知) + 情绪(状态机) + 性格专属策略。
// 不操作 DOM；仅通过返回值与 ai:decided 事件对外通信。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { getOpponent } from '../data/opponents.js';
import { Memory } from './memory.js';
import { Mood } from './mood.js';
import { getDifficultyMod, applyDifficulty } from './difficulty.js';

import rational from './strategies/rational.js';
import emotional from './strategies/emotional.js';
import aggressive from './strategies/aggressive.js';
import cooperative from './strategies/cooperative.js';
import manipulative from './strategies/manipulative.js';
import riskAverse from './strategies/risk-averse.js';
import trumpBoss from './strategies/trump-boss.js';

const STRATEGIES = { rational, emotional, aggressive, cooperative, manipulative, riskAverse, trumpBoss };

export const OpponentAI = {
  // 每局开始重置该对手的记忆与情绪
  reset(opponentId) {
    const persona = getOpponent(opponentId);
    Memory.reset(opponentId);
    Mood.reset(opponentId, persona);
  },

  // 观察玩家一次行为：更新记忆 + 演化情绪（在对手做出反应前调用）
  observe(opponentId, signal) {
    const persona = getOpponent(opponentId);
    Memory.observe(opponentId, signal);
    Mood.react(opponentId, signal, persona);
  },

  // 做出决策：ctx.kind 决定决策类型，返回 { move, reason, mood }
  decide(opponentId, ctx) {
    const persona = getOpponent(opponentId);
    const mem = Memory.get(opponentId);
    const mood = Mood.get(opponentId);
    const fn = STRATEGIES[opponentId] || STRATEGIES.rational;

    let { move, reason } = fn(ctx, persona, mem, mood);
    // 难度修正：缩放对手慷慨度/强硬度/接受倾向。Boss 已是极限值，豁免。
    if (opponentId !== 'trumpBoss') {
      move = applyDifficulty(ctx.kind, move, ctx, getDifficultyMod());
    }
    const snapshot = { ...mood };

    EventBus.emit(EVENTS.AI_DECIDED, { opponentId, move, reason, mood: snapshot, kind: ctx.kind });
    return { move, reason, mood: snapshot };
  },

  // 供复盘读取
  snapshot(opponentId) {
    return { memory: { ...Memory.get(opponentId) }, mood: { ...Mood.get(opponentId) } };
  },
};
