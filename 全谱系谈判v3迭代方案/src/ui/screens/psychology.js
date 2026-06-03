// ui/screens/psychology.js — 心理档案分析屏（Phase 4：基于真实决策序列）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { computeProfile, getProfileType, hasEnoughData } from '../../analytics/psych-analyzer.js';
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

  if (!hasEnoughData(total)) {
    return `${head}${C.hint('您还没有足够的训练数据。请先完成至少 2 场博弈训练，心理档案将更加准确。', 'yellow')}`;
  }

  const profile = computeProfile(player);
  const bars = PSYCH_DIMENSIONS.map((d) => C.bar(d.label, profile[d.key] || 0, d.color)).join('');
  const pt = getProfileType(profile);

  return `${head}
    ${C.panel('博弈心理类型', `
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:24px;color:var(--cyan);font-weight:bold">${pt.name}</div>
        <div style="color:var(--dim);font-size:12px;margin-top:6px">${pt.desc}</div>
      </div>`)}
    ${C.panel('8维心理向量分析（基于真实决策序列）', bars)}
    ${C.panel('成长建议', pt.advice.map((a) => C.hint(`• ${a}`)).join(''))}
    ${C.hint(`样本：${player.behaviorStats.games} 局 / ${player.behaviorStats.totalMoves} 次决策`, 'cyan')}
  `;
}

renderPsychology.afterRender = function () {
  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));
};
