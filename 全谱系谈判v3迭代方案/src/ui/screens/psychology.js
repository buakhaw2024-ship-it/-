// ui/screens/psychology.js — 心理档案分析屏（Phase 4：基于真实决策序列）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { computeProfile, getProfileType, hasEnoughData, detectWeakPoints } from '../../analytics/psych-analyzer.js';
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
  const weak = detectWeakPoints(profile);
  const weakHtml = weak.length
    ? weak.map((w) => C.hint(`⚠ ${w}`, 'yellow')).join('')
    : C.hint('暂未发现明显短板，继续积累训练样本。', 'green');

  // 6 种类型对照表 — 帮助玩家理解当前类型及晋级方向
  const TYPE_DEFS = [
    { name:'战略家',    cond:'策略深度>60 + 主张强度>50',  trait:'冷静理智，全局规划',   color:'var(--cyan)'   },
    { name:'调解者',    cond:'合作倾向>70 + 公平敏感>60',  trait:'化解冲突，关系维护',   color:'var(--green)'  },
    { name:'竞争者',    cond:'主张强度>60 + 风险承受>50',  trait:'目标明确，争取最大化', color:'var(--red)'    },
    { name:'外交家',    cond:'适应灵活>60 + 情绪调节>60',  trait:'灵活切换，多情境适应', color:'var(--yellow)' },
    { name:'分析师',    cond:'策略深度>50 + 风险承受<40',  trait:'谨慎周密，数据导向',   color:'var(--purple)' },
    { name:'实用主义者', cond:'其他情况',                  trait:'务实平衡，情境最优',   color:'var(--dim)'    },
  ];
  const typeGrid = TYPE_DEFS.map((t) => {
    const isMe = t.name === pt.name;
    return `<div class="type-ref-card ${isMe ? 'type-ref-active' : ''}">
      <div class="type-ref-name" style="color:${t.color}">${isMe ? '▶ ' : ''}${t.name}</div>
      <div class="type-ref-trait">${t.trait}</div>
      <div class="type-ref-cond">${t.cond}</div>
    </div>`;
  }).join('');

  return `${head}
    ${C.panel('博弈心理类型', `
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:24px;color:var(--cyan);font-weight:bold">${pt.name}</div>
        <div style="color:var(--dim);font-size:12px;margin-top:6px">${pt.desc}</div>
      </div>`)}
    ${C.panel('8维心理向量分析（基于真实决策序列）', bars)}
    ${C.panel('当前短板', weakHtml)}
    ${C.panel('成长建议', pt.advice.map((a) => C.hint(`• ${a}`)).join(''))}
    <div class="panel">
      <div class="panel-title">6 种心理类型对照 <span style="color:var(--dim);font-size:10px">▶ 标注为当前类型</span></div>
      <div class="type-ref-grid">${typeGrid}</div>
    </div>
    ${C.hint(`样本：${player.behaviorStats.games} 局 / ${player.behaviorStats.totalMoves} 次决策`, 'cyan')}
  `;
}

renderPsychology.afterRender = function () {
  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));
};
