// scenarios/crisis.js — 危机谈判（从 v2.0 平移）
// 四阶段危机处置；每个选择影响谈判积分与危机风险值。

import { BaseScenario } from './base-scenario.js';
import { C } from '../ui/components.js';

export class CrisisNegotiation extends BaseScenario {
  constructor(opp) {
    super(opp);
    this.stage = 0;
    this.playerScore = 0;
    this.oppScore = 50; // 危机风险值起点
    this.stages = [
      { title:'第一阶段：建立初步接触',
        context:`危机现场：${opp.name}声称持有重要文件，威胁要公开引发连锁反应。您是谈判代表，需要建立接触。`,
        options:[
          { text:'战术性同理心："我理解您现在的压力，这一定非常困难..."', ps:15, os:-10, feedback:'很好！同理心降低了防御性，对话通道初步建立。' },
          { text:'直接要求："请立即停止威胁行为，我们来谈条件。"', ps:5, os:0, feedback:'过于强硬，对方防御性增加，但明确了谈判立场。' },
          { text:'倾听策略：沉默让对方先说，使用镜像技术复述', ps:12, os:-5, feedback:'有效的倾听技巧，获取了更多信息。' },
          { text:'权威压制："上级已经授权我全权处理，必须服从。"', ps:-5, os:10, feedback:'权威策略激化矛盾，对方更加警觉。' },
        ] },
      { title:'第二阶段：深化沟通理解',
        context:'初步接触建立后，需要深入了解对方诉求，寻找核心利益。',
        options:[
          { text:'校准问题："您最担心的具体是什么？我如何才能帮助您？"', ps:15, os:-10, feedback:'开放式校准问题触发深度思考，获取关键信息。' },
          { text:'贴标签技术："看起来您对当前局面感到非常愤怒和失望。"', ps:12, os:-8, feedback:'准确标签降低情绪张力，建立情感连接。' },
          { text:'利益置换："告诉我您真正需要的，也许我们能找到另一条路。"', ps:18, os:-15, feedback:'直指核心利益，突破立场僵局！' },
          { text:'拖延策略："让我去请示上级，需要一些时间。"', ps:3, os:5, feedback:'拖延可能激怒对方，但为内部协调争取时间。' },
        ] },
      { title:'第三阶段：寻找解决方案',
        context:'对方核心诉求已初步明确，需要创造可接受的解决方案。',
        options:[
          { text:'整合性方案："如果我们能保证您的A需求，您是否愿意在B上妥协？"', ps:18, os:-12, feedback:'整合性谈判创造新价值，双方空间扩大。' },
          { text:'小步骤策略："先解决最小的问题，建立信任后再谈大问题。"', ps:15, os:-10, feedback:'增量式推进降低风险，积累谈判动力。' },
          { text:'"就是这样"技术：重新表述对方诉求直到获得确认', ps:12, os:-8, feedback:'确认理解减少误解，为方案奠定基础。' },
          { text:'最后期限压力："我们只有30分钟，现在必须做决定。"', ps:-8, os:15, feedback:'人工期限适得其反，破坏了之前建立的信任。' },
        ] },
      { title:'第四阶段：巩固协议',
        context:'双方接近共识，需要巩固并确保协议落实。',
        options:[
          { text:'书面确认："让我们把达成的共识逐条写下来，确保理解一致。"', ps:15, os:-10, feedback:'书面确认防止事后争议，体现专业性。' },
          { text:'"不"的保护：提供可接受的最低条件，让对方主动选择', ps:12, os:-8, feedback:'选择权归还给对方，增加协议持久性。' },
          { text:'条件绑定："如果执行协议，我们将提供额外的保障措施。"', ps:18, os:-15, feedback:'条件让步激励执行，创造正向反馈机制！' },
          { text:'强制结束："时间到，必须立即执行，否则后果自负。"', ps:-10, os:20, feedback:'强制性结束摧毁信任，协议可能不持久。' },
        ] },
    ];
  }

  start() { this._render(); }

  _render() {
    const s = this.stages[this.stage];
    const opp = this.opp;
    const logHtml = this.log.map((l) => {
      const color = l.ps >= 10 ? 'var(--green)' : l.ps >= 0 ? 'var(--yellow)' : 'var(--red)';
      return C.dialogBubble(`${l.feedback} <span style="color:${color}">${l.ps > 0 ? '+' : ''}${l.ps}分</span>`, 'system', l.stage);
    }).join('');

    this.emitRender(`
      ${C.gameHeader(`危机谈判 — ${s.title}`)}
      ${C.stageProgress(this.stage, this.stages.length)}
      <div class="grid2" style="margin:12px 0">
        ${C.scoreBox(this.playerScore, '谈判积分')}
        ${C.scoreBox(Math.max(0, this.oppScore), '危机风险值', 'var(--red)')}
      </div>
      ${C.hint(s.context, 'yellow')}
      ${C.hint(`对手档案：${opp.name} | ${opp.type} | ${opp.desc}`)}
      ${C.panel('选择谈判策略', s.options.map((o, i) => C.actionBtn('stage', String(i), o.text)).join(''))}
      ${logHtml ? `<div class="bubble-log">${logHtml}</div>` : ''}
    `);
  }

  handleAction({ type, value }) {
    if (type !== 'stage') return;
    const s = this.stages[this.stage];
    const opt = s.options[parseInt(value, 10)];
    this.playerScore += opt.ps;
    this.oppScore += opt.os;
    const maxPs = Math.max(...s.options.map((o) => o.ps));
    this.log.push({ stage: `第${this.stage + 1}阶段`, feedback: opt.feedback, ps: opt.ps, maxPs });
    this.stage += 1;

    if (this.stage < this.stages.length) {
      this.emitRender(`${C.gameHeader('危机谈判 — 处理中...')}
        ${C.hint(`<b>反馈：</b>${opt.feedback}`, opt.ps > 0 ? 'green' : 'red')}
        ${C.hint('正在进入下一阶段...', 'cyan')}`);
      setTimeout(() => this._render(), 1500);
    } else {
      this._finish();
    }
  }

  _finish() {
    const outcome = this.playerScore >= 50 ? 'win' : this.playerScore >= 20 ? 'draw' : 'lose';
    // 公平：有效化解危机（分数 ≥40），非极端强硬解法
    const fairDeal = this.playerScore >= 40;
    this.finish({
      kind: 'crisis', rounds: this.log,
      playerScore: this.playerScore,
      oppScore: Math.max(0, 100 - this.playerScore),
      outcome, fairDeal,
      summary:
        C.infoRow('最终谈判积分', String(this.playerScore)) +
        C.infoRow('危机化解程度', this.playerScore >= 50 ? '成功化解' : '部分化解') +
        C.infoRow('评级', this.playerScore >= 60 ? '卓越谈判官' : this.playerScore >= 40 ? '称职谈判员' : '需要加强训练'),
    });
  }
}
