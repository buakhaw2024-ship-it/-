// ui/screens/main-menu.js — 主菜单

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { getRank, isGrandMaster, canUnlockBoss } from '../../data/ranks.js';
import { SCENARIO_META } from '../../data/scenarios.meta.js';
import { getCollection, CARD_POOL } from '../cards.js';

const MENU = [
  ['①', '场景实战训练', '选择博弈场景，与AI对手对决', 'nav', SCREENS.SCENARIO_SELECT],
  ['②', '快速训练模式', '随机场景与随机对手，快速提升', 'quick', null],
  ['③', '策略理论库', '策略卡 / 沟通技术 / 心理防御 / 六大宗师理论', 'nav', SCREENS.STRATEGY],
  ['④', '心理档案分析', '查看您的8维博弈心理画像', 'nav', SCREENS.PSYCHOLOGY],
  ['⑤', '训练成绩看板', '历史战绩、胜率统计、成长曲线', 'nav', SCREENS.DASHBOARD],
  ['⑥', '卡牌收藏册', '收集对局卡片，解锁稀有 SSR/SP 卡', 'nav', SCREENS.CARD_ALBUM],
];

export function renderMainMenu() {
  const p = Store.get('player') || { name: '训练员', total: 0, wins: 0 };
  const difficulty = Store.get('difficulty') || 'medium';
  const rank = getRank(p.total, p.wins);
  const wr = p.total > 0 ? Math.round(p.wins / p.total * 100) : 0;

  // 卡牌收藏进度（⑥ 菜单显示 new badge）
  const owned = getCollection(p);
  const cardNew = owned.length > 0 && owned.length < CARD_POOL.length
    ? `<span class="menu-new-badge">${owned.length}/${CARD_POOL.length}</span>` : '';

  const items = MENU.map(([num, title, sub, act, target], i) => {
    const badge = (i === 5) ? cardNew : '';
    return `<div class="menu-item" data-act="${act}" data-target="${target || ''}" data-idx="${i}">
      <div class="menu-num">${num}</div>
      <div class="menu-text"><b>${title}${badge}</b><span>${sub}</span></div>
    </div>`;
  }).join('');

  let bossHint = '';
  if (canUnlockBoss(p, difficulty)) {
    bossHint = `<div class="hint hint-yellow" style="font-size:11px;text-align:center">🔓 <b>终局挑战已开启</b>：在场景训练中选择「终局挑战」难度挑战隐藏 Boss。</div>`;
  } else if (isGrandMaster(p)) {
    bossHint = `<div class="hint hint-cyan" style="font-size:11px;text-align:center">🏆 <b>宗师级</b>达成！进入场景训练并选择「终局挑战」难度解锁隐藏 Boss。</div>`;
  }

  // 新手训练路径推荐（前 3 局显示）
  const pathSteps = ['① 囚徒困境', '② 最后通牒', '③ 信任博弈', '④ 砍价谈判', '⑤ 宗师级'];
  const currentStep = Math.min(p.total, 4);
  const newUserPath = p.total < 4 ? `
    <div class="training-path-callout">
      <div class="tp-title">📍 推荐新手训练路径</div>
      <div class="tp-steps">${pathSteps.map((s, i) =>
        `<span class="tp-step ${i === currentStep ? 'tp-now' : i < currentStep ? 'tp-done' : 'tp-dim'}">${s}</span>${i < 4 ? '<span class="tp-arrow">→</span>' : ''}`
      ).join('')}</div>
      <div class="tp-hint">从 <b>初级难度</b> 开始，逐步熟悉各场景与对手策略。完成 2 场后查看<b>心理档案</b>了解自己的谈判类型。</div>
    </div>` : '';

  return `
    <div class="header">
      <h1>◆ 全谱系博弈演练系统 ◆</h1>
      <div class="sub">训练员: ${p.name}  |  军衔: ${rank}  |  总场次: ${p.total}  |  胜率: ${wr}%</div>
    </div>
    ${bossHint}
    ${newUserPath}
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
