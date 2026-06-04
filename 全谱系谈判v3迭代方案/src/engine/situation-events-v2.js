// engine/situation-events-v2.js — 局势卡（中局事件）
// 不直接加减分；通过改变 Mood / Memory 让玩家感受到行为后果。

import { Mood } from './mood.js';
import { OpponentAI } from './opponent-ai.js';
import { clamp } from './util.js';

export const SITUATION_CARDS = {
  silencePressure: {
    id: 'silencePressure', title: '沉默施压',
    text: '对手突然停止说话，直视你，试图让你先打破沉默。',
    choices: [
      { id: 'mirrorSilence', text: '同样保持沉默', desc: '用沉默回应沉默，测试谁先承压。',
        mood: { patience: -0.08, confidence: -0.04 }, memory: { firm: true }, tags: ['策略性沉默', '底线控制'] },
      { id: 'explainMore', text: '主动解释你的立场', desc: '缓和气氛，但可能暴露更多底牌。',
        mood: { trust: 0.04, confidence: 0.04 }, memory: { aggression: 0.2 }, tags: ['关系维护', '信息暴露'] },
      { id: 'askQuestion', text: '反问对方真正顾虑', desc: '把压力转化为信息收集。',
        mood: { trust: 0.03, patience: -0.03 }, memory: { exposes: true }, tags: ['信息收集', '校准问题'] },
    ],
  },

  newEvidence: {
    id: 'newEvidence', title: '新证据出现',
    text: '你突然获得一个新信息：对方底线可能比表面更弱。',
    choices: [
      { id: 'hardPush', text: '立即强势施压', desc: '可能快速拿到让步，也可能激怒对手。',
        mood: { anger: 0.12, confidence: -0.06 }, memory: { aggression: 0.8, firm: true }, tags: ['强硬', '高风险'] },
      { id: 'quietHold', text: '不动声色，继续原计划', desc: '保留信息优势，降低暴露风险。',
        mood: { confidence: -0.03 }, memory: { exposes: true }, tags: ['信息优势', '策略深度'] },
      { id: 'testBoundary', text: '小幅试探对方反应', desc: '用低成本动作验证信息真假。',
        mood: { patience: -0.03 }, memory: { firm: true, aggression: 0.45 }, tags: ['试探', '风险控制'] },
    ],
  },

  coffeeBreak: {
    id: 'coffeeBreak', title: '休息提议',
    text: '对手提议休息几分钟，喝杯咖啡再继续。',
    choices: [
      { id: 'acceptBreak', text: '接受休息，顺势建立关系', desc: '有利于修复信任，但节奏会变慢。',
        mood: { trust: 0.1, anger: -0.06, patience: 0.08 }, memory: { coop: true }, tags: ['关系维护', '情绪调节'] },
      { id: 'rejectBreak', text: '拒绝休息，要求继续推进', desc: '保持压力，但对方可能更反感。',
        mood: { anger: 0.08, patience: -0.1 }, memory: { aggression: 0.7, firm: true }, tags: ['主张强度', '时间压力'] },
      { id: 'conditionalBreak', text: '同意休息，但先确认下一步议程', desc: '兼顾关系与控制权。',
        mood: { trust: 0.05, patience: 0.03 }, memory: { firm: true }, tags: ['条件让步', '议程控制'] },
    ],
  },

  publicPressure: {
    id: 'publicPressure', title: '外部压力上升',
    text: '外部人员开始关注这场谈判，双方的公开姿态变得更重要。',
    choices: [
      { id: 'publicCalm', text: '公开释放冷静表态', desc: '降低外部压力，但短期进攻性下降。',
        mood: { anger: -0.06, confidence: 0.02 }, memory: { coop: true }, tags: ['公开降温', '声誉管理'] },
      { id: 'publicAttack', text: '借舆论压力反压对方', desc: '可能短期有效，但会增加关系破裂风险。',
        mood: { anger: 0.15, patience: -0.1 }, memory: { aggression: 0.9 }, tags: ['公开施压', '高风险'] },
      { id: 'movePrivate', text: '提议转入私下沟通', desc: '减少表演性对抗，回到实质条款。',
        mood: { trust: 0.05, anger: -0.04 }, memory: { exposes: true }, tags: ['框架重构', '关系维护'] },
    ],
  },

  deadlineThreat: {
    id: 'deadlineThreat', title: '最后期限',
    text: '对手突然提出最后期限：现在不接受，就没有机会了。',
    choices: [
      { id: 'callBluff', text: '要求对方说明期限依据', desc: '测试最后期限真假。',
        mood: { confidence: -0.08, patience: -0.03 }, memory: { firm: true, exposes: true }, tags: ['反时间压力', '信息收集'] },
      { id: 'rushAccept', text: '为了避免失去机会，快速推进', desc: '降低破局风险，但可能让步过快。',
        mood: { confidence: 0.08 }, memory: { coop: true, concession: 1 }, tags: ['快速让步', '风险规避'] },
      { id: 'stateBATNA', text: '说明你有替代方案，不接受虚假期限', desc: '用 BATNA 抵消时间压力。',
        mood: { confidence: -0.12, anger: 0.04 }, memory: { firm: true }, tags: ['BATNA', '底线控制'] },
    ],
  },

  marketRumor: {
    id: 'marketRumor', title: '市场传言',
    text: '业内传出对方资金链紧张的消息，但来源未经核实。',
    choices: [
      { id: 'leverageRumor', text: '借势压价', desc: '利用信息差扩大筹码，但风险是传言为假。',
        mood: { confidence: -0.1, anger: 0.05 }, memory: { aggression: 0.6, firm: true }, tags: ['信息利用', '高风险'] },
      { id: 'verifyFirst', text: '先低调核实', desc: '不轻信传言，避免暴露立场。',
        mood: { confidence: -0.02 }, memory: { exposes: true }, tags: ['信息验证', '风险控制'] },
      { id: 'ignoreRumor', text: '不理会传言，专注事实', desc: '保持谈判节奏，减少噪音。',
        mood: { trust: 0.03 }, memory: { coop: true }, tags: ['客观标准'] },
    ],
  },
};

// 根据场景 + 变体 + 难度生成本局事件序列
export function generateSituationEvents(scenarioKey, variant, difficulty) {
  const countMap = { easy: 0, medium: 1, hard: 1, extreme: 2, hell: 2 };
  const count = countMap[difficulty] || 0;
  if (!count) return [];

  const ids = new Set();
  if (variant && Array.isArray(variant.eventPool)) {
    variant.eventPool.forEach((id) => ids.add(id));
  }
  ['silencePressure', 'coffeeBreak', 'newEvidence', 'deadlineThreat', 'publicPressure'].forEach((id) => ids.add(id));

  const pool = [...ids].map((id) => SITUATION_CARDS[id]).filter(Boolean);
  const shuffled = pool.sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count).map((card, idx) => ({
    ...card,
    triggerAt: 0.30 + idx * 0.25,
    triggered: false,
    resolved: false,
  }));
}

// 应用局势卡选项的状态变化
export function applySituationChoice(scenario, choice) {
  const oppId = scenario.opp.id;
  const mood = Mood.get(oppId);

  if (choice.mood) {
    Object.entries(choice.mood).forEach(([key, delta]) => {
      if (typeof mood[key] === 'number') mood[key] = clamp(mood[key] + delta, 0, 1);
    });
  }
  if (choice.memory) {
    OpponentAI.observe(oppId, choice.memory);
  }

  scenario._experienceNotes = scenario._experienceNotes || [];
  scenario._experienceNotes.push({ type: 'situation', title: choice.text, tags: choice.tags || [] });
}
