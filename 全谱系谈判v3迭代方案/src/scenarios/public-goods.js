// scenarios/public-goods.js — 公共品博弈（从 v2.0 平移）
// 公共池总额 ×2.2 后平分；个人理性 vs 集体最优的张力。

import { BaseScenario } from './base-scenario.js';
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

  start() { this._render(); }

  // Phase 3: 抽取到 engine
  _oppContrib(playerContrib) {
    const opp = this.opp;
    if (opp.id === 'cooperative') return 7 + Math.floor(Math.random() * 3);
    if (opp.id === 'aggressive') return 1 + Math.floor(Math.random() * 3);
    if (opp.id === 'rational') return Math.round(playerContrib * 0.9);
    if (opp.id === 'manipulative') return Math.random() < 0.4 ? 8 : 2;
    return 4 + Math.floor(Math.random() * 4);
  }

  _render() {
    const opp = this.opp;
    const logHtml = this.log.map((l) =>
      `<div class="log-entry">[${l.round}] 您贡献:${l.my} 对方贡献:${l.opp} 池总额:${l.pool} 各得:${l.share}</div>`
    ).join('');

    this.emitRender(`
      ${C.gameHeader(`公共品博弈 — 第 ${this.round + 1}/${this.rounds} 轮`)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '您的余额')}
        ${C.scoreBox(this.oppScore, `${opp.name} 余额`)}
      </div>
      ${C.hint(`每轮各有 10 枚筹码，可贡献到公共池。公共池总额 ×${this.multiplier} 后平分给所有人。<br>理性自私：贡献 0（但若人人如此，公共品崩溃）。`)}
      ${C.panel('选择贡献数量',
        C.actionBtn('contribute', '10', '<b>[全力贡献]</b> 贡献 10枚 — 最大化公共利益') +
        C.actionBtn('contribute', '7', '<b>[高度合作]</b> 贡献 7枚 — 偏向集体') +
        C.actionBtn('contribute', '4', '<b>[适度参与]</b> 贡献 4枚 — 平衡策略') +
        C.actionBtn('contribute', '0', '<b>[搭便车]</b> 贡献 0枚 — 最大化个人利益'))}
      ${C.logBox('贡献记录', logHtml)}
    `);
  }

  handleAction({ type, value }) {
    if (type !== 'contribute') return;
    const amount = parseInt(value, 10);
    const oppContrib = this._oppContrib(amount);
    const pool = (amount + oppContrib) * this.multiplier;
    const share = Math.round(pool / 2);
    this.playerScore = this.playerScore - amount + share;
    this.oppScore = this.oppScore - oppContrib + share;
    this.log.push({ round: this.round + 1, my: amount, opp: oppContrib, pool: Math.round(pool), share });
    this.round += 1;
    if (this.round < this.rounds) this._render();
    else this._finish();
  }

  _finish() {
    const outcome = this.playerScore > this.oppScore ? 'win' : this.playerScore === this.oppScore ? 'coop' : 'lose';
    const avg = Math.round(this.log.reduce((s, l) => s + l.my, 0) / this.log.length);
    this.finish({
      playerScore: this.playerScore, oppScore: this.oppScore, outcome,
      summary:
        C.infoRow('平均贡献量', `${avg} 枚`) +
        C.infoRow('最优策略', '条件合作：模仿对方上轮贡献，避免持续被剥削') +
        C.infoRow('启示', '公共品博弈揭示集体行动困境，信任与声誉是合作的基础'),
    });
  }
}
