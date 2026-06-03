// scenarios/bargaining.js — 商业谈判博弈（从 v2.0 平移）
// 玩家为买方（求低价），对手为卖方（求高价）。真实价值约 60。

import { BaseScenario } from './base-scenario.js';
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
  }

  start() { this._render(); }

  // Phase 3: 抽取到 engine
  _oppCounter(playerOffer) {
    const opp = this.opp;
    let reduction;
    if (opp.id === 'aggressive') reduction = 3 + Math.random() * 3;
    else if (opp.id === 'cooperative') reduction = 8 + Math.random() * 6;
    else if (opp.id === 'rational') reduction = 5 + Math.random() * 4;
    else if (opp.id === 'riskAverse') reduction = 6 + Math.random() * 5;
    else reduction = 5 + Math.random() * 5;
    if (playerOffer < this.trueVal * 0.7) reduction *= 0.6;
    return Math.max(this.trueVal, Math.round(this.oppOffer - reduction));
  }

  _render() {
    const opp = this.opp;
    const cur = this.myOffer || this.myAnchor;
    const logHtml = this.log.map((l) =>
      `<div class="log-entry">[${l.round}] 出价:${l.my} | 要价:${l.opp} | 差距:${l.gap}</div>`
    ).join('');

    this.emitRender(`
      ${C.gameHeader(`商业谈判 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      ${C.panel('谈判状态',
        C.infoRow('商品真实价值', '<span style="color:var(--dim)">约 60 元（双方均未知）</span>') +
        C.infoRow('您的当前出价', `<span style="color:var(--green)">${cur} 元</span>`) +
        C.infoRow(`${opp.name} 要价`, `<span style="color:var(--red)">${this.oppOffer} 元</span>`) +
        C.infoRow('差距', `<span style="color:var(--yellow)">${this.oppOffer - cur} 元</span>`))}
      ${C.hint(`您是买方，希望以最低价买入。${opp.name} 是卖方，希望以最高价卖出。`)}
      ${C.panel(`您的出价策略（第 ${this.round + 1} 轮）`,
        C.actionBtn('offer', String(cur + 3), `<b>[小幅让步]</b> 提价至 ${cur + 3} 元（+3）`) +
        C.actionBtn('offer', String(cur + 8), `<b>[适度让步]</b> 提价至 ${cur + 8} 元（+8）`) +
        C.actionBtn('offer', String(cur + 15), `<b>[大幅让步]</b> 提价至 ${cur + 15} 元（+15）`) +
        C.actionBtn('accept', String(this.oppOffer), `<b>[接受对方价格]</b> 以 ${this.oppOffer} 元成交`, 'btn-green'))}
      ${C.logBox('谈判记录', logHtml)}
    `);
  }

  handleAction({ type, value }) {
    if (type === 'accept') { this._deal(this.oppOffer); return; }
    if (type !== 'offer') return;
    const offer = parseInt(value, 10);
    this.myOffer = offer;
    const newOpp = this._oppCounter(offer);

    if (newOpp <= offer || newOpp <= this.trueVal) {
      this._deal(Math.round((offer + this.oppOffer) / 2));
      return;
    }
    this.log.push({ round: this.round + 1, my: offer, opp: this.oppOffer, gap: this.oppOffer - offer });
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
    this.finish({
      playerScore: this.playerScore, oppScore: this.oppScore, outcome,
      summary:
        C.infoRow('成交价格', `${price} 元`) +
        C.infoRow('相比最高价节省', `${100 - price} 元`) +
        C.infoRow('评价', price <= 55 ? '出色！远低于真实价值' : price <= 65 ? '良好，接近真实价值' : '偏高，需要提升议价技巧') +
        C.infoRow('提示', '锚定低价、小幅递减让步、保持耐心是关键'),
    });
  }
}
