// ui/screens/dashboard.js — 训练成绩看板（场景/对手胜率 + 短板分析）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { getRank } from '../../data/ranks.js';
import { OPPONENTS } from '../../data/opponents.js';
import { SCENARIO_META } from '../../data/scenarios.meta.js';
import { computeProfile, detectWeakPoints } from '../../analytics/psych-analyzer.js';
import { DIFFICULTIES, getDifficultyLabel } from '../../engine/difficulty.js';
import { C } from '../components.js';

function nextRankHint(total, wins) {
  const wr = total > 0 ? wins / total : 0;
  const pct = Math.round(wr * 100);
  if (total === 0)  return '完成首局训练晋升 学员';
  if (total < 5)   return `还差 ${5 - total} 场训练 → 谈判官（需胜率≥60%）`;
  if (total < 10)  return `总局数 ${total}/10 + 胜率≥60%（当前 ${pct}%）→ 谈判官`;
  if (total < 20)  return `总局数 ${total}/20 + 胜率≥70%（当前 ${pct}%）→ 策略师`;
  if (total < 30)  return `总局数 ${total}/30 + 胜率≥75%（当前 ${pct}%）→ 博弈大师`;
  if (wr < 0.8)    return `胜率达 80% 晋升 宗师级（当前 ${pct}%，差 ${Math.ceil((0.8 * total - wins))} 胜）`;
  return '🏆 已达顶级军衔 · Boss + 地狱难度全解锁';
}

function winRate(sessions, filterFn) {
  const sub = sessions.filter(filterFn);
  if (!sub.length) return null;
  const wins = sub.filter((s) => s.outcome === 'win' || s.outcome === 'coop').length;
  return { played: sub.length, winRate: Math.round(wins / sub.length * 100) };
}

