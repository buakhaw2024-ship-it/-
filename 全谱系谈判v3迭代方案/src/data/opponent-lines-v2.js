// data/opponent-lines-v2.js — 情境化对手台词库
// 台词桶由 mood / memory / reputation / action / outcome 联合驱动，不是纯随机。

import { Mood } from '../engine/mood.js';
import { Memory } from '../engine/memory.js';
import { loadReputation } from '../engine/reputation.js';

export const OPP_LINES_V2 = {
  rational: {
    greet: ['数据模型已载入。请开始你的选择。', '我会根据收益矩阵计算最优反应。', '情绪不是变量。让我们进入博弈。'],
    coopHighTrust: ['合作路径正在收敛，继续保持。', '你的选择提高了双方期望收益。', '理性上，这是一个可持续策略。'],
    coopLowTrust: ['你现在选择合作，但历史记录显示我还不能完全信任你。', '合作信号收到，但我需要更多样本确认。', '单次合作不足以改变模型判断。'],
    defect: ['背叛行为已记录，我会调整下一轮反应。', '你选择了短期收益路径。', '偏离合作均衡，后续代价会上升。'],
    underPressure: ['你的施压缺少客观依据。', '请给出数据，否则我不会调整判断。', '强硬不是问题，问题是你有没有事实支撑。'],
    afterPlayerWin: ['上次你赢了，我已经更新模型。', '你之前的策略被记录了，这次不会完全有效。', '历史样本显示你不是普通对手。'],
    afterPlayerLose: ['你的上次失误很明显，希望你已经修正。', '从历史记录看，你容易在中段暴露底线。', '如果你重复旧策略，结果不会改变。'],
    win: ['结果符合预期。', '我的模型胜出了。', '数据没有情绪，但有结论。'],
    lose: ['模型误差超过预期，我需要重新校准。', '你做出了非常规但有效的选择。', '这次你突破了我的预测。'],
    draw: ['均衡结果。', '双方都没有明显偏离稳定策略。', '平局说明当前策略组合接近均衡。'],
  },

  emotional: {
    greet: ['我们能不能不要把气氛弄得太僵？', '我希望这次可以好好谈。', '我会在意你的态度，不只是你的选择。'],
    coopHighTrust: ['谢谢你，我感觉你是真的愿意合作。', '这样我会更愿意相信你。', '你刚才的选择让我放松了一点。'],
    coopLowTrust: ['你现在合作了，可我还记得你之前的做法。', '我想相信你，但我有点犹豫。', '这次我先接受，但我还会观察。'],
    defect: ['你为什么要这样？我以为我们可以合作。', '这让我很不舒服。', '我会记住这次。'],
    underPressure: ['你这样说让我压力很大。', '如果你继续逼我，我可能会直接拒绝。', '我需要被尊重，不是被压迫。'],
    afterPlayerWin: ['上次你赢了，可我其实有点受伤。', '我不确定这次还能不能信任你。', '我记得你上次是怎么赢的。'],
    afterPlayerLose: ['上次你输了，但我不想把你逼得太难看。', '希望这次我们可以更平和一点。', '你上次有点急，这次慢慢来。'],
    win: ['我赢了，但我不想把关系弄坏。', '这不是我最想要的结果，但还好。', '也许我们下次可以不这么对抗。'],
    lose: ['我输了。希望你不是故意伤害我。', '这局我有点难受。', '我会记住这个感觉。'],
    draw: ['平局也好，至少没有太糟。', '我可以接受这个结果。', '还算公平吧。'],
  },

  aggressive: {
    greet: ['别绕弯子，直接来。', '让我看看你有没有底气。', '你最好准备好被压到墙角。'],
    coopHighTrust: ['合作？你是在示弱，还是有后手？', '你这么好说话，我反而想继续压一压。', '别以为合作就能让我让步。'],
    coopLowTrust: ['现在才想合作？晚了点。', '我不吃这一套。', '你前面的动作已经暴露你了。'],
    defect: ['这才像个对手。', '终于有点意思了。', '你敢反击，我就更要看看你能扛多久。'],
    underPressure: ['你在反压我？很好。', '有胆量，但别虚张声势。', '你要是没底牌，就别装强硬。'],
    afterPlayerWin: ['上次你赢了，这次我不会给你同样机会。', '我记得你那套打法。', '这次我会先下重手。'],
    afterPlayerLose: ['上次你扛不住，这次也一样。', '你之前已经证明你会退。', '我知道你的压力点在哪里。'],
    win: ['不堪一击。', '我说过，强者拿结果。', '下一个。'],
    lose: ['你赢了，但别以为我服了。', '这次算你打穿了我的防线。', '我记住你了。'],
    draw: ['平局不算结束。', '你撑住了，但还没赢。', '下一局我会更狠。'],
  },

  cooperative: {
    greet: ['我希望我们能找到一个双方都能接受的方案。', '先别急着对抗，看看有没有共同利益。', '合作不是软弱，是更聪明的选择。'],
    coopHighTrust: ['这正是我希望看到的。', '我们之间的信任在增加。', '这样谈下去，双方都有机会赢。'],
    coopLowTrust: ['我愿意再给合作一次机会。', '虽然我还有顾虑，但这一步是好的。', '我希望你这次是真诚的。'],
    defect: ['你这样会伤害合作基础。', '我不想报复，但我必须保护自己。', '如果你持续这样，我会改变策略。'],
    underPressure: ['我们可以坚定，但没必要互相压迫。', '如果只是比谁更强硬，双方都会损失。', '我建议回到共同目标。'],
    afterPlayerWin: ['上次你赢了，我希望这次我们能双赢。', '我记得你很会争取利益，但也希望你考虑关系。', '你有实力，所以更应该做长期选择。'],
    afterPlayerLose: ['上次结果对你不利，这次我们可以重新建立合作。', '我不想利用你的弱点。', '我们可以把这局谈得更稳。'],
    win: ['我赢了，但我更希望我们都赢。', '结果不错，但关系也要保留。', '希望你没有觉得被压迫。'],
    lose: ['你赢了。如果这是公平结果，我接受。', '这次我让得多了一点，但关系还在。', '希望你记得我的善意。'],
    draw: ['平局也不错，至少没有破坏关系。', '双方都保留了空间。', '这是一个可以继续谈的结果。'],
  },

  manipulative: {
    greet: ['我们不用急，慢慢聊。', '你很聪明，我想看看你会怎么选。', '先放松，真正的关键通常不在表面。'],
    coopHighTrust: ['你愿意合作，这很好。', '我喜欢信任我的人。', '继续这样，我们会很顺利。'],
    coopLowTrust: ['你现在释放善意，是策略还是诚意？', '我先记下这一步。', '你的合作来得有点突然。'],
    defect: ['哦？你也会这样玩。', '看来你不是那么单纯。', '有趣，我得重新评估你。'],
    underPressure: ['你急了。', '真正有底牌的人通常不会这么用力。', '你越施压，我越想知道你怕什么。'],
    exposed: ['你看出来了？不错。', '既然你识破了，那我们换一种玩法。', '看来你不是普通人。'],
    afterPlayerWin: ['上次你赢了，但你暴露了习惯。', '我已经看过你的打法了。', '这次我不会让你那么顺。'],
    afterPlayerLose: ['上次你输在太早相信我。', '我猜你这次会变谨慎。', '你会不会矫枉过正？我很好奇。'],
    win: ['结果从一开始就差不多定了。', '你以为你在选择，其实我一直在引导。', '别难过，大多数人都会这样。'],
    lose: ['你打乱了我的节奏。', '这次你没有掉进来。', '我承认，你比我预期难对付。'],
    draw: ['平局也许是最安全的假象。', '我们都没有把底牌亮完。', '这局还没真正结束。'],
  },

  riskAverse: {
    greet: ['我们稳一点，不要冒太大风险。', '我希望每一步都有退路。', '先确认边界，再谈条件。'],
    coopHighTrust: ['这样比较安全，我可以接受。', '合作让我感觉风险下降了。', '这一步很稳。'],
    coopLowTrust: ['我还需要更多确定性。', '现在合作可以，但请不要突然变卦。', '我不喜欢不确定。'],
    defect: ['这太冒险了。', '你这样会让局面失控。', '我得收缩防线。'],
    underPressure: ['你逼得太紧了，我可能只能退。', '压力太大，我需要重新评估。', '我不想在这种状态下做决定。'],
    afterPlayerWin: ['上次你赢了，我会更谨慎。', '你让我意识到风险比我想的大。', '这次我会保守一点。'],
    afterPlayerLose: ['上次你失败了，可能是因为冒进。', '我建议你这次稳一些。', '不要再把局势推到不可控。'],
    win: ['安全地赢下来了。', '结果还不错，风险也可控。', '稳健是有价值的。'],
    lose: ['我担心的事情还是发生了。', '这次风险控制失败。', '我需要更保守。'],
    draw: ['平局可以接受。', '至少没有失控。', '这个结果比较稳。'],
  },

  trumpBoss: {
    greet: ['我只和赢家谈。', '你最好有底牌。', '我会开一个你不喜欢但必须面对的条件。'],
    coopHighTrust: ['你这么合作？那我当然要再要一点。', '你让步太快了。', '这就是我喜欢的对手，容易成交。'],
    coopLowTrust: ['你现在合作，是因为你没选择吧？', '我不相信善意，我只相信筹码。', '合作可以，但条件由我定。'],
    defect: ['你也会反击？很好。', '这才像谈判。', '别停，看看谁先退。'],
    underPressure: ['你有替代方案？拿出来。', '很多人一开始都说自己有底牌。', '如果你的 BATNA 不够硬，我会继续压。'],
    afterPlayerWin: ['上次你赢了，这次我会先锚死你。', '我记得你，但我不怕你。', '这次没有轻松局。'],
    afterPlayerLose: ['你上次已经软过一次。', '我知道你会退。', '你可以假装强硬，但我会测试到底。'],
    win: ['我说过，我要赢。', '这就是交易。', '你被锚住了。'],
    lose: ['你赢了这一次。不错。', '你确实有底牌。', '这次我低估了你。'],
    draw: ['平局在我看来不是赢。', '你撑住了，但还没打穿我。', '我们还会再见。'],
  },
};

