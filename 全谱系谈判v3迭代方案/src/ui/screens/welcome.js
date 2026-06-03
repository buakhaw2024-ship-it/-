// ui/screens/welcome.js — 欢迎屏（Phase 1 占位版）
// 证明：事件总线 + 路由可驱动屏幕切换。Phase 2 接入真实玩家档案逻辑。

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';

export function renderWelcome() {
  return `
    <div class="welcome-logo">
      <div class="logo-art">
╔══════════════════════════════════════╗<br>
║  全谱系博弈实战演练系统  v3.0        ║<br>
║  Full-Spectrum Negotiation Trainer   ║<br>
╚══════════════════════════════════════╝
      </div>
    </div>
    <div class="panel" style="max-width:420px;margin:0 auto">
      <div class="panel-title">▶ 进入系统</div>
      <div class="input-wrap">
        <label>输入您的训练代号</label>
        <input class="inp" id="player-name-input" placeholder="例如：谈判精英" maxlength="20" autocomplete="off">
      </div>
      <button class="btn btn-green" style="width:100%" id="btn-enter">进入训练系统 →</button>
      <div class="hint hint-cyan" style="margin-top:12px">
        v3 模块化内核已就绪：事件总线 / 全局状态 / 路由 / 打包管线。
      </div>
    </div>
  `;
}

renderWelcome.afterRender = function () {
  const input = document.getElementById('player-name-input');
  const enter = () => {
    const name = (input.value || '').trim();
    if (!name) {
      alert('请输入训练代号');
      return;
    }
    // Phase 1：暂只把名字带去主屏，证明导航链路；Phase 2 接 player-data
    EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.MAIN, params: { name } });
  };
  document.getElementById('btn-enter').addEventListener('click', enter);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enter();
  });
  input.focus();
};
