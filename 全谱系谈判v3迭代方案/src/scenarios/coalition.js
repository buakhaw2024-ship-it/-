// scenarios/coalition.js — 联盟谈判（从 v2.0 平移，修正了 v2.0 中 ${opp.name} 未插值的笔误）
// 四阶段多方博弈：信息扫描 → 联盟构建 → 巩固 → 终局转化。

import { BaseScenario } from './base-scenario.js';
import { C } from '../ui/components.js';

export class CoalitionGame extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.stage = 0;
    this.playerScore = 0;
    this.oppScore = 0;
    this.allies = 0;
    this.stages = [
      { title:'第一阶段：利益扫描',
        context:'多方谈判开始。您需要了解各方立场，识别潜在盟友和威胁。',
        options:[
          { text:'广泛信息收集：私下约谈每一方，了解各自核心诉求', ps:15, allies:1, feedback:'信息优势确立，识别了两个潜在盟友。' },
          { text:'公开立场宣示：直接阐明你的方案，测试各方反应', ps:8, allies:0, feedback:'立场清晰但暴露了底线，灵活性下降。' },
          { text:'观察等待：保持中立，让各方先交锋', ps:5, allies:0, feedback:'获得了观察机会，但错过了主动建联时机。' },
          { text:'与最强方结盟：立即接近实力最强的参与者', ps:-5, allies:1, feedback:'提前绑定可能失去其他联盟机会。' },
        ] },
      { title:'第二阶段：联盟构建',
        context:`您已掌握部分信息。${opp.name}正在积极游说，与您竞争关键盟友。`,
        options:[
          { text:'利益整合提案：设计满足盟友核心诉求的联合方案', ps:20, allies:1, feedback:'精准的利益对接赢得关键盟友加入！' },
          { text:'价值交换：提供对方高度需要的资源，换取联盟承诺', ps:15, allies:1, feedback:'等价交换达成，联盟基础稳固。' },
          { text:'揭露竞争对手弱点：向潜在盟友展示对手方案的缺陷', ps:8, allies:0, feedback:'有一定效果，但道德风险影响长期声誉。' },
          { text:'激进报价：承诺给盟友超额利益', ps:-10, allies:0, feedback:'过度承诺损害可信度，盟友持观望态度。' },
        ] },
      { title:'第三阶段：巩固联盟',
        context:`联盟初步形成，但内部存在分歧，外部 ${opp.name} 在尝试分化。`,
        options:[
          { text:'建立内部共识机制：定期沟通，透明决策过程', ps:18, allies:1, feedback:'内聚力增强，联盟稳定性大幅提升。' },
          { text:'创造集体认同：塑造"我们"的共同价值和目标', ps:15, allies:0, feedback:'集体认同建立，联盟更具凝聚力。' },
          { text:'设立退出成本：建立联盟离开的代价机制', ps:10, allies:0, feedback:'约束机制有效，但也限制了联盟灵活性。' },
          { text:'孤立对手：切断对手与中立方的联系', ps:5, allies:0, feedback:'孤立策略有风险，可能激化对抗。' },
        ] },
      { title:'第四阶段：最终谈判',
        context:'联盟谈判进入终局，需要将联盟优势转化为最终协议。',
        options:[
          { text:'展示联盟实力：明确但非威胁性地呈现联盟的综合优势', ps:20, allies:0, feedback:'实力展示改变了对手的BATNA评估，协议加速达成。' },
          { text:'提出一揽子方案：将所有议题打包，寻找整体最优解', ps:18, allies:0, feedback:'打包策略创造了额外价值，多方受益。' },
          { text:'设置最后期限：宣布联盟在X时间后单方面行动', ps:8, allies:0, feedback:'期限有效但破坏了部分谈判善意。' },
          { text:'妥协型收尾：主动放弃部分次要利益以确保核心利益', ps:15, allies:0, feedback:'战略性妥协展现了成熟的谈判风范。' },
        ] },
    ];
  }

  start() { this._render(); }

  _render() {
    const s = this.stages[this.stage];
    const logHtml = this.log.map((l) => `<div class="log-entry">[${l.stage}] ${l.feedback}</div>`).join('');

    this.emitRender(`
      ${C.gameHeader(`联盟谈判 — ${s.title}`)}
      <div class="grid3" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '谈判积分')}
        ${C.scoreBox(this.allies, '当前盟友数', 'var(--green)')}
        ${C.scoreBox(`${this.stage + 1}/4`, '阶段进度', 'var(--yellow)')}
      </div>
      ${C.hint(s.context)}
      ${C.panel('选择谈判策略', s.options.map((o, i) => C.actionBtn('stage', String(i), o.text)).join(''))}
      ${C.logBox('阶段记录', logHtml)}
    `);
  }

  handleAction({ type, value }) {
    if (type !== 'stage') return;
    const s = this.stages[this.stage];
    const opt = s.options[parseInt(value, 10)];
    this.playerScore += opt.ps;
    this.allies += opt.allies || 0;
    this.oppScore += (5 - Math.floor(opt.ps / 5));
    this.log.push({ stage: `第${this.stage + 1}阶段`, feedback: opt.feedback });
    this.stage += 1;

    if (this.stage < this.stages.length) {
      const kind = opt.ps > 10 ? 'green' : opt.ps > 0 ? 'cyan' : 'red';
      this.emitRender(`${C.gameHeader('联盟谈判 — 推进中...')}
        ${C.hint(`<b>阶段反馈：</b>${opt.feedback}`, kind)}
        ${C.hint('正在进入下一阶段...', 'cyan')}`);
      setTimeout(() => this._render(), 1500);
    } else {
      this._finish();
    }
  }

  _finish() {
    const outcome = this.playerScore > 45 && this.allies >= 2 ? 'win' : this.playerScore > 25 ? 'draw' : 'lose';
    this.finish({
      playerScore: this.playerScore, oppScore: this.oppScore, outcome,
      summary:
        C.infoRow('总积分', String(this.playerScore)) +
        C.infoRow('最终盟友数', String(this.allies)) +
        C.infoRow('评级', this.playerScore >= 55 && this.allies >= 2 ? '联盟大师' : this.playerScore >= 35 ? '合格谈判员' : '需要加强多方博弈技巧'),
    });
  }
}
