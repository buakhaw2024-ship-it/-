// core/bootstrap.js — 应用启动入口（组合根）
// 职责：注册所有屏幕 → 初始化对局视图/记录器/控制器 → 渲染首屏。
// 作为组合根，允许 import 各模块进行装配；这是依赖图的根，build.js 把它放最后。

import { Router } from '../ui/router.js';
import { SCREENS } from './events.js';

import { renderWelcome } from '../ui/screens/welcome.js';
import { renderMainMenu } from '../ui/screens/main-menu.js';
import { renderScenarioSelect } from '../ui/screens/scenario-select.js';
import { renderOpponentSelect } from '../ui/screens/opponent-select.js';
import { renderGame, initGameView } from '../ui/screens/game-view.js';
import { renderResult } from '../ui/screens/result.js';
import { renderStrategyLib } from '../ui/screens/strategy-lib.js';
import { renderPsychology } from '../ui/screens/psychology.js';
import { renderDashboard } from '../ui/screens/dashboard.js';
import { renderCardAlbum } from '../ui/cards.js';

import { initRecorder } from '../analytics/recorder.js';
import { initRunner } from '../scenarios/runner.js';

function boot() {
  const root = document.getElementById('app');
  if (!root) { console.error('[bootstrap] #app not found'); return; }

  // 注册屏幕
  Router.register(SCREENS.WELCOME, renderWelcome);
  Router.register(SCREENS.MAIN, renderMainMenu);
  Router.register(SCREENS.SCENARIO_SELECT, renderScenarioSelect);
  Router.register(SCREENS.OPPONENT_SELECT, renderOpponentSelect);
  Router.register(SCREENS.GAME, renderGame);
  Router.register(SCREENS.RESULT, renderResult);
  Router.register(SCREENS.STRATEGY, renderStrategyLib);
  Router.register(SCREENS.PSYCHOLOGY, renderPsychology);
  Router.register(SCREENS.DASHBOARD, renderDashboard);
  Router.register(SCREENS.CARD_ALBUM, renderCardAlbum);

  // 初始化对局视图（game:render 落地 + 动作委托）
  initGameView();
  // 先初始化记录器，再初始化控制器 —— 保证 game:end 时"先记录、后导航"
  initRecorder();
  initRunner();

  // 启动路由，首屏 = 欢迎屏
  Router.init(root, SCREENS.WELCOME);
  console.log('[bootstrap] v3 启动完成 ✓ (Phase 2：全功能迁移)');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
