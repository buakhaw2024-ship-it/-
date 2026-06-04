// scenarios/public-goods.js — 公共品博弈
// Phase 3：对手贡献由 engine 决定（理性型条件合作、操纵型飘忽等）。

import { BaseScenario } from './base-scenario.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { C } from '../ui/components.js';

export class PublicGoodsGame extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.rounds = 4;
    this.round = 0;
    this.playerScore = 40;
    this.oppScore = 40;
    this.multiplier = 2.2;
  }

  start() { OpponentAI.reset(this.opp.id); this._render(); }

  _render() {
    const opp = this.opp;
    const logHtml = this.log.map((l) => {
      const pText = `贡献 ${l.my} 枚`;
      const oText = `贡献 ${l.opp} 枚（公共池 ${l.pool}，各得 ${l.share}）${l.reason ? ' — ' + l.reason : ''}`;
      return C.dialogBubble(pText, 'player', `第${l.round}轮`) + C.dialogBubble(oText, 'ai', `${opp.name} ${C.moodEmoji(l.mood)}`);
    }).join('');

    this.emitRender(`
      ${C.gameHeader(`公共品博弈 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      ${C.roundTimeline(this.log, this.rounds, this.round)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '您的余额')}
        ${C.scoreBox(this.oppScore, `${opp.name} 余额`)}
      </div>
      ${C.hint(`每轮各有 10 枚筹码，可贡献到公共池。公共池总额 ×${this.multiplier} 后平分给所有人。<br>理性自私：贡献 0（但若人人如此，公共品崩溃）。`)}
      ${C.panel('选择贡献数量',
        C.actionBtn('contribute', '10', '<b>[全力贡献]</b> 贡献 10枚 — 最大化公共利益') +
        C.actionBtn('contribute', '7', '<b>[高度合作]</b> 贡献 7枚 — 偏向集体') +
        C.actionBtn('contribute', '4', '<b>[适度参与]</b> 贡献 4枚 — 平衡策略') +
        C.actionBtn('contribute', '0', '<b>[搭便车]</b> 贡献 0枚 — 最大化个人利益') +
        this.peekControls())}
      ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}
    `);
  }

  handleAction({ type, value }) {
    if (type === 'peek') { this.handlePeek(); return; }
    if (type !== 'contribute') return;
    this._peekSnap = null;
    const amount = parseInt(value, 10);
    const prev = this.log.length ? this.log[this.log.length - 1].my : null;
    OpponentAI.observe(this.opp.id, { coop: amount >= 5, aggression: amount <= 1 ? 0.7 : 0.2, firm: amount <= 1 });
    const { move: oppContrib, reason, mood } = OpponentAI.decide(this.opp.id, { kind: 'pg-contribute', round: this.round, playerLastContrib: prev });
    const pool = (amount + oppContrib) * this.multiplier;
    const share = Math.round(pool / 2);
    this.playerScore = this.playerScore - amount + share;
    this.oppScore = this.oppScore - oppContrib + share;
    this.log.push({ round: this.round + 1, my: amount, opp: oppContrib, pool: Math.round(pool), share, reason, mood });
    this.round += 1;
    if (this.round < this.rounds) this._render();
    else this._finish();
  }

  _finish() {
    const outcome = this.playerScore > this.oppScore ? 'win' : this.playerScore === this.oppScore ? 'coop' : 'lose';
    const avg = Math.round(this.log.reduce((s, l) => s + l.my, 0) / this.log.length);
    // 公平：平均贡献 ≥4（全员合作接近最优）
    const fairDeal = avg >= 4;
    this.finish({
      kind: 'publicgoods', rounds: this.log,
      playerScore: this.playerScore, oppScore: this.oppScore, outcome, fairDeal,
      summary:
        C.infoRow('平均贡献量', `${avg} 枚`) +
        C.infoRow('最优策略', '条件合作：模仿对方上轮贡献，避免持续被剥削') +
        C.infoRow('启示', '公共品博弈揭示集体行动困境，信任与声誉是合作的基础'),
    });
  }
}
