// analytics/recorder.js — 对局记录器（Phase 4 增强）
// 监听 game:end：累计行为统计 + 写档案 + 构建逐回合复盘 + 组装结果供结果屏读取。
// bootstrap 中须在 runner 之前 init，确保"先记录、后导航"。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { Store } from '../core/store.js';
import { addSession } from './player-data.js';
import { accumulate } from './psych-analyzer.js';
import { buildReplay } from './replay.js';
import { getOpponentTips, PERSONALITY_TELLS } from '../data/opponents.js';
import { SCENARIO_META } from '../data/scenarios.meta.js';
import { checkNewCards, unlockCards, renderBoxOpenModal } from '../ui/cards.js';
import { updateReputation } from '../engine/reputation.js';
import { addShards, computeShardsForGame } from '../data/card-synthesis.js';

function _safe(num, den) {
  if (!den || den <= 0) return 0.5;
  return num / den;
}

export function initRecorder() {
  EventBus.on(EVENTS.GAME_END, ({ result }) => {
    const player = Store.get('player');
    const opp = Store.get('opponent');
    const scenarioKey = Store.get('scenarioKey');
    const meta = SCENARIO_META[scenarioKey];
    const scenarioName = meta ? meta.name : scenarioKey;
    const kind = result.kind || scenarioKey;
    const rounds = result.rounds || [];

    if (player) {
      // 注入 difficulty 到 result 供 accumulate 使用
      result.difficulty = Store.get('difficulty') || 'medium';
      // 先累计行为统计（供心理画像），再写入对局记录（addSession 会持久化整份档案）
      accumulate(player, kind, rounds, result, opp);
      addSession(player, {
        time: new Date().toLocaleString('zh-CN'),
        scenarioKey,
        scenario: scenarioName,
        opponentId: opp ? opp.id : 'unknown',
        opponent: opp ? opp.type : '—',
        difficulty: Store.get('difficulty') || 'medium',
        playerScore: result.playerScore,
        oppScore: result.oppScore,
        outcome: result.outcome,
      });
      // 更新跨局记忆（对手记住玩家风格）
      if (opp && opp.id) {
        const ps = player.behaviorStats || {};
        const roundCoop = rounds.filter((r) => r && (r.move === 'coop' || r.playerMove === 'coop')).length;
        const inGameCoopRate = rounds.length > 0 ? roundCoop / rounds.length : _safe(ps.coopMoves, ps.totalMoves);
        updateReputation(opp.id, {
          coopRate: inGameCoopRate,
          aggression: _safe(ps.assertiveMoves, ps.totalMoves),
          avgConcession: ps.avgConcession || 5,
        }, result.outcome);
      }
      // 碎片奖励：基于本局结果（每日首局加成）
      const today = new Date().toLocaleDateString('zh-CN');
      const isDailyFirst = player._lastShardDay !== today;
      const shardsGain = computeShardsForGame(result, opp, isDailyFirst);
      addShards(player, shardsGain, 'game-end');
      player._lastShardDay = today;
      Store.set('lastShardGain', { amount: shardsGain, daily: isDailyFirst });

      // 检查新卡解锁（在 accumulate 之后）
      const newCards = checkNewCards(player);
      if (newCards.length) unlockCards(player, newCards);
      Store.set('player', player);
      if (newCards.length && typeof document !== 'undefined') {
        Store.set('pendingNewCards', newCards);
      }
    }

    const replay = buildReplay(kind, rounds, opp, result);

    Store.set('lastResult', {
      result,
      opp,
      scenarioName,
      tips: opp ? getOpponentTips(opp.id) : [],
      tells: opp ? (PERSONALITY_TELLS[opp.id] || []) : [],
      replay,
    });
  });
}
