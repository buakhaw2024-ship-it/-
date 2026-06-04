// engine/counter-questions-v2.js — 对手反问机制
// 每局有概率触发；触发时显示问题与 3 个回答选项，回答改变对手 Mood/Memory。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { Store } from '../core/store.js';

export const COUNTER_QUESTIONS = {
  evidence: {
    id: 'evidence', text: '你这个判断的依据是什么？',
    triggerTags: ['强硬', '高风险', '锚定效应'],
    choices: [
      { id: 'giveData', text: '给出数据和客观标准', desc: '用事实支撑立场。',
        mood: { confidence: -0.08, trust: 0.04 }, memory: { firm: true, exposes: true }, tags: ['客观标准', '信息支撑'] },
      { id: 'doubleDown', text: '继续强硬，不解释', desc: '保持压迫，但可能激怒对手。',
        mood: { anger: 0.1, patience: -0.08 }, memory: { aggression: 0.9 }, tags: ['强硬', '高风险'] },
      { id: 'soften', text: '缓和说法，重新表述', desc: '降低冲突，但可能削弱锚定。',
        mood: { trust: 0.06, anger: -0.05 }, memory: { coop: true }, tags: ['情绪调节', '关系维护'] },
    ],
  },

  batnaTest: {
    id: 'batnaTest', text: '如果我不同意，你真正的替代方案是什么？',
    triggerTags: ['BATNA', '底线控制', '反压'],
    choices: [
      { id: 'clearBATNA', text: '清晰说明替代方案，但不泄露全部底牌', desc: '建立可信底线。',
        mood: { confidence: -0.12 }, memory: { firm: true }, tags: ['BATNA', '底线控制'] },
      { id: 'vagueBATNA', text: '模糊暗示你还有选择', desc: '保留空间，但可信度较弱。',
        mood: { confidence: -0.04 }, memory: { firm: true }, tags: ['模糊反压'] },
      { id: 'avoidAnswer', text: '回避问题，转移话题', desc: '可能被对手判断为底气不足。',
        mood: { confidence: 0.08 }, memory: {}, tags: ['回避', '底线暴露'] },
    ],
  },

  trustChallenge: {
    id: 'trustChallenge', text: '你现在说合作，我凭什么相信你？',
    triggerTags: ['合作', '关系维护'],
    choices: [
      { id: 'specificCommitment', text: '提出具体可验证承诺', desc: '用行动替代口头善意。',
        mood: { trust: 0.12, anger: -0.04 }, memory: { coop: true }, tags: ['承诺机制', '信任修复'] },
      { id: 'empathy', text: '先承认对方的不信任是合理的', desc: '降低防御。',
        mood: { trust: 0.08, anger: -0.08 }, memory: { coop: true }, tags: ['战术性同理心', '情绪调节'] },
      { id: 'pressureBack', text: '反问对方是否也愿意承担承诺', desc: '把信任问题变成双向义务。',
        mood: { confidence: -0.05, patience: -0.03 }, memory: { firm: true }, tags: ['条件让步', '互惠'] },
    ],
  },
};

const PROB_BY_DIFF = { easy: 0.05, medium: 0.18, hard: 0.28, extreme: 0.38, hell: 0.48 };

export function shouldTriggerCounterQuestion(scenario, lastTags = []) {
  if (scenario._questionTriggered || scenario._pendingQuestion) return null;

  const difficulty = Store.get('difficulty') || 'medium';
  const probBase = PROB_BY_DIFF[difficulty] || 0.18;
  const bossBonus = scenario.opp && scenario.opp.boss ? 0.18 : 0;
  const p = probBase + bossBonus;

  if (Math.random() > p) return null;

  const candidates = Object.values(COUNTER_QUESTIONS).filter((q) =>
    q.triggerTags.some((t) => lastTags.includes(t)));
  if (!candidates.length) return null;

  const q = candidates[Math.floor(Math.random() * candidates.length)];
  scenario._pendingQuestion = q;
  scenario._questionTriggered = true;
  if (EVENTS.OPPONENT_QUESTION_TRIGGERED) {
    EventBus.emit(EVENTS.OPPONENT_QUESTION_TRIGGERED, { scenarioKey: scenario.scenarioKey, question: q });
  }
  return q;
}

// 工具：根据玩家动作粗略推断行为标签
export function inferTagsFromAction(type, value) {
  const tags = [];
  if (value === 'defect') tags.push('强硬', '高风险');
  if (value === 'coop') tags.push('合作', '关系维护');
  if (type === 'invest' && Number(value) >= 7) tags.push('合作', '高风险');
  if (type === 'invest' && Number(value) <= 2) tags.push('强硬', '反压');
  if (type === 'offer' && Number(value) < 50) tags.push('强硬', '锚定效应');
  if (type === 'propose' && Number(value) >= 65) tags.push('强硬', '锚定效应');
  if (type === 'resist-cram') tags.push('BATNA', '底线控制', '反压');
  if (type === 'accept-cram') tags.push('合作', '关系维护');
  return tags;
}
