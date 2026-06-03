// ui/screens/psychology.js — 心理档案分析屏（8 维向量 + 类型 + 建议）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { PsychAnalyzer } from '../../analytics/psych-analyzer.js';
import { PSYCH_DIMENSIONS } from '../../data/ranks.js';
import { C } from '../components.js';

export function renderPsychology() {
  const player = Store.get('player');
  const total = player ? player.total : 0;

  const head = `
    <div class="flex-between">
      <div class="section-title">▶ 心理档案分析</div>
      <button class="back-btn" data-nav="${SCREENS.MAIN}">← 返回</button>
    </div>`;

  if (!PsychAnalyzer.hasEnoughData(total)) {
    return `${head}${C.hint('您还没有足够的训练数据。请先完成至少 2 场博弈训练，心理档案将更加准确。', 'yellow')}`;
  }

  const profile = PsychAnalyzer.getProfile();
  const bars = PSYCH_DIMENSIONS.map((d) =>
    C.bar(d.label, profile[d.key] || 0.5, d.color)).join('');
  const pt = PsychAnalyzer.getProfileType();

  return `${head}
    ${C.panel('博弈心理类型', `
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:24px;color:var(--cyan);font-weight:bold">${pt.name}</div>
        <div style="color:var(--dim);font-size:12px;margin-top:6px">${pt.desc}</div>
      </div>`)}
    ${C.panel('8维心理向量分析', bars)}
    ${C.panel('成长建议', pt.advice.map((a) => C.hint(`• ${a}`)).join(''))}
  `;
}

renderPsychology.afterRender = function () {
  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));
};
