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
      // 先累计行为统计（供心理画像），再写入对局记录（addSession 会持久化整份档案）
      accumulate(player, kind, rounds, result, opp);
      addSession(player, {
        time: new Date().toLocaleString('zh-CN'),
        scenario: scenarioName,
        opponent: opp ? opp.type : '—',
        playerScore: result.playerScore,
        oppScore: result.oppScore,
        outcome: result.outcome,
      });
      Store.set('player', player); // 广播，刷新主菜单等
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
