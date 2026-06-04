// ui/screens/main-menu.js — 主菜单

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { getRank, isGrandMaster, canUnlockBoss } from '../../data/ranks.js';
import { SCENARIO_META } from '../../data/scenarios.meta.js';
import { getCollection, CARD_POOL } from '../cards.js';
import { OPPONENTS } from '../../data/opponents.js';
import { loadReputation } from '../../engine/reputation.js';
import { C } from '../components.js';

function getTodaySuggestion(player) {
  if (!player || !player.sessions || player.sessions.length < 3) {
    return '建议从「场景实战训练」开始，先完成 3 局基础样本。';
  }
  const recent = player.sessions.slice(-5);
  const loses = recent.filter((s) => s.outcome === 'lose');
  if (loses.length >= 3) {
    return '最近失利偏多，建议先切回中级难度复盘弱项，再挑战高难。';
  }
  const last = recent[recent.length - 1];
  if (last && last.opponent) {
    return `建议继续挑战 ${last.opponent}，观察其跨局记忆变化。`;
  }
  return '建议进入快速训练，积累不同对手样本。';
}

function getReputationAlerts() {
  return OPPONENTS.map((opp) => {
    const rep = loadReputation(opp.id);
    if (!rep || rep.games < 2) return null;
    if (rep.lastOutcome === 'win') return `${opp.name} 正在警惕你：上局你赢过他。`;
    if (rep.coopRate > 0.7) return `${opp.name} 认为你偏合作，可能会测试你的底线。`;
    if (rep.aggressionRate > 0.7) return `${opp.name} 认为你偏强硬，可能开局防御。`;
    return null;
  }).filter(Boolean).slice(0, 3);
}

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
    ${p.total >= 1 ? `
      <div class="panel" style="padding:8px 12px">
        <div class="panel-title" style="font-size:11px">今日训练建议</div>
        <div style="font-size:11px;color:var(--cyan);padding:2px 0">${getTodaySuggestion(p)}</div>
      </div>` : ''}
    ${(() => {
      const alerts = getReputationAlerts();
      if (!alerts.length) return '';
      return `<div class="panel" style="padding:8px 12px">
        <div class="panel-title" style="font-size:11px">对手记忆提醒</div>
        ${alerts.map((t) => `<div style="font-size:11px;color:var(--purple);padding:2px 0">· ${t}</div>`).join('')}
      </div>`;
    })()}
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
