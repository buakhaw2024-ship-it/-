// ui/screens/welcome.js — 欢迎屏（Phase 2：接入真实玩家档案）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { loadPlayer } from '../../analytics/player-data.js';
import { C } from '../components.js';

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
      ${C.hint('数据保存在本地浏览器（LocalStorage），兼容 v2.0 老存档。')}
    </div>
  `;
}

renderWelcome.afterRender = function () {
  const input = document.getElementById('player-name-input');
  const enter = () => {
    const name = (input.value || '').trim();
    if (!name) { alert('请输入训练代号'); return; }
    const player = loadPlayer(name);
    Store.set('player', player);
    EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.MAIN, params: {} });
  };
  document.getElementById('btn-enter').addEventListener('click', enter);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') enter(); });
  input.focus();
};
