// ui/screens/result.js — 结果屏（读取 Store.lastResult）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { SCENARIO_META } from '../../data/scenarios.meta.js';
import { C } from '../components.js';

export function renderResult() {
  const data = Store.get('lastResult');
  if (!data) {
    return `${C.hint('暂无结果数据', 'yellow')}
      <div style="text-align:center;margin-top:16px"><button class="btn" data-nav="${SCREENS.MAIN}">← 返回主菜单</button></div>`;
  }
  const { result, opp, scenarioName, tips, tells } = data;

  const tipsPanel = opp ? C.panel(`应对 ${opp.type} 的专项技巧`,
    tips.map((t) => C.hint(`• ${t}`)).join('') +
    `<div style="margin-top:8px;font-size:11px;color:var(--dim)">行为识别信号：${tells.join(' | ')}</div>`) : '';

  return `
    <div class="header"><h1>${scenarioName} — 训练结束</h1></div>
    <div class="grid2" style="margin-bottom:12px">
      ${C.scoreBox(result.playerScore, '您的得分')}
      ${C.scoreBox(result.oppScore, `${opp ? opp.name : '对手'} 得分`)}
    </div>
    <div style="text-align:center;margin-bottom:16px">${C.outcomeBadge(result.outcome)}</div>
    ${C.panel('复盘分析', result.summary || '')}
    ${tipsPanel}
    <div style="margin-top:16px;text-align:center">
      <button class="btn" data-nav="${SCREENS.MAIN}" style="margin:4px">← 返回主菜单</button>
      <button class="btn btn-green" data-action="quick" style="margin:4px">再来一局 ⚡</button>
    </div>
  `;
}

renderResult.afterRender = function () {
  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));

  const quick = document.querySelector('[data-action="quick"]');
  if (quick) quick.addEventListener('click', () => {
    const keys = Object.keys(SCENARIO_META);
    const key = keys[Math.floor(Math.random() * keys.length)];
    EventBus.emit(EVENTS.GAME_START, { scenarioKey: key, opponentId: 'random' });
  });
};
