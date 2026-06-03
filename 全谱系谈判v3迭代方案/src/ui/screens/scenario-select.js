// ui/screens/scenario-select.js — 场景选择屏

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { SCENARIO_META, DIFF_LABEL, DIFF_CLASS } from '../../data/scenarios.meta.js';
import { C } from '../components.js';

export function renderScenarioSelect() {
  const cards = Object.entries(SCENARIO_META).map(([key, s]) => `
    <div class="card" data-key="${key}">
      <h3>${s.name}</h3>
      <div class="diff ${DIFF_CLASS[s.diff]}">${DIFF_LABEL[s.diff]}</div>
      ${C.tag(s.domain)}
      <p style="margin-top:8px">${s.desc}</p>
    </div>`).join('');

  return `
    <div class="flex-between">
      <div class="section-title">▶ 选择训练场景</div>
      <button class="back-btn" data-nav="${SCREENS.MAIN}">← 返回</button>
    </div>
    <div class="grid2">${cards}</div>
  `;
}

renderScenarioSelect.afterRender = function () {
  document.querySelectorAll('.card[data-key]').forEach((el) => {
    el.addEventListener('click', () => {
      Store.set('scenarioKey', el.getAttribute('data-key'));
      EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.OPPONENT_SELECT, params: {} });
    });
  });
  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));
};
