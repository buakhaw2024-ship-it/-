// scenarios/bargaining.js — 商业谈判博弈
// Phase 3：还价由 engine 决定。你越强硬（出价压得越低）→ 鹰派 confidence 跌→被迫大让步；
// 风险规避型在压力下过度让步；操纵型忽大忽小。

import { BaseScenario } from './base-scenario.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { clamp } from '../engine/util.js';
import { Memory } from '../engine/memory.js';
import { loadReputation } from '../engine/reputation.js';
import { pickContextualLine } from '../data/opponent-lines-v2.js';
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

  start() {
    OpponentAI.reset(this.opp.id);
    this.initExperience('bargaining', { start: this.oppOffer, trueVal: this.trueVal });
    this._render();
  }

  _render() {
    const opp = this.opp;
    const cur = this.myOffer || this.myAnchor;
    this.tryCram({
      round: this.round, totalRounds: this.rounds, kind: 'bargaining',
      text: `「如果您接受延后付款，我可以在价格上做小幅调整——但这需要额外 2% 的风险保证金。」`,
    });
    this.checkSituationEvent();
    const cramHtml = this.cramControls();
    const situationHtml = this.renderSituationEvent();
    const questionHtml = this.renderCounterQuestion();
    const blockNormal = !!(this._pendingCram || this._pendingSituation || this._pendingQuestion);
    const logHtml = this.log.map((l) => {
      if (l.systemEvent) return C.dialogBubble(`【局势卡】${l.eventTitle} → ${l.choiceText}`, 'system', `第${l.round}轮`);
      if (l.counterQuestion) return C.dialogBubble(l.questionText, 'ai', `${opp.name} 追问`) + C.dialogBubble(l.answerText, 'player', '你的回应');
      const pText = `出价 ${l.my} 元`;
      const oText = `${l.line ? `<b>${l.line}</b><br>` : ''}要价 ${l.opp} 元（差距 ${l.gap} 元）<br><span style="color:var(--dim);font-size:10px">${l.reason || ''}</span>`;
      return C.dialogBubble(pText, 'player', `第${l.round}轮`) + C.dialogBubble(oText, 'ai', `${opp.name} ${C.moodEmoji(l.mood)}`);
    }).join('');

    this.emitRender(`
      ${C.gameHeader(`商业谈判 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      ${C.roundTimeline(this.log, this.rounds, this.round)}
      ${this.experienceBanner()}
      ${C.relationshipPanel(opp)}
      ${C.panel('谈判状态',
        C.infoRow('商品真实价值', '<span style="color:var(--dim)">约 60 元（双方均未知）</span>') +
        C.infoRow('您的当前出价', `<span style="color:var(--green)">${cur} 元</span>`) +
        C.infoRow(`${opp.name} 要价`, `<span style="color:var(--red)">${this.oppOffer} 元</span>`) +
        C.infoRow('差距', `<span style="color:var(--yellow)">${this.oppOffer - cur} 元</span>`))}
      ${this.lastReason ? C.hint(`${opp.name} 心态：${this.lastReason}`, 'purple') : ''}
      ${cramHtml}
      ${situationHtml}
      ${questionHtml}
      ${blockNormal ? '' : C.panel(`您的出价策略（第 ${this.round + 1} 轮）`,
        C.actionBtn('offer', String(cur + 3), `<b>[小幅让步]</b> 提价至 ${cur + 3} 元（+3）`) +
        C.actionBtn('offer', String(cur + 8), `<b>[适度让步]</b> 提价至 ${cur + 8} 元（+8）`) +
        C.actionBtn('offer', String(cur + 15), `<b>[大幅让步]</b> 提价至 ${cur + 15} 元（+15）`) +
        C.actionBtn('accept', String(this.oppOffer), `<b>[接受对方价格]</b> 以 ${this.oppOffer} 元成交`, 'btn-green') +
        this.peekControls())}
      ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}
    `);
  }

  handleAction({ type, value }) {
    if (this.interceptCommonAction(type, value)) return;
    if (type === 'resist-cram') {
      this.consumeCram();
      // 拒绝蚕食 → 对手感到压力但保持高姿态
      OpponentAI.observe(this.opp.id, { aggression: 0.6, firm: true });
      this.lastReason = '你拒绝了加码，谈判气氛紧绷';
      this._render();
      return;
    }
    if (type === 'accept-cram') {
      this.consumeCram();
      // 接受蚕食 → 对手得逞，真实价值上抬，成交更难
      OpponentAI.observe(this.opp.id, { aggression: 0.2, firm: false });
      this.trueVal = Math.min(70, this.trueVal + 3);
      this.lastReason = '你接受了新条件，对方气焰更盛';
      this._render();
      return;
    }
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
    const line = pickContextualLine(this.opp, {
      action: firm ? 'firm' : (lowness > 0.5 ? 'aggressive' : ''),
      mood, memory: Memory.get(this.opp.id), reputation: loadReputation(this.opp.id), round: this.round,
    });

    if (newOpp <= offer || newOpp <= this.trueVal) {
      this.log.push({ round: this.round + 1, my: offer, opp: this.oppOffer, gap: this.oppOffer - offer, reason, mood, line });
      this._deal(Math.round((offer + this.oppOffer) / 2));
      return;
    }
    this.log.push({ round: this.round + 1, my: offer, opp: this.oppOffer, gap: this.oppOffer - offer, reason, mood, line });
    this.oppOffer = newOpp;
    this.round += 1;

    if (this.round >= this.rounds) {
      if (this.oppOffer - offer < 15) this._deal(Math.round((offer + this.oppOffer) / 2));
      else this._deal(this.oppOffer);
    } else {
      if (this.maybeAskCounterQuestion('offer', value)) return;
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