export function renderDashboard() {
  const p = Store.get('player') || { name: '—', sessions: [], total: 0, wins: 0, draws: 0, losses: 0 };
  const rank = getRank(p.total, p.wins);
  const wr = p.total > 0 ? Math.round(p.wins / p.total * 100) : 0;
  const sessions = p.sessions || [];

  // ── 近期记录 ──────────────────────────────────────────────────────────────
  const recent = sessions.slice(-8).reverse();
  const histHtml = recent.length ? recent.map((r) => {
    const oc = r.outcome === 'win' ? 'outcome-win' : r.outcome === 'lose' ? 'outcome-lose' : r.outcome === 'coop' ? 'outcome-coop' : 'outcome-draw';
    const ocLabel = { win:'胜', lose:'负', coop:'合作', draw:'平' }[r.outcome] || '—';
    return `<div class="info-row">
      <span class="info-key" style="font-size:10px">${r.time}</span>
      <span>${r.scenario || '—'}</span>
      <span style="color:var(--dim)">${r.opponent || '—'}</span>
      <span class="outcome ${oc}" style="padding:1px 6px;font-size:10px">${ocLabel}</span>
    </div>`;
  }).join('') : '<div style="color:var(--dim);font-size:12px;padding:8px">暂无训练记录</div>';

  // ── 场景胜率 ──────────────────────────────────────────────────────────────
  const scenarioHtml = Object.entries(SCENARIO_META).map(([key, meta]) => {
    const stat = winRate(sessions, (s) => s.scenarioKey === key);
    if (!stat) return `<div class="info-row"><span class="info-key">${meta.name}</span><span style="color:var(--dim)">未训练</span></div>`;
    const color = stat.winRate >= 60 ? 'var(--green)' : stat.winRate >= 40 ? 'var(--yellow)' : 'var(--red)';
    return `<div class="info-row">
      <span class="info-key">${meta.name}</span>
      <span style="color:${color}">${stat.played} 场 &nbsp; 胜率 ${stat.winRate}%</span>
    </div>`;
  }).join('');

  // ── 对手胜率 ──────────────────────────────────────────────────────────────
  const oppHtml = OPPONENTS.map((o) => {
    const stat = winRate(sessions, (s) => s.opponentId === o.id);
    if (!stat) return `<div class="info-row"><span class="info-key">${o.name} <span style="color:var(--dim);font-size:10px">${o.type}</span></span><span style="color:var(--dim)">未对战</span></div>`;
    const color = stat.winRate >= 60 ? 'var(--green)' : stat.winRate >= 40 ? 'var(--yellow)' : 'var(--red)';
    return `<div class="info-row">
      <span class="info-key">${o.name} <span style="color:var(--dim);font-size:10px">${o.type}</span></span>
      <span style="color:${color}">${stat.played} 场 &nbsp; 胜率 ${stat.winRate}%</span>
    </div>`;
  }).join('');

  // Boss 记录（若有）
  const bossStat = winRate(sessions, (s) => s.opponentId === 'trumpBoss');
  const bossHtml = bossStat ? `<div class="info-row">
    <span class="info-key" style="color:var(--yellow)">极限交易者 <span style="font-size:10px">隐藏 Boss</span></span>
    <span style="color:${bossStat.winRate >= 50 ? 'var(--green)' : 'var(--red)'}">${bossStat.played} 场 &nbsp; 胜率 ${bossStat.winRate}%</span>
  </div>` : '';

  // ── 短板分析 ──────────────────────────────────────────────────────────────
  const profile = p.total >= 2 ? computeProfile(p) : null;
  const weak = profile ? detectWeakPoints(profile) : [];
  const weakHtml = weak.length
    ? weak.map((w) => C.hint(`⚠ ${w}`, 'yellow')).join('')
    : p.total >= 2
      ? C.hint('暂未发现明显短板，继续积累训练样本。', 'green')
      : C.hint('完成至少 2 场训练后将显示短板分析。', 'dim');

  // ── 难度分布 ──────────────────────────────────────────────────────────────
  // 标签从 difficulty 模块的 DIFFICULTIES 派生，新增难度档位自动出现
  const diffCount = sessions.reduce((acc, s) => {
    const d = s.difficulty || 'medium';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const diffHtml = DIFFICULTIES
    .filter((d) => diffCount[d.key])
    .map((d) => {
      const cls = d.key === 'hell' ? 'tag-red' : d.key === 'extreme' ? 'tag-yellow' : 'tag-cyan';
      return `<span class="tag ${cls}">${d.label} ×${diffCount[d.key]}</span>`;
    })
    .join('') || '<span style="color:var(--dim);font-size:11px">暂无数据</span>';

  return `
    <div class="flex-between">
      <div class="section-title">▶ 训练成绩看板</div>
      <button class="back-btn" data-nav="${SCREENS.MAIN}">← 返回</button>
    </div>
    <div class="grid3" style="margin-bottom:8px">
      ${C.scoreBox(p.total, '总训练场次')}
      ${C.scoreBox(`${wr}%`, '综合胜率', 'var(--green)')}
      ${C.scoreBox(rank, '当前军衔', 'var(--yellow)')}
    </div>
    <div class="rank-next-hint">
      <span class="rank-next-icon">↑</span>${nextRankHint(p.total, p.wins)}
    </div>
    ${C.panel('战绩统计', `
      <div class="grid3">
        <div style="text-align:center"><div style="color:var(--green);font-size:20px;font-weight:bold">${p.wins || 0}</div><div style="color:var(--dim);font-size:11px">胜利</div></div>
        <div style="text-align:center"><div style="color:var(--yellow);font-size:20px;font-weight:bold">${p.draws || 0}</div><div style="color:var(--dim);font-size:11px">平局/合作</div></div>
        <div style="text-align:center"><div style="color:var(--red);font-size:20px;font-weight:bold">${p.losses || 0}</div><div style="color:var(--dim);font-size:11px">失利</div></div>
      </div>`)}
    ${C.panel('场景胜率', scenarioHtml || '<div style="color:var(--dim)">暂无数据</div>')}
    ${C.panel('对手胜率', oppHtml + bossHtml)}
    ${C.panel('当前短板', weakHtml)}
    ${C.panel('难度分布', `<div style="padding:4px 0">${diffHtml}</div>`)}
    ${C.panel('最近训练记录', histHtml)}
  `;
}

renderDashboard.afterRender = function () {
  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));
};
