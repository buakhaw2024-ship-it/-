// analytics/recorder.js — 对局记录器
// 监听 game:end，写入玩家档案 + 更新心理画像 + 组装结果供结果屏读取。
// bootstrap 中须在 runner 之前 init，确保"先记录、后导航"。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { Store } from '../core/store.js';
import { addSession } from './player-data.js';
import { PsychAnalyzer } from './psych-analyzer.js';
import { getOpponentTips, PERSONALITY_TELLS } from '../data/opponents.js';
import { SCENARIO_META } from '../data/scenarios.meta.js';

export function initRecorder() {
  EventBus.on(EVENTS.GAME_END, ({ result }) => {
    const player = Store.get('player');
    const opp = Store.get('opponent');
    const scenarioKey = Store.get('scenarioKey');
    const meta = SCENARIO_META[scenarioKey];
    const scenarioName = meta ? meta.name : scenarioKey;

    if (player) {
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

    PsychAnalyzer.update(result.outcome, opp);

    // 组装结果屏所需数据
    Store.set('lastResult', {
      result,
      opp,
      scenarioName,
      tips: opp ? getOpponentTips(opp.id) : [],
      tells: opp ? (PERSONALITY_TELLS[opp.id] || []) : [],
    });
  });
}
