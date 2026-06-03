// ui/screens/strategy-lib.js — 策略理论库（策略卡 / 沟通技术 / 心理防御 / 六大宗师）
// 屏幕内自管理 Tab 与宗师详情，直接更新 #strategy-content，不经路由。

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { STRATEGY_CARDS, COMM_TECHNIQUES, DEFENSE_TACTICS } from '../../data/strategies.js';
import { MASTERS } from '../../data/masters.js';
import { C } from '../components.js';

const TABS = [
  ['cards', '策略卡牌'],
  ['comm', '沟通技术'],
  ['defense', '心理防御'],
  ['masters', '六大宗师'],
];

export function renderStrategyLib() {
  const tabs = TABS.map(([id, label], i) =>
    `<div class="tab ${i === 0 ? 'active' : ''}" data-tab="${id}">${label}</div>`).join('');
  return `
    <div class="flex-between">
      <div class="section-title">▶ 策略理论库</div>
      <button class="back-btn" data-nav="${SCREENS.MAIN}">← 返回</button>
    </div>
    <div class="tabs" id="strategy-tabs">${tabs}</div>
    <div id="strategy-content"></div>
  `;
}

function contentFor(tab) {
  if (tab === 'cards') {
    return STRATEGY_CARDS.map((c) => `
      <div class="master-card">
        <div class="master-name">${c.name}</div>
        <div style="margin:4px 0">${c.tags.map((t) => C.tag(t)).join('')}</div>
        <div style="color:var(--text);font-size:12px;line-height:1.6;margin:6px 0">${c.desc}</div>
        <div style="font-size:11px;color:var(--dim)">适用场景：${c.use}</div>
      </div>`).join('');
  }
  if (tab === 'comm') {
    return COMM_TECHNIQUES.map((c) =>
      `<div class="tactic" style="margin-bottom:8px"><div class="tactic-name">${c.name}</div><div class="tactic-desc">${c.desc}</div></div>`).join('');
  }
  if (tab === 'defense') {
    return DEFENSE_TACTICS.map((c) =>
      `<div class="tactic" style="border-left-color:var(--red);margin-bottom:8px"><div class="tactic-name" style="color:var(--red)">${c.name}</div><div class="tactic-desc">${c.desc}</div></div>`).join('');
  }
  // masters
  return `<div class="grid2">${Object.entries(MASTERS).map(([k, m]) => `
    <div class="card" data-master="${k}">
      <h3>${m.name}</h3>
      <div style="color:var(--yellow);font-size:11px;margin-bottom:6px">${m.title}</div>
      <p>${m.intro}</p>
      <div style="margin-top:8px;font-size:11px;color:var(--cyan)">共 ${m.tactics.length} 个策略/原则 →</div>
    </div>`).join('')}</div>`;
}

function masterDetail(key) {
  const m = MASTERS[key];
  const stages = [...new Set(m.tactics.map((t) => t.stage))];
  const body = stages.map((stage) => `
    <div style="margin-bottom:12px">
      <div style="color:var(--yellow);font-size:11px;letter-spacing:1px;margin-bottom:6px">【${stage}】</div>
      ${m.tactics.filter((t) => t.stage === stage).map((t) =>
        `<div class="tactic" style="margin-bottom:6px"><div class="tactic-name">${t.name}</div><div class="tactic-desc">${t.desc}</div></div>`).join('')}
    </div>`).join('');
  return `
    <button class="back-btn" id="master-back" style="margin-bottom:12px">← 返回宗师列表</button>
    <div class="master-card">
      <div class="master-name">${m.name}</div>
      <div class="master-title">${m.title}</div>
      ${C.hint(m.intro, 'yellow')}
      ${body}
    </div>`;
}

renderStrategyLib.afterRender = function () {
  const contentEl = document.getElementById('strategy-content');

  function showTab(tab) {
    document.querySelectorAll('#strategy-tabs .tab').forEach((t) =>
      t.classList.toggle('active', t.getAttribute('data-tab') === tab));
    contentEl.innerHTML = contentFor(tab);
    if (tab === 'masters') bindMasterCards();
  }

  function bindMasterCards() {
    contentEl.querySelectorAll('[data-master]').forEach((el) => {
      el.addEventListener('click', () => {
        contentEl.innerHTML = masterDetail(el.getAttribute('data-master'));
        const back = document.getElementById('master-back');
        if (back) back.addEventListener('click', () => showTab('masters'));
      });
    });
  }

  document.querySelectorAll('#strategy-tabs .tab').forEach((t) =>
    t.addEventListener('click', () => showTab(t.getAttribute('data-tab'))));

  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));

  showTab('cards');
};
