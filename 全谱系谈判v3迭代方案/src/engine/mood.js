// engine/mood.js — 情绪/信任状态机：每个对手维护内部情绪，随回合演化
// 情绪反过来调节决策（如 anger 高触发报复，confidence 低触发妥协）。

import { clamp } from './util.js';

const _mood = new Map();

function fresh(persona) {
  return {
    trust: 0.5,
    anger: 0,
    patience: 1,
    confidence: persona ? clamp(0.35 + persona.assert * 0.35) : 0.5,
  };
}

export const Mood = {
  reset(id, persona) { _mood.set(id, fresh(persona)); },

  get(id) {
    if (!_mood.has(id)) _mood.set(id, fresh());
    return _mood.get(id);
  },

  // 根据玩家行为演化情绪
  react(id, sig = {}, persona = {}) {
    const d = this.get(id);
    if (sig.coop === true) {
      d.trust = clamp(d.trust + 0.10);
      d.anger = clamp(d.anger - 0.05);
    }
    if (sig.coop === false) {
      d.trust = clamp(d.trust - 0.15);
      const gain = (persona.id === 'aggressive' || persona.id === 'emotional') ? 0.28 : 0.18;
      d.anger = clamp(d.anger + gain);
    }
    if (sig.aggression != null && sig.aggression > 0.6) {
      d.patience = clamp(d.patience - 0.20);
      d.confidence = clamp(d.confidence - (persona.id === 'aggressive' ? 0.15 : 0.08));
    }
    if (sig.firm) {
      d.confidence = clamp(d.confidence - (persona.id === 'aggressive' ? 0.12 : 0.05));
    }
    d.patience = clamp(d.patience - 0.05); // 回合推进，耐心自然损耗
    return d;
  },
};
