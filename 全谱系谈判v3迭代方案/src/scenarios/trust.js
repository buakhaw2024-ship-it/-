// scenarios/trust.js — 信任博弈（从 v2.0 平移）
// 玩家投入 → 3 倍放大 → 对手决定返还多少。

import { BaseScenario } from './base-scenario.js';
import { C } from '../ui/components.js';

export class TrustGame extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.rounds = 3;
    this.round = 0;
    this.playerScore = 0;
    this.oppScore = 0;
  }

  start() { this._render(); }

  _render() {
    const opp = this.opp;
    const logHtml = this.log.map((l) =>
      `<div class="log-entry">[${l.round}] 投入:${l.invested} 返还:${l.returned} 净收益:${l.myNet > 0 ? '+' : ''}${l.myNet}</div>`
    ).join('');

    this.emitRender(`
      ${C.gameHeader(`信任博弈 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '您的总分')}
        ${C.scoreBox(this.oppScore, `${opp.name} 总分`)}
      </div>
      ${C.hint(`<b>信任博弈：</b>您有 10 枚筹码。选择投入数额，系统 3 倍放大后交给 ${opp.name}，${opp.name} 再决定返还多少。这是一个信任测试！`)}
      ${C.panel('选择投入金额（总共 10 枚）',
        C.actionBtn('invest', '10', '<b>[全力信任]</b> 投入 10枚 → 对方收到 30枚') +
        C.actionBtn('invest', '7', '<b>[高度信任]</b> 投入 7枚 → 对方收到 21枚') +
        C.actionBtn('invest', '4', '<b>[适度信任]</b> 投入 4枚 → 对方收到 12枚') +
        C.actionBtn('invest', '0', '<b>[零信任]</b> 投入 0枚 → 保留所有筹码'))}
      ${C.logBox('信任记录', logHtml)}
    `);
  }

  // Phase 3: 抽取到 engine
  _oppReturn(tripled, amount) {
    const opp = this.opp;
    if (opp.id === 'cooperative') return Math.round(tripled * 0.6);
    if (opp.id === 'aggressive') return Math.round(tripled * 0.15);
    if (opp.id === 'manipulative') return Math.round(tripled * (Math.random() < 0.3 ? 0.5 : 0.1));
    if (opp.id === 'riskAverse') return Math.round(tripled * 0.4);
    if (opp.id === 'emotional') return Math.round(tripled * (amount > 5 ? 0.55 : 0.3));
    return Math.round(tripled * 0.45);
  }

  handleAction({ type, value }) {
    if (type !== 'invest') return;
    const amount = parseInt(value, 10);
    const tripled = amount * 3;
    const returned = this._oppReturn(tripled, amount);
    const kept = 10 - amount;
    const myNet = kept + returned - 10;
    this.playerScore += kept + returned;
    this.oppScore += tripled - returned;
    this.log.push({ round: this.round + 1, invested: amount, returned, myNet });
    this.round += 1;
    if (this.round < this.rounds) this._render();
    else this._finish();
  }

  _finish() {
    const outcome = this.playerScore > this.oppScore ? 'win' : this.playerScore < this.oppScore ? 'lose' : 'draw';
    const avgInvest = Math.round(this.log.reduce((s, l) => s + l.invested, 0) / this.log.length);
    const avgReturn = Math.round(this.log.reduce((s, l) => s + (l.returned / (l.invested * 3 || 1)), 0) / this.log.length * 100);
    this.finish({
      playerScore: this.playerScore, oppScore: this.oppScore, outcome,
      summary:
        C.infoRow('平均投入', `${avgInvest} 枚`) +
        C.infoRow('平均返还率', `${avgReturn}%`) +
        C.infoRow('提示', '信任是双向的，适度投入测试对手诚意更为理性'),
    });
  }
}
