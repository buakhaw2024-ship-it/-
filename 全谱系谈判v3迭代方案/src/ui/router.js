// ui/router.js — 屏幕路由
// 维护 screenId -> 渲染函数 的注册表；监听 nav:goto 事件切换屏幕。
// router 只负责"把哪个屏幕画到 #app"，不含任何业务逻辑。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { Store } from '../core/store.js';

const _screens = new Map(); // screenId -> render(params) => htmlString

export const Router = {
  // 注册一个屏幕的渲染函数
  register(screenId, renderFn) {
    _screens.set(screenId, renderFn);
  },

  // 初始化：绑定 nav:goto 监听，渲染首屏
  init(rootEl, initialScreen, initialParams = {}) {
    EventBus.on(EVENTS.NAV_GOTO, ({ screen, params }) => {
      this._render(rootEl, screen, params || {});
    });
    this._render(rootEl, initialScreen, initialParams);
  },

  _render(rootEl, screenId, params) {
    const renderFn = _screens.get(screenId);
    if (!renderFn) {
      rootEl.innerHTML = `<div class="hint hint-red">未注册的屏幕：${screenId}</div>`;
      console.error(`[Router] no screen registered for "${screenId}"`);
      return;
    }
    rootEl.innerHTML = renderFn(params);
    Store.set('currentScreen', screenId);

    // 地狱模式 body class：仅在对局/结果屏且难度为 hell 时附加
    const hellOn = Store.get('difficulty') === 'hell' && (screenId === 'game' || screenId === 'result');
    if (document.body && document.body.classList) {
      document.body.classList.toggle('hell-mode', hellOn);
    }

    // 渲染后回调（用于绑定事件、聚焦输入等）
    if (typeof renderFn.afterRender === 'function') {
      renderFn.afterRender(params);
    }
    window.scrollTo(0, 0);
  },
};
