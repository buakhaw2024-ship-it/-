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
  const { result, opp, scenarioName, tips, tells, replay } = data;

  const tipsPanel = opp ? C.panel(`应对 ${opp.type} 的专项技巧`,
    tips.map((t) => C.hint(`• ${t}`)).join('') +
    `<div style="margin-top:8px;font-size:11px;color:var(--dim)">行为识别信号：${tells.join(' | ')}</div>`) : '';

  // Phase 4：逐回合复盘 + 转折点 + 对手情绪曲线 + 改进建议
  let replayPanel = '';
  if (replay && replay.perRound && replay.perRound.length) {
    const rows = replay.perRound.map((pr) => {
      const color = pr.score >= 70 ? 'bar-green' : pr.score >= 50 ? 'bar-yellow' : 'bar-red';
      return `<div class="bar-wrap">
        <div class="bar-label"><span>${pr.label} · <span style="color:var(--dim)">${pr.comment}</span></span><span>${pr.score}</span></div>
        <div class="bar-bg"><div class="bar-fill ${color}" style="width:${pr.score}%"></div></div>
      </div>`;
    }).join('');
    const turning = replay.turning ? C.hint((replay.turning.type === 'bad' ? '⚠ ' : '★ ') + replay.turning.text, replay.turning.type === 'bad' ? 'red' : 'green') : '';
    const spark = replay.moodSeries ? C.moodSparkline(replay.moodSeries) : '';
    replayPanel =
      C.panel(`逐回合复盘　平均 ${replay.avgScore} 分`, turning + rows + spark) +
      C.panel('改进建议', replay.advice.map((a) => C.hint(`• ${a}`)).join(''));
  }

  return `
    <div class="header"><h1>${scenarioName} — 训练结束</h1></div>
    <div class="grid2" style="margin-bottom:12px">
      ${C.scoreBox(result.playerScore, '您的得分')}
      ${C.scoreBox(result.oppScore, `${opp ? opp.name : '对手'} 得分`)}
    </div>
    <div style="text-align:center;margin-bottom:16px">${C.outcomeBadge(result.outcome)}</div>
    ${C.panel('复盘分析', result.summary || '')}
    ${replayPanel}
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
