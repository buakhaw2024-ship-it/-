// ui/screens/opponent-select.js — 对手选择屏

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { OPPONENTS, PERSONALITY_TELLS } from '../../data/opponents.js';
import { SCENARIO_META } from '../../data/scenarios.meta.js';
import { C } from '../components.js';

export function renderOpponentSelect() {
  const key = Store.get('scenarioKey');
  const meta = SCENARIO_META[key] || { name: '—', desc: '' };
  const cards = OPPONENTS.map((o) => `
    <div class="opp-card" data-opp="${o.id}">
      <div class="opp-name">${o.name}</div>
      <div class="opp-type">${o.type}</div>
      <div class="opp-desc" style="margin:4px 0">${o.desc}</div>
      <div style="font-size:10px;color:var(--yellow)">弱点：${o.weakness}</div>
      <div style="margin-top:6px;font-size:10px;color:var(--dim)">${(PERSONALITY_TELLS[o.id] || []).join(' | ')}</div>
    </div>`).join('');

  return `
    <div class="flex-between">
      <div class="section-title">▶ 选择对手</div>
      <button class="back-btn" data-nav="${SCREENS.SCENARIO_SELECT}">← 返回</button>
    </div>
    ${C.hint(`已选场景：<b style="color:var(--cyan)">${meta.name}</b>  <span style="color:var(--dim)">${meta.desc}</span>`)}
    <div class="grid2">${cards}</div>
    <div style="margin-top:12px">
      <button class="btn btn-yellow" style="width:100%" data-opp="random">⚡ 随机对手（挑战未知）</button>
    </div>
  `;
}

renderOpponentSelect.afterRender = function () {
  const key = Store.get('scenarioKey');
  document.querySelectorAll('[data-opp]').forEach((el) => {
    el.addEventListener('click', () => {
      EventBus.emit(EVENTS.GAME_START, { scenarioKey: key, opponentId: el.getAttribute('data-opp') });
    });
  });
  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));
};
