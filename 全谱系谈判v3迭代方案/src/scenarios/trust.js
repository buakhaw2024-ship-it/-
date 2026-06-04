// scenarios/trust.js — 信任博弈
// Phase 3：返还由 engine 决定；操纵型"钓鱼→收割"、对手情绪随你的投入演化。

import { BaseScenario } from './base-scenario.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { Memory } from '../engine/memory.js';
import { loadReputation } from '../engine/reputation.js';
import { pickContextualLine } from '../data/opponent-lines-v2.js';
import { C } from '../ui/components.js';

export class TrustGame extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.rounds = 3;
    this.round = 0;
    this.playerScore = 0;
    this.oppScore = 0;
  }

  start() { OpponentAI.reset(this.opp.id); this.initExperience('trust'); this._render(); }

  _render() {
    const opp = this.opp;
    this.checkSituationEvent();
    const situationHtml = this.renderSituationEvent();
    const questionHtml = this.renderCounterQuestion();
    const blockNormal = !!(this._pendingSituation || this._pendingQuestion);
    const logHtml = this.log.map((l) => {
      if (l.systemEvent) return C.dialogBubble(`【局势卡】${l.eventTitle} → ${l.choiceText}`, 'system', `第${l.round}轮`);
      if (l.counterQuestion) return C.dialogBubble(l.questionText, 'ai', `${opp.name} 追问`) + C.dialogBubble(l.answerText, 'player', '你的回应');
      const pText = `投入 ${l.invested} 枚`;
      const oText = `${l.line ? `<b>${l.line}</b><br>` : ''}返还 ${l.returned} 枚（净收益 ${l.myNet >= 0 ? '+' : ''}${l.myNet}）<br><span style="color:var(--dim);font-size:10px">${l.reason || ''}</span>`;
      return C.dialogBubble(pText, 'player', `第${l.round}轮`) + C.dialogBubble(oText, 'ai', `${opp.name} ${C.moodEmoji(l.mood)}`);
    }).join('');

    this.emitRender(`
      ${C.gameHeader(`信任博弈 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      ${C.roundTimeline(this.log, this.rounds, this.round)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '您的总分')}
        ${C.scoreBox(this.oppScore, `${opp.name} 总分`)}
      </div>
      ${this.experienceBanner()}
      ${C.relationshipPanel(opp)}
      ${situationHtml}
      ${questionHtml}
      ${blockNormal ? '' : C.panel('选择投入金额（总共 10 枚）',
        C.actionBtn('invest', '10', '<b>[全力信任]</b> 投入 10枚 → 对方收到 30枚') +
        C.actionBtn('invest', '7', '<b>[高度信任]</b> 投入 7枚 → 对方收到 21枚') +
        C.actionBtn('invest', '4', '<b>[适度信任]</b> 投入 4枚 → 对方收到 12枚') +
        C.actionBtn('invest', '0', '<b>[零信任]</b> 投入 0枚 → 保留所有筹码') +
        this.peekControls())}
      ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}
    `);
  }

  handleAction({ type, value }) {
    if (this.interceptCommonAction(type, value)) return;
    if (type !== 'invest') return;
    this._peekSnap = null;
    const amount = parseInt(value, 10);
    const tripled = amount * 3;
    // 先观察玩家的信任姿态（影响情绪/记忆，低投入会触发操纵者"被识破"计分）
    OpponentAI.observe(this.opp.id, { coop: amount >= 5, investFraction: amount / 10, firm: amount <= 2, exposes: amount <= 2 });
    const { move: returned, reason, mood } = OpponentAI.decide(this.opp.id, { kind: 'trust-return', tripled, invest: amount, round: this.round });
    const kept = 10 - amount;
    const myNet = kept + returned - 10;
    this.playerScore += kept + returned;
    this.oppScore += tripled - returned;
    const line = pickContextualLine(this.opp, {
      action: amount >= 5 ? 'coop' : amount <= 2 ? 'firm' : '',
      mood, memory: Memory.get(this.opp.id), reputation: loadReputation(this.opp.id), round: this.round,
      exposed: Memory.get(this.opp.id).exposureScore >= 2,
    });
    this.log.push({ round: this.round + 1, invested: amount, returned, myNet, reason, mood, line });
    this.round += 1;
    if (this.round < this.rounds && this.round >= 1) {
      if (this.maybeAskCounterQuestion('invest', value)) return;
    }
    if (this.round < this.rounds) this._render();
    else this._finish();
  }

  _finish() {
    const outcome = this.playerScore > this.oppScore ? 'win' : this.playerScore < this.oppScore ? 'lose' : 'draw';
    const avgInvest = Math.round(this.log.reduce((s, l) => s + l.invested, 0) / this.log.length);
    const avgReturn = Math.round(this.log.reduce((s, l) => s + (l.returned / (l.invested * 3 || 1)), 0) / this.log.length * 100);
    // 公平：平均投入 ≥5 且对手平均返还率 ≥50%（相互信任）
    const fairDeal = avgInvest >= 5 && avgReturn >= 50;
    this.finish({
      kind: 'trust', rounds: this.log,
      playerScore: this.playerScore, oppScore: this.oppScore, outcome, fairDeal,
      summary:
        C.infoRow('平均投入', `${avgInvest} 枚`) +
        C.infoRow('平均返还率', `${avgReturn}%`) +
        C.infoRow('提示', '信任是双向的，适度投入测试对手诚意更为理性'),
    });
  }
}
