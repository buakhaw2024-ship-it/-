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

  // Trump Boss 复盘：专项诊断
  let bossReviewPanel = '';
  if (opp && opp.id === 'trumpBoss') {
    const rounds = result.rounds || [];
    const tags = rounds.flatMap((r) => r.tags || []);
    const resisted = tags.includes('BATNA') || tags.includes('底线控制');
    const noFreeConcede = !tags.includes('无条件让步');
    const usedConditional = tags.includes('条件让步');
    const passed = resisted && noFreeConcede && usedConditional;
    const diagnosis = passed
      ? '你没有被极端锚定和时间压力完全牵引，能够用底线、条件交换削弱对手压迫。'
      : '你在极端锚定或时间压力下出现了被动，底线表达和条件让步仍需加强。';
    const advices = [
      '① 不要接极端锚定的价格，先质疑其依据和可执行性。',
      '② 所有让步必须换取对方实质承诺，禁止单方面善意释放。',
      '③ 提前亮出BATNA，让对方知道你不是被迫成交的唯一选项。',
      '④ 面对时间压力时主动暂停，把节奏拉回到客观标准。',
      '⑤ 不要进入对方设置的胜负叙事，回到可执行条款本身。',
    ];
    bossReviewPanel = `
      <div class="panel" style="border-color:var(--yellow)">
        <div class="panel-title" style="color:var(--yellow)">终局 Boss 复盘｜极限交易型高压锚定模型</div>
        ${C.hint(diagnosis, passed ? 'green' : 'yellow')}
        ${advices.map((a) => C.hint(`• ${a}`)).join('')}
      </div>`;
  }

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

  const avatarHead = opp ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0 14px">
      ${C.avatarBadge(opp, 40)}
      <div style="text-align:left">
        <div style="color:var(--white);font-size:13px;font-weight:bold">${opp.name}</div>
        <div style="color:var(--purple);font-size:10px">${opp.type}</div>
      </div>
    </div>` : '';

  return `
    <div class="header"><h1>${scenarioName} — 训练结束</h1></div>
    ${avatarHead}
    <div class="grid2" style="margin-bottom:12px">
      ${C.scoreBox(result.playerScore, '您的得分')}
      ${C.scoreBox(result.oppScore, `${opp ? opp.name : '对手'} 得分`)}
    </div>
    <div style="text-align:center;margin-bottom:16px">${C.outcomeBadge(result.outcome)}</div>
    ${C.panel('复盘分析', result.summary || '')}
    ${replayPanel}
    ${tipsPanel}
    ${bossReviewPanel}
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
