// ui/screens/main-menu.js — 主菜单（Phase 2：5 项功能全接入）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { getRank } from '../../data/ranks.js';
import { SCENARIO_META } from '../../data/scenarios.meta.js';

const MENU = [
  ['①', '场景实战训练', '选择博弈场景，与AI对手对决', 'nav', SCREENS.SCENARIO_SELECT],
  ['②', '快速训练模式', '随机场景与随机对手，快速提升', 'quick', null],
  ['③', '策略理论库', '策略卡 / 沟通技术 / 心理防御 / 六大宗师理论', 'nav', SCREENS.STRATEGY],
  ['④', '心理档案分析', '查看您的8维博弈心理画像', 'nav', SCREENS.PSYCHOLOGY],
  ['⑤', '训练成绩看板', '历史战绩、胜率统计、成长曲线', 'nav', SCREENS.DASHBOARD],
];

export function renderMainMenu() {
  const p = Store.get('player') || { name: '训练员', total: 0, wins: 0 };
  const rank = getRank(p.total, p.wins);
  const wr = p.total > 0 ? Math.round(p.wins / p.total * 100) : 0;

  const items = MENU.map(([num, title, sub, act, target], i) => `
    <div class="menu-item" data-act="${act}" data-target="${target || ''}" data-idx="${i}">
      <div class="menu-num">${num}</div>
      <div class="menu-text"><b>${title}</b><span>${sub}</span></div>
    </div>`).join('');

  return `
    <div class="header">
      <h1>◆ 全谱系博弈演练系统 ◆</h1>
      <div class="sub">训练员: ${p.name}  |  军衔: ${rank}  |  总场次: ${p.total}  |  胜率: ${wr}%</div>
    </div>
    <div id="main-menu-items">${items}</div>
  `;
}

renderMainMenu.afterRender = function () {
  document.querySelectorAll('#main-menu-items .menu-item').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.getAttribute('data-act');
      if (act === 'quick') {
        const keys = Object.keys(SCENARIO_META);
        const key = keys[Math.floor(Math.random() * keys.length)];
        EventBus.emit(EVENTS.GAME_START, { scenarioKey: key, opponentId: 'random' });
      } else {
        EventBus.emit(EVENTS.NAV_GOTO, { screen: el.getAttribute('data-target'), params: {} });
      }
    });
  });
};
