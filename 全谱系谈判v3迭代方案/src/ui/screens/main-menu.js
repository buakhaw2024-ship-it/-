// ui/screens/main-menu.js — 主菜单（Phase 1 占位版）
// Phase 1 仅验证导航闭环与状态读取；菜单项的真实跳转在 Phase 2 接入。

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';

export function renderMainMenu(params = {}) {
  const name = params.name || '训练员';
  return `
    <div class="header">
      <h1>◆ 全谱系博弈演练系统 ◆</h1>
      <div class="sub">训练员: ${name}  |  内核: v3 模块化  |  状态: Phase 1 骨架运行正常 ✓</div>
    </div>
    <div class="hint hint-green">
      ✅ Phase 1 验证通过：欢迎屏 → 主屏 的切换由<b>事件总线 nav:goto</b> 驱动，
      路由从 store 读取并渲染，UI 未直接调用任何业务逻辑。
    </div>
    <div id="main-menu-items">
      <div class="menu-item" data-screen="${SCREENS.SCENARIO_SELECT}">
        <div class="menu-num">①</div>
        <div class="menu-text"><b>场景实战训练</b><span>选择博弈场景，与AI对手对决（Phase 2 接入）</span></div>
      </div>
      <div class="menu-item" data-screen="${SCREENS.STRATEGY}">
        <div class="menu-num">②</div>
        <div class="menu-text"><b>策略理论库</b><span>策略卡 / 沟通技术 / 心理防御 / 六大宗师（Phase 2 接入）</span></div>
      </div>
      <div class="menu-item" data-screen="${SCREENS.PSYCHOLOGY}">
        <div class="menu-num">③</div>
        <div class="menu-text"><b>心理档案分析</b><span>8维博弈心理画像（Phase 4 深化）</span></div>
      </div>
      <div class="menu-item" data-screen="${SCREENS.DASHBOARD}">
        <div class="menu-num">④</div>
        <div class="menu-text"><b>训练成绩看板</b><span>历史战绩、胜率统计（Phase 2 接入）</span></div>
      </div>
    </div>
    <div style="margin-top:16px;text-align:center">
      <button class="back-btn" id="btn-back-welcome">← 返回欢迎屏</button>
    </div>
  `;
}

renderMainMenu.afterRender = function () {
  // Phase 1：菜单项点击仅提示（目标屏未注册），返回按钮验证反向导航
  document.querySelectorAll('#main-menu-items .menu-item').forEach((el) => {
    el.addEventListener('click', () => {
      const screen = el.getAttribute('data-screen');
      alert(`「${screen}」屏幕将在 Phase 2 接入。\n当前 Phase 1 仅验证骨架与打包管线。`);
    });
  });
  const back = document.getElementById('btn-back-welcome');
  if (back) {
    back.addEventListener('click', () => {
      EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.WELCOME, params: {} });
    });
  }
};
