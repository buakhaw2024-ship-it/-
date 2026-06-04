// core/events.js — 事件名常量（唯一事实来源）
// 所有 emit/on 都引用这里的常量，避免裸字符串拼写错误。

export const EVENTS = {
  // 导航
  NAV_GOTO: 'nav:goto',           // payload: { screen, params }

  // 对局生命周期
  GAME_START: 'game:start',       // payload: { scenarioKey, opponentId }
  GAME_RENDER: 'game:render',     // payload: { html } 或 { viewModel }
  PLAYER_ACTION: 'player:action', // payload: { type, value }
  AI_DECIDED: 'ai:decided',       // payload: { move, mood, reason }
  ROUND_END: 'round:end',         // payload: { roundLog }
  GAME_END: 'game:end',           // payload: { result }

  // 分析
  ANALYTICS_SCORED: 'analytics:scored', // payload: { replay, score }
  PROFILE_UPDATED: 'profile:updated',   // payload: { profile }

  // 全局状态
  STORE_CHANGED: 'store:changed', // payload: { key, value }

  // v2 体验增强
  EXPERIENCE_VARIANT_PICKED:    'experience:variant-picked',
  EXPERIENCE_EVENT_TRIGGERED:   'experience:event-triggered',
  EXPERIENCE_EVENT_RESOLVED:    'experience:event-resolved',
  OPPONENT_QUESTION_TRIGGERED:  'opponent:question-triggered',
  OPPONENT_QUESTION_RESOLVED:   'opponent:question-resolved',
  HIDDEN_OBJECTIVE_PICKED:      'hidden-objective:picked',
  HIDDEN_OBJECTIVE_RESOLVED:    'hidden-objective:resolved',
};

// 屏幕标识（router 使用）
export const SCREENS = {
  WELCOME: 'welcome',
  MAIN: 'main',
  SCENARIO_SELECT: 'scenario-select',
  OPPONENT_SELECT: 'opponent-select',
  GAME: 'game',
  RESULT: 'result',
  STRATEGY: 'strategy',
  PSYCHOLOGY: 'psychology',
  DASHBOARD: 'dashboard',
  CARD_ALBUM: 'card-album',
};