export function pickContextualLine(opp, ctx = {}) {
  if (!opp) return '';
  const lib = OPP_LINES_V2[opp.id];
  if (!lib) return '';

  const mood = ctx.mood || {};
  const rep = ctx.reputation || {};
  const action = ctx.action || '';
  const outcome = ctx.outcome || '';

  let bucket = 'greet';
  if (outcome) {
    if (outcome === 'win') bucket = 'lose';
    else if (outcome === 'lose') bucket = 'win';
    else bucket = 'draw';
  } else if (rep.lastOutcome === 'win' && ctx.round === 0) {
    bucket = 'afterPlayerWin';
  } else if (rep.lastOutcome === 'lose' && ctx.round === 0) {
    bucket = 'afterPlayerLose';
  } else if (ctx.exposed && lib.exposed) {
    bucket = 'exposed';
  } else if (action === 'firm' || action === 'batna' || action === 'pressure') {
    bucket = 'underPressure';
  } else if (action === 'defect' || action === 'aggressive') {
    bucket = 'defect';
  } else if (action === 'coop' || action === 'cooperative') {
    bucket = (mood.trust || 0) >= 0.55 ? 'coopHighTrust' : 'coopLowTrust';
  }

  const arr = lib[bucket] || lib.greet || [];
  if (!arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getOpponentOpeningLine(opp) {
  if (!opp) return '';
  const rep = loadReputation(opp.id);
  const mood = Mood.get(opp.id);
  const memory = Memory.get(opp.id);
  return pickContextualLine(opp, { round: 0, mood, memory, reputation: rep });
}

export function buildOpponentFinalComment(opp, outcome) {
  if (!opp) return '';
  const rep = loadReputation(opp.id);
  const mood = Mood.get(opp.id);
  const memory = Memory.get(opp.id);
  return pickContextualLine(opp, { outcome, mood, memory, reputation: rep });
}
