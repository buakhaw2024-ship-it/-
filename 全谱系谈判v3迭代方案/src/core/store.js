// core/store.js — 最小全局状态容器
// 单一数据源；set 时通过事件总线广播 store:changed，UI 据此重渲染。

import { EventBus } from './event-bus.js';
import { EVENTS } from './events.js';

const _state = {
  player: null,        // 当前玩家档案（analytics/player-data 填充）
  scenarioKey: null,   // 当前选中的场景
  opponentId: null,    // 当前选中的对手
  currentScreen: null, // 当前屏幕
  profile: null,       // 心理画像向量
};

export const Store = {
  get(key) {
    return key === undefined ? { ..._state } : _state[key];
  },

  set(key, value) {
    _state[key] = value;
    EventBus.emit(EVENTS.STORE_CHANGED, { key, value });
  },

  // 一次性更新多个字段（仅广播一次每个 key）
  patch(partial) {
    Object.entries(partial).forEach(([key, value]) => {
      _state[key] = value;
      EventBus.emit(EVENTS.STORE_CHANGED, { key, value });
    });
  },
};
