// scenarios/prisoners.js — 囚徒困境
// Phase 3：AI 决策改由 engine 驱动（TfT/报复/觉醒等由记忆+情绪决定）。

import { BaseScenario } from './base-scenario.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { loadReputation } from '../engine/reputation.js';
import { Memory } from '../engine/memory.js';
import { pickContextualLine } from '../data/opponent-lines-v2.js';
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

  start() { OpponentAI.reset(this.opp.id); this.initExperience('prisoners'); this._render(); }

  _render() {
    const opp = this.opp;
    this.checkSituationEvent();
    const situationHtml = this.renderSituationEvent();
    const questionHtml = this.renderCounterQuestion();
    const blockNormal = !!(this._pendingSituation || this._pendingQuestion);
    const logHtml = this.log.map((l) => {
      if (l.systemEvent) {
        return C.dialogBubble(`【局势卡】${l.eventTitle} → ${l.choiceText}`, 'system', `第${l.round}轮`);
      }
      if (l.counterQuestion) {
        return C.dialogBubble(l.questionText, 'ai', `${opp.name} 追问`) +
               C.dialogBubble(l.answerText, 'player', '你的回应');
      }
      const pText = l.player === 'coop' ? '选择合作' : '选择背叛';
      const oText = `${l.line ? `<b>${l.line}</b><br>` : ''}${l.opp === 'coop' ? '合作' : '背叛'} (+${l.pScore} vs +${l.oScore})<br><span style="color:var(--dim);font-size:10px">${l.reason || ''}</span>`;
      return C.dialogBubble(pText, 'player', `第${l.round}轮`) + C.dialogBubble(oText, 'ai', `${opp.name} ${C.moodEmoji(l.mood)}`);
    }).join('');

    this.emitRender(`
      ${C.gameHeader(`囚徒困境 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      ${C.roundTimeline(this.log, this.rounds, this.round)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '您的分数')}
        ${C.scoreBox(this.oppScore, `${opp.name} 分数`)}
      </div>
      ${this.experienceBanner()}
      ${C.relationshipPanel(opp)}
      ${situationHtml}
      ${questionHtml}
      ${blockNormal ? '' : C.panel('选择你的策略',
        C.actionBtn('choice', 'coop', '<b>[C] 合作</b> — 保持沉默，减少双方损失（理性结果 +3）') +
        C.actionBtn('choice', 'defect', '<b>[D] 背叛</b> — 出卖对方，追求个人最大利益（最大 +5）') +
        this.peekControls())}
      ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}
    `);
  }

  handleAction({ type, value }) {
    if (this.interceptCommonAction(type, value)) return;
    if (type !== 'choice') return;
    this._peekSnap = null;
    const prev = this.log.length ? this.log[this.log.length - 1].player : null;
    // 对手基于"此前回合"的记忆/情绪做决策（同时出招，看不到本轮）
    const { move: oppChoice, reason, mood } = OpponentAI.decide(this.opp.id, {
      kind: 'pd', round: this.round, playerLastMove: prev,
    });
    const [ps, os] = this._scores(value, oppChoice);
    this.playerScore += ps;
    this.oppScore += os;
    // 情境化台词
    const line = pickContextualLine(this.opp, {
      action: oppChoice, mood, memory: Memory.get(this.opp.id),
      reputation: loadReputation(this.opp.id), round: this.round,
      exposed: Memory.get(this.opp.id).exposureScore >= 2,
    });
    this.log.push({ round: this.round + 1, player: value, opp: oppChoice, pScore: ps, oScore: os, reason, mood, line });
    // 观察玩家本轮行为，更新记忆与情绪
    OpponentAI.observe(this.opp.id, { coop: value === 'coop' });
    this.round += 1;
    // 可能触发对手反问（中后期更易触发）
    if (this.round < this.rounds && this.round >= 1) {
      if (this.maybeAskCounterQuestion('choice', value)) return;
    }
    if (this.round < this.rounds) this._render();
    else this._finish();
  }

  _finish() {
    const outcome = this.playerScore > this.oppScore ? 'win' : this.playerScore < this.oppScore ? 'lose' : 'draw';
    const coop = this.log.filter((l) => l.player === 'coop').length;
    const lastReason = this.log.length ? this.log[this.log.length - 1].reason : '';
    // 公平：双方合作率相近（我方合作 ≥3 且双方互信收益最优）
    const fairDeal = coop >= 3 && outcome !== 'lose';
    this.finish({
      kind: 'prisoners', rounds: this.log,
      playerScore: this.playerScore, oppScore: this.oppScore, outcome, fairDeal,
      summary:
        C.infoRow('总轮数', `${this.rounds} 轮`) +
        C.infoRow('您的合作率', `${Math.round(coop / this.rounds * 100)}%`) +
        C.infoRow('对手', `${this.opp.name} (${this.opp.type})`) +
        C.infoRow('对手末轮心态', lastReason || '—') +
        C.infoRow('分析', coop >= 4 ? '高度合作策略，建立了信任' : coop >= 2 ? '混合策略，较为灵活' : '激进背叛策略，短期收益可能较高但破坏信任'),
    });
  }
}
