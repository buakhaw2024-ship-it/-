// scenarios/trust.js — 信任博弈
// Phase 3：返还由 engine 决定；操纵型"钓鱼→收割"、对手情绪随你的投入演化。

import { BaseScenario } from './base-scenario.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { C } from '../ui/components.js';

export class TrustGame extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.rounds = 3;
    this.round = 0;
    this.playerScore = 0;
    this.oppScore = 0;
  }

  start() { OpponentAI.reset(this.opp.id); this._render(); }

  _render() {
    const opp = this.opp;
    const logHtml = this.log.map((l) => {
      const pText = `投入 ${l.invested} 枚`;
      const oText = `返还 ${l.returned} 枚（净收益 ${l.myNet >= 0 ? '+' : ''}${l.myNet}）${l.reason ? ' — ' + l.reason : ''}`;
      return C.dialogBubble(pText, 'player', `第${l.round}轮`) + C.dialogBubble(oText, 'ai', opp.name);
    }).join('');

    this.emitRender(`
      ${C.gameHeader(`信任博弈 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      ${C.roundTimeline(this.log, this.rounds, this.round)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '您的总分')}
        ${C.scoreBox(this.oppScore, `${opp.name} 总分`)}
      </div>
      ${C.hint(`<b>信任博弈：</b>您有 10 枚筹码。选择投入数额，系统 3 倍放大后交给 ${opp.name}，${opp.name} 再决定返还多少。这是一个信任测试！`)}
      ${C.panel('选择投入金额（总共 10 枚）',
        C.actionBtn('invest', '10', '<b>[全力信任]</b> 投入 10枚 → 对方收到 30枚') +
        C.actionBtn('invest', '7', '<b>[高度信任]</b> 投入 7枚 → 对方收到 21枚') +
        C.actionBtn('invest', '4', '<b>[适度信任]</b> 投入 4枚 → 对方收到 12枚') +
        C.actionBtn('invest', '0', '<b>[零信任]</b> 投入 0枚 → 保留所有筹码') +
        this.peekControls())}
      ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}
    `);
  }

  handleAction({ type, value }) {
    if (type === 'peek') { this.handlePeek(); return; }
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
    this.log.push({ round: this.round + 1, invested: amount, returned, myNet, reason, mood });
    this.round += 1;
    if (this.round < this.rounds) this._render();
    else this._finish();
  }

  _finish() {
    const outcome = this.playerScore > this.oppScore ? 'win' : this.playerScore < this.oppScore ? 'lose' : 'draw';
    const avgInvest = Math.round(this.log.reduce((s, l) => s + l.invested, 0) / this.log.length);
    const avgReturn = Math.round(this.log.reduce((s, l) => s + (l.returned / (l.invested * 3 || 1)), 0) / this.log.length * 100);
    this.finish({
      kind: 'trust', rounds: this.log,
      playerScore: this.playerScore, oppScore: this.oppScore, outcome,
      summary:
        C.infoRow('平均投入', `${avgInvest} 枚`) +
        C.infoRow('平均返还率', `${avgReturn}%`) +
        C.infoRow('提示', '信任是双向的，适度投入测试对手诚意更为理性'),
    });
  }
}
