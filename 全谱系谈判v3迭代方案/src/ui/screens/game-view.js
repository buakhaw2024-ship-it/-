// ui/screens/game-view.js — 对局屏
// 渲染谈判桌外壳（对手头像 + 关系温度条），监听 game:render 落地场景 HTML，
// 订阅 ai:decided 实时更新温度条；事件委托转发 player:action。

import { EventBus } from '../../core/event-bus.js';
import { EVENTS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { C } from '../components.js';

function calcTemp(mood) {
  const raw = 50 + ((mood.trust || 0) - (mood.anger || 0)) * 50;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function buildChrome(opp) {
  const ringCls = opp.boss ? 'nego-avatar-ring boss-ring' : 'nego-avatar-ring';
  const typeLine = (opp.type || '').split('/')[0].trim();
  return `<div class="nego-chrome">
    <div class="nego-avatar-section">
      <div class="${ringCls}"><span class="nego-avatar-emoji">${C.avatarEmoji(opp.id)}</span></div>
      <div class="nego-avatar-name">${opp.name}</div>
      <div class="nego-avatar-type">${typeLine}</div>
    </div>
    <div class="nego-temp-section">
      <div class="nego-temp-label">⟺ 关系温度</div>
      <div class="nego-temp-track">
        <div class="nego-temp-marker" id="nego-temp-marker" style="left:50%"></div>
      </div>
      <div class="nego-temp-meta" id="nego-temp-meta">等待首轮出招…</div>
    </div>
  </div>`;
}

export function renderGame() {
  return `<div id="game-root"><div id="nego-chrome"></div><div id="game-content"></div></div>`;
}

let _inited = false;
export function initGameView() {
  if (_inited) return;
  _inited = true;

  // 场景 HTML 落到 #game-content；首次渲染时同步补全对手头像
  EventBus.on(EVENTS.GAME_RENDER, ({ html }) => {
    const chrome = document.getElementById('nego-chrome');
    if (chrome && !chrome.children.length) {
      const opp = Store.get('opponent');
      if (opp) chrome.innerHTML = buildChrome(opp);
    }
    const content = document.getElementById('game-content');
    if (content) content.innerHTML = html;
  });

  // AI 出招后实时更新温度条（marker 滑动）
  EventBus.on(EVENTS.AI_DECIDED, ({ mood }) => {
    if (!mood) return;
    const temp = calcTemp(mood);
    const marker = document.getElementById('nego-temp-marker');
    const meta = document.getElementById('nego-temp-meta');
    if (marker) marker.style.left = temp + '%';
    if (meta) meta.textContent =
      `信任 ${Math.round((mood.trust || 0) * 100)}% · 愤怒 ${Math.round((mood.anger || 0) * 100)}%`;
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
