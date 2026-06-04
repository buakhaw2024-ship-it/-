// scenarios/runner.js — 对局控制器
// 协调场景生命周期：监听 game:start 创建场景、转发 player:action、game:end 后导航到结果屏。
// 只做编排与导航，不渲染（渲染交给 game-view）、不记录（记录交给 analytics/recorder）。

import { EventBus } from '../core/event-bus.js';
import { EVENTS, SCREENS } from '../core/events.js';
import { Store } from '../core/store.js';
import { REGISTRY } from './registry.js';
import { getOpponent, randomOpponent, TRUMP_BOSS } from '../data/opponents.js';
import { canUnlockBoss } from '../data/ranks.js';
import { Mood } from '../engine/mood.js';

export function initRunner() {
  EventBus.on(EVENTS.GAME_START, ({ scenarioKey, opponentId }) => {
    const meta = REGISTRY[scenarioKey];
    if (!meta || !meta.Class) {
      console.error('[runner] 未知场景', scenarioKey);
      return;
    }
    let opp;
    if (opponentId === 'random') {
      opp = randomOpponent(); // quick: never yields Boss
    } else if (opponentId === 'trumpBoss') {
      const player = Store.get('player');
      const difficulty = Store.get('difficulty');
      if (!canUnlockBoss(player, difficulty)) {
        console.warn('[runner] Boss 尚未解锁');
        return;
      }
      opp = TRUMP_BOSS;
    } else {
      opp = getOpponent(opponentId);
    }
    if (!opp) { console.error('[runner] 未知对手', opponentId); return; }
    // 设置情绪伪装等级（hard 及以上对手的 peek 数据会被扰乱）
    Mood.setDeception(Store.get('difficulty') || 'medium');
    const scenario = new meta.Class(opp);
    Store.patch({ scenarioKey, opponent: opp, activeScenario: scenario });

    // 先导航到对局屏（同步渲染 #game-root），再 start() 触发首次 game:render
    EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.GAME, params: {} });
    scenario.start();
  });

  EventBus.on(EVENTS.PLAYER_ACTION, (action) => {
    if (action.type === 'exit') {
      Store.set('activeScenario', null);
      EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.MAIN, params: {} });
      return;
    }
    const scenario = Store.get('activeScenario');
    if (scenario) scenario.handleAction(action);
  });

  // recorder 已先行处理记录（bootstrap 中先 init），这里仅负责导航到结果屏
  EventBus.on(EVENTS.GAME_END, () => {
    Store.set('activeScenario', null);
    EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.RESULT, params: {} });
  });
}
