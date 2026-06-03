// scenarios/prisoners.js — 囚徒困境
// Phase 3：AI 决策改由 engine 驱动（TfT/报复/觉醒等由记忆+情绪决定）。

import { BaseScenario } from './base-scenario.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { C } from '../ui/components.js';

export class PrisonersDilemma extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.rounds = 5;
    this.round = 0;
    this.playerScore = 0;
    this.oppScore = 0;
  }

  _scores(p, o) {
    if (p === 'coop' && o === 'coop') return [3, 3];
    if (p === 'coop' && o === 'defect') return [0, 5];
    if (p === 'defect' && o === 'coop') return [5, 0];
    return [1, 1];
  }

  start() { OpponentAI.reset(this.opp.id); this._render(); }

  _render() {
    const opp = this.opp;
    const logHtml = this.log.map((l) =>
      `<div class="log-entry"><span class="lbl">[第${l.round}轮]</span> 您: ${l.player === 'coop' ? '合作' : '背叛'} | ${opp.name}: ${l.opp === 'coop' ? '合作' : '背叛'} | +${l.pScore} vs +${l.oScore}${l.reason ? `<br><span style="color:var(--dim)">↳ ${opp.name}：${l.reason}</span>` : ''}</div>`
    ).join('');

    this.emitRender(`
      ${C.gameHeader(`囚徒困境 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '您的分数')}
        ${C.scoreBox(this.oppScore, `${opp.name} 分数`)}
      </div>
      ${C.hint(`<b>场景：</b>你和 ${opp.name} 同时被捕。双方都沉默（合作）各判3年；你背叛对方沉默则你自由对方5年；双方都背叛各1年。<br><b>对手档案：</b>${opp.type} — ${opp.desc}`)}
      ${C.panel('选择你的策略',
        C.actionBtn('choice', 'coop', '<b>[C] 合作</b> — 保持沉默，减少双方损失（理性结果 +3）') +
        C.actionBtn('choice', 'defect', '<b>[D] 背叛</b> — 出卖对方，追求个人最大利益（最大 +5）'))}
      ${C.logBox('对局记录', logHtml)}
    `);
  }

  handleAction({ type, value }) {
    if (type !== 'choice') return;
    const prev = this.log.length ? this.log[this.log.length - 1].player : null;
    // 对手基于"此前回合"的记忆/情绪做决策（同时出招，看不到本轮）
    const { move: oppChoice, reason } = OpponentAI.decide(this.opp.id, {
      kind: 'pd', round: this.round, playerLastMove: prev,
    });
    const [ps, os] = this._scores(value, oppChoice);
    this.playerScore += ps;
    this.oppScore += os;
    this.log.push({ round: this.round + 1, player: value, opp: oppChoice, pScore: ps, oScore: os, reason });
    // 观察玩家本轮行为，更新记忆与情绪（影响后续回合）
    OpponentAI.observe(this.opp.id, { coop: value === 'coop' });
    this.round += 1;
    if (this.round < this.rounds) this._render();
    else this._finish();
  }

  _finish() {
    const outcome = this.playerScore > this.oppScore ? 'win' : this.playerScore < this.oppScore ? 'lose' : 'draw';
    const coop = this.log.filter((l) => l.player === 'coop').length;
    const lastReason = this.log.length ? this.log[this.log.length - 1].reason : '';
    this.finish({
      playerScore: this.playerScore, oppScore: this.oppScore, outcome,
      summary:
        C.infoRow('总轮数', `${this.rounds} 轮`) +
        C.infoRow('您的合作率', `${Math.round(coop / this.rounds * 100)}%`) +
        C.infoRow('对手', `${this.opp.name} (${this.opp.type})`) +
        C.infoRow('对手末轮心态', lastReason || '—') +
        C.infoRow('分析', coop >= 4 ? '高度合作策略，建立了信任' : coop >= 2 ? '混合策略，较为灵活' : '激进背叛策略，短期收益可能较高但破坏信任'),
    });
  }
}
