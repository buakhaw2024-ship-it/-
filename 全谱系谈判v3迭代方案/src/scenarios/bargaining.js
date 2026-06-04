// scenarios/bargaining.js — 商业谈判博弈
// Phase 3：还价由 engine 决定。你越强硬（出价压得越低）→ 鹰派 confidence 跌→被迫大让步；
// 风险规避型在压力下过度让步；操纵型忽大忽小。

import { BaseScenario } from './base-scenario.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { clamp } from '../engine/util.js';
import { C } from '../ui/components.js';

export class BargainingGame extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.rounds = 5;
    this.round = 0;
    this.playerScore = 0;
    this.oppScore = 0;
    this.myAnchor = 40;
    this.myOffer = 0;
    this.oppOffer = 100;
    this.trueVal = 60;
    this.lastReason = '';
  }

  start() { OpponentAI.reset(this.opp.id); this._render(); }

  _render() {
    const opp = this.opp;
    const cur = this.myOffer || this.myAnchor;
    const logHtml = this.log.map((l) => {
      const pText = `出价 ${l.my} 元`;
      const oText = `要价 ${l.opp} 元（差距 ${l.gap} 元）${l.reason ? ' — ' + l.reason : ''}`;
      return C.dialogBubble(pText, 'player', `第${l.round}轮`) + C.dialogBubble(oText, 'ai', `${opp.name} ${C.moodEmoji(l.mood)}`);
    }).join('');

    this.emitRender(`
      ${C.gameHeader(`商业谈判 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      ${C.roundTimeline(this.log, this.rounds, this.round)}
      ${C.panel('谈判状态',
        C.infoRow('商品真实价值', '<span style="color:var(--dim)">约 60 元（双方均未知）</span>') +
        C.infoRow('您的当前出价', `<span style="color:var(--green)">${cur} 元</span>`) +
        C.infoRow(`${opp.name} 要价`, `<span style="color:var(--red)">${this.oppOffer} 元</span>`) +
        C.infoRow('差距', `<span style="color:var(--yellow)">${this.oppOffer - cur} 元</span>`))}
      ${this.lastReason ? C.hint(`${opp.name} 心态：${this.lastReason}`, 'purple') : C.hint(`您是买方，希望以最低价买入。${opp.name} 是卖方，希望以最高价卖出。`)}
      ${C.panel(`您的出价策略（第 ${this.round + 1} 轮）`,
        C.actionBtn('offer', String(cur + 3), `<b>[小幅让步]</b> 提价至 ${cur + 3} 元（+3）`) +
        C.actionBtn('offer', String(cur + 8), `<b>[适度让步]</b> 提价至 ${cur + 8} 元（+8）`) +
        C.actionBtn('offer', String(cur + 15), `<b>[大幅让步]</b> 提价至 ${cur + 15} 元（+15）`) +
        C.actionBtn('accept', String(this.oppOffer), `<b>[接受对方价格]</b> 以 ${this.oppOffer} 元成交`, 'btn-green') +
        this.peekControls())}
      ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}
    `);
  }

  handleAction({ type, value }) {
    if (type === 'peek') { this.handlePeek(); return; }
    if (type === 'accept') { this._deal(this.oppOffer); return; }
    if (type !== 'offer') return;
    this._peekSnap = null;
    const offer = parseInt(value, 10);
    this.myOffer = offer;

    // 观察玩家强硬度：出价压得越低越强硬（可压垮鹰派、施压风险规避型）
    const lowness = clamp((this.trueVal - offer) / this.trueVal, 0, 1);
    const firm = offer < this.trueVal * 0.7;
    OpponentAI.observe(this.opp.id, { aggression: firm ? 0.7 : 0.3, firm, concession: offer - (this.log.length ? this.log[this.log.length - 1].my : this.myAnchor) });

    const { move: newOpp, reason, mood } = OpponentAI.decide(this.opp.id, {
      kind: 'bargain-counter', currentOppOffer: this.oppOffer, playerOffer: offer, trueVal: this.trueVal,
    });
    this.lastReason = reason;

    if (newOpp <= offer || newOpp <= this.trueVal) {
      this.log.push({ round: this.round + 1, my: offer, opp: this.oppOffer, gap: this.oppOffer - offer, reason, mood });
      this._deal(Math.round((offer + this.oppOffer) / 2));
      return;
    }
    this.log.push({ round: this.round + 1, my: offer, opp: this.oppOffer, gap: this.oppOffer - offer, reason, mood });
    this.oppOffer = newOpp;
    this.round += 1;

    if (this.round >= this.rounds) {
      if (this.oppOffer - offer < 15) this._deal(Math.round((offer + this.oppOffer) / 2));
      else this._deal(this.oppOffer);
    } else {
      this._render();
    }
  }

  _deal(price) {
    this.playerScore = Math.max(0, 100 - price);
    this.oppScore = Math.max(0, price - 40);
    const outcome = price <= 55 ? 'win' : price <= 65 ? 'draw' : 'lose';
    // 公平成交：成交价在真实价值附近（55-70 区间），双方均有收益
    const fairDeal = price >= 55 && price <= 70;
    this.finish({
      kind: 'bargaining', rounds: this.log,
      playerScore: this.playerScore, oppScore: this.oppScore, outcome, fairDeal,
      summary:
        C.infoRow('成交价格', `${price} 元`) +
        C.infoRow('相比最高价节省', `${100 - price} 元`) +
        C.infoRow('评价', price <= 55 ? '出色！远低于真实价值' : price <= 65 ? '良好，接近真实价值' : '偏高，需要提升议价技巧') +
        C.infoRow('提示', '锚定低价、小幅递减让步、保持耐心是关键'),
    });
  }
}
