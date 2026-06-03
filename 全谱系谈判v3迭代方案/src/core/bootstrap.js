// core/bootstrap.js — 应用启动入口
// 职责：装配模块（注册屏幕）→ 初始化路由 → 渲染首屏。
// 这是依赖图的根，build.js 的 manifest 把它放在最后。

import { Router } from '../ui/router.js';
import { SCREENS } from './events.js';
import { renderWelcome } from '../ui/screens/welcome.js';
import { renderMainMenu } from '../ui/screens/main-menu.js';

function boot() {
  const root = document.getElementById('app');
  if (!root) {
    console.error('[bootstrap] #app not found');
    return;
  }

  // 注册 Phase 1 屏幕（Phase 2 起在此追加注册）
  Router.register(SCREENS.WELCOME, renderWelcome);
  Router.register(SCREENS.MAIN, renderMainMenu);

  // 启动路由，首屏 = 欢迎屏
  Router.init(root, SCREENS.WELCOME);

  console.log('[bootstrap] v3 内核启动完成 ✓ (Phase 1)');
}

// DOM 就绪后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
