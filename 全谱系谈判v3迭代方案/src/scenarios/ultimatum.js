// scenarios/ultimatum.js — 最后通牒博弈（从 v2.0 平移）
// 玩家与对手轮流当提议者；接受者拒绝则双方得 0。

import { BaseScenario } from './base-scenario.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { clamp } from '../engine/util.js';
import { C } from '../ui/components.js';

const TOTAL = 100;

export class UltimatumGame extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.rounds = 3;
    this.round = 0;
    this.playerScore = 0;
    this.oppScore = 0;
    this.pendingOffer = null; // 对手当提议者时的报价（其保留额）
  }

  _isProposer() { return this.round % 2 === 0; }

  start() { OpponentAI.reset(this.opp.id); this._render(); }

  _render() {
    const opp = this.opp;
    const logHtml = this.log.map((l) => {
      const res = l.accepted
        ? `<span style="color:var(--green)">✓ 接受</span>`
        : `<span style="color:var(--red)">✗ 拒绝</span>`;
      return C.dialogBubble(`提案 我方 ${l.myOffer} / 对方 ${l.theirOffer} → ${res}`, 'system', `第${l.round}轮`);
    }).join('');

    const head = `${C.gameHeader(`最后通牒博弈 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      ${C.roundTimeline(this.log, this.rounds, this.round)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '您的总分')}
        ${C.scoreBox(this.oppScore, `${opp.name} 总分`)}
      </div>`;

    if (this._isProposer()) {
      this.emitRender(`${head}
        ${C.hint(`总金额 ${TOTAL} 元待分配。<b>您是提议者</b>，提出分配方案。接受者拒绝则双方均得 0。`)}
        ${C.panel('提出你的分配方案（给自己保留多少？）',
          C.actionBtn('propose', '70', '<b>[激进]</b> 保留 70元，给对方 30元') +
          C.actionBtn('propose', '60', '<b>[偏强]</b> 保留 60元，给对方 40元') +
          C.actionBtn('propose', '50', '<b>[公平]</b> 保留 50元，给对方 50元') +
          C.actionBtn('propose', '40', '<b>[让步]</b> 保留 40元，给对方 60元'))}
        ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}`);
    } else if (this.pendingOffer == null) {
      // 接受者回合：先展示"对手思考中"，稍后生成报价
      this.emitRender(`${head}
        ${C.hint(`总金额 ${TOTAL} 元待分配。<b>您是接受者</b>，${opp.name} 将提出方案。`)}
        ${C.hint(`${opp.name} 正在思考提案...`, 'yellow')}
        ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}`);
      setTimeout(() => {
        const { move } = OpponentAI.decide(this.opp.id, { kind: 'ultimatum-propose', round: this.round });
        this.pendingOffer = move;
        this._render();
      }, 1000);
    } else {
      const keep = this.pendingOffer;
      const give = TOTAL - keep;
      this.emitRender(`${head}
        ${C.hint(`${opp.name} 提议：<b style="color:var(--cyan)">给您 ${give} 元，自己保留 ${keep} 元</b>。`)}
        ${C.panel('您的决定',
          C.actionBtn('respond', 'accept', '<b>[接受]</b> 接受方案，各得所得') +
          C.actionBtn('respond', 'reject', '<b>[拒绝]</b> 拒绝方案，双方得 0'))}
        ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}`);
    }
  }

  handleAction({ type, value }) {
    if (type === 'propose') {
      const keep = parseInt(value, 10);
      // 观察玩家提案的强硬度（自留越多越强硬/越像在剥削）
      OpponentAI.observe(this.opp.id, { aggression: clamp((keep - 50) / 50, 0, 1), firm: keep >= 65, coop: keep <= 50, exposes: keep >= 70 });
      const { move: accepted } = OpponentAI.decide(this.opp.id, { kind: 'ultimatum-respond', playerKeep: keep });
      this._settle(keep, accepted, true);
    } else if (type === 'respond') {
      const keep = this.pendingOffer;
      this._settle(keep, value === 'accept', false);
      this.pendingOffer = null;
    }
  }

  _settle(myKeep, accepted, isMyProposal) {
    const theirShare = TOTAL - myKeep;
    let myGain, oppGain;
    if (isMyProposal) {
      myGain = accepted ? myKeep : 0;
      oppGain = accepted ? theirShare : 0;
    } else {
      myGain = accepted ? theirShare : 0;
      oppGain = accepted ? myKeep : 0;
    }
    this.playerScore += myGain;
    this.oppScore += oppGain;
    this.log.push({
      round: this.round + 1,
      myOffer: isMyProposal ? myKeep : theirShare,
      theirOffer: isMyProposal ? theirShare : myKeep,
      accepted,
    });
    this.round += 1;
    if (this.round < this.rounds) this._render();
    else this._finish();
  }

  _finish() {
    const outcome = this.playerScore > this.oppScore ? 'win' : this.playerScore < this.oppScore ? 'lose' : 'draw';
    const acc = Math.round(this.log.filter((l) => l.accepted).length / this.log.length * 100);
    // 公平成交：有分配回合中我方提案在 40-62 区间且被接受
    const fairDeal = this.log.some((r) => r.accepted && r.myOffer >= 40 && r.myOffer <= 62);
    this.finish({
      kind: 'ultimatum', rounds: this.log,
      playerScore: this.playerScore, oppScore: this.oppScore, outcome, fairDeal,
      summary:
        C.infoRow('接受率', `${acc}%`) +
        C.infoRow('最优策略', '作为提议者锚定 55-60，接受者接受 >30% 的方案'),
    });
  }
}
