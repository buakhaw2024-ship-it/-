// data/opponents.js — 6 对手定义 + 行为信号 + 应对技巧（从 v2.0 平移）
// 纯数据，可被任何模块 import。Phase 3 的 engine 会读取这里的性格参数。

export const OPPONENTS = [
  { id:'rational',     name:'陈逻辑', type:'理性分析型', desc:'数据驱动，精确计算每步得失',   weakness:'对情感诉求反应迟钝',     risk:0.3, coop:0.5, fair:0.5, assert:0.6 },
  { id:'emotional',    name:'林敏感', type:'情感驱动型', desc:'重视关系，情绪波动影响决策',   weakness:'容易被激将或情感操控',   risk:0.5, coop:0.7, fair:0.8, assert:0.4 },
  { id:'aggressive',   name:'钢铁王', type:'强硬鹰派型', desc:'强硬立场，极力压缩对方空间',   weakness:'合理反压时容易妥协',     risk:0.7, coop:0.2, fair:0.3, assert:0.9 },
  { id:'cooperative',  name:'和谐李', type:'合作共赢型', desc:'寻求双赢，注重长期关系维护',   weakness:'过于善意容易被利用',     risk:0.4, coop:0.9, fair:0.8, assert:0.5 },
  { id:'manipulative', name:'影子张', type:'操纵控制型', desc:'善用心理战术，隐藏真实意图',   weakness:'被识破后失去优势',       risk:0.6, coop:0.3, fair:0.2, assert:0.8 },
  { id:'riskAverse',   name:'稳健吴', type:'风险规避型', desc:'保守稳健，避免不确定结果',     weakness:'在压力下倾向过度让步',   risk:0.2, coop:0.6, fair:0.6, assert:0.4 },
];

// 隐藏 Boss：极限交易型 / 高压锚定型。仅在「宗师级 + 终局挑战难度」下解锁。
// 抽象其公开化、交易化、高压化、锚定化、不可预测化的谈判风格——非政治评论。
export const TRUMP_BOSS = {
  id:'trumpBoss', name:'极限交易者', type:'极限交易型 / 高压锚定型',
  desc:'极端开价、公开施压、几乎不让步，把每一步都包装成胜负叙事',
  weakness:'对方亮出可信BATNA、坚守客观标准并拒绝胜负叙事时，其锚定开始失效',
  risk:0.8, coop:0.15, fair:0.15, assert:0.98, boss:true,
};

export const PERSONALITY_TELLS = {
  rational:     ['总是要求数据支持','反复确认细节','表情克制中性'],
  emotional:    ['声音起伏明显','频繁提及"感受"','肢体语言丰富'],
  aggressive:   ['打断对方发言','设置最后期限','明确表达不满'],
  cooperative:  ['主动提出让步','寻找共同利益','保持开放态度'],
  manipulative: ['突然改变话题','制造紧迫感','模糊关键条款'],
  riskAverse:   ['多次确认安全性','偏好保守方案','回避极端选项'],
  trumpBoss:    ['开局抛出极端条件','频繁使用胜负二元叙事','制造公开与时间压力','突然改变议题或报价'],
};

const OPPONENT_TIPS = {
  rational:     ['使用数据和逻辑支持你的立场','避免情绪化表达，保持客观','提出具体量化方案，比感性诉求更有效','利用其信息盲点设计信息不对称'],
  emotional:    ['建立情感连接，表达关切和理解','避免纯粹逻辑压制，先处理情绪','用关系和信任作为谈判筹码','注意情绪波动，寻找情绪低谷时推进协议'],
  aggressive:   ['不要被强硬姿态吓倒，保持冷静','用你的BATNA建立真实底气','要求其提供主张的依据','合理反压：明确表示也有替代选项'],
  cooperative:  ['诚实合作，建立长期信任','提出双赢方案，强调共同利益','避免利用其善意过度索取','记录协议细节，防止善意被误解'],
  manipulative: ['保持高度警觉，识别话术变化','要求书面确认所有关键条款','直接说出你识别到的操控手法','减慢节奏，不受人工紧迫感驱使'],
  riskAverse:   ['用数据和案例证明方案的安全性','提供保障条款和退出选项','强调不行动的风险大于行动','循序渐进，不要一次推进太多变化'],
  trumpBoss:    ['不要急于回应极端锚定，先质疑其依据和可执行性','明确你的BATNA，让对方知道你不是被迫成交','把议题拆小，避免被带入宏大胜负叙事','所有让步必须绑定对方的实质承诺','不要被公开压力和时间压力牵引，主动放慢节奏','用客观标准、书面条件和退出选项压缩其操控空间'],
};

export function getOpponent(id) {
  if (id === TRUMP_BOSS.id) return TRUMP_BOSS;
  return OPPONENTS.find((o) => o.id === id);
}

export function randomOpponent() {
  return OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
}

export function getOpponentTips(id) {
  return OPPONENT_TIPS[id] || ['保持冷静，灵活应对','关注对方真实利益','适时使用沉默策略'];
}
