// ui/screens/game-view.js — 对局屏
// 渲染一个稳定容器 #game-root；监听 game:render 落地场景 HTML；
// 用事件委托把 [data-game-action] 点击翻译成 player:action 事件。
// （UI 只渲染与转发，不含任何场景逻辑。）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS } from '../../core/events.js';

export function renderGame() {
  return `<div id="game-root"></div>`;
}

let _inited = false;
export function initGameView() {
  if (_inited) return;
  _inited = true;

  // 场景发出的 HTML 落地到 #game-root
  EventBus.on(EVENTS.GAME_RENDER, ({ html }) => {
    const root = document.getElementById('game-root');
    if (root) root.innerHTML = html;
  });

  // 事件委托：仅响应 #game-root 内的动作按钮
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-game-action]');
    if (!btn) return;
    const root = document.getElementById('game-root');
    if (!root || !root.contains(btn)) return;
    EventBus.emit(EVENTS.PLAYER_ACTION, {
      type: btn.getAttribute('data-game-action'),
      value: btn.getAttribute('data-value'),
    });
  });
}
