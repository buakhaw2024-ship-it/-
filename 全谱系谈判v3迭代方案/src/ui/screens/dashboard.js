// ui/screens/dashboard.js — 训练成绩看板

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { getRank } from '../../data/ranks.js';
import { C } from '../components.js';

export function renderDashboard() {
  const p = Store.get('player') || { name: '—', sessions: [], total: 0, wins: 0, draws: 0, losses: 0 };
  const rank = getRank(p.total, p.wins);
  const wr = p.total > 0 ? Math.round(p.wins / p.total * 100) : 0;

  const recent = (p.sessions || []).slice(-8).reverse();
  const histHtml = recent.length ? recent.map((r) => {
    const oc = r.outcome === 'win' ? 'outcome-win' : r.outcome === 'lose' ? 'outcome-lose' : r.outcome === 'coop' ? 'outcome-coop' : 'outcome-draw';
    const ocLabel = r.outcome === 'win' ? '胜' : r.outcome === 'lose' ? '负' : r.outcome === 'coop' ? '合作' : '平';
    return `<div class="info-row">
      <span class="info-key">${r.time}</span>
      <span>${r.scenario}</span>
      <span style="color:var(--dim)">${r.opponent}</span>
      <span class="outcome ${oc}" style="padding:1px 6px;font-size:10px">${ocLabel}</span>
    </div>`;
  }).join('') : '<div style="color:var(--dim);font-size:12px;padding:8px">暂无训练记录</div>';

  return `
    <div class="flex-between">
      <div class="section-title">▶ 训练成绩看板</div>
      <button class="back-btn" data-nav="${SCREENS.MAIN}">← 返回</button>
    </div>
    <div class="grid3" style="margin-bottom:16px">
      ${C.scoreBox(p.total, '总训练场次')}
      ${C.scoreBox(`${wr}%`, '综合胜率', 'var(--green)')}
      ${C.scoreBox(rank, '当前军衔', 'var(--yellow)')}
    </div>
    ${C.panel('战绩统计', `
      <div class="grid3">
        <div style="text-align:center"><div style="color:var(--green);font-size:20px;font-weight:bold">${p.wins || 0}</div><div style="color:var(--dim);font-size:11px">胜利</div></div>
        <div style="text-align:center"><div style="color:var(--yellow);font-size:20px;font-weight:bold">${p.draws || 0}</div><div style="color:var(--dim);font-size:11px">平局/合作</div></div>
        <div style="text-align:center"><div style="color:var(--red);font-size:20px;font-weight:bold">${p.losses || 0}</div><div style="color:var(--dim);font-size:11px">失利</div></div>
      </div>`)}
    ${C.panel('最近训练记录', histHtml)}
  `;
}

renderDashboard.afterRender = function () {
  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));
};
