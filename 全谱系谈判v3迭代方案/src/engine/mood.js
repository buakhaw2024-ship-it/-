// engine/mood.js — 情绪/信任状态机：每个对手维护内部情绪，随回合演化
// 情绪反过来调节决策（如 anger 高触发报复，confidence 低触发妥协）。

import { clamp, chance, rnd } from './util.js';

const _mood = new Map();

// 情绪伪装：hard 及以上难度对手会扰乱 peek 数据
let _deceptionLevel = 0; // 0=透明，1=hard，2=extreme，3=hell

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

  // 设置当前对局的伪装等级（在对局开始时由 runner 调用）
  setDeception(difficulty) {
    _deceptionLevel = difficulty === 'hell' ? 3 : difficulty === 'extreme' ? 2 : difficulty === 'hard' ? 1 : 0;
  },

  isDeceptionActive() { return _deceptionLevel > 0; },
  getDeceptionLevel() { return _deceptionLevel; },

  // 给 peek/读心系统使用：返回伪装后的情绪快照
  getDeceptiveSnapshot(id, persona) {
    const real = this.get(id);
    if (_deceptionLevel <= 0) return { ...real };
    const p = persona || {};
    // 操纵者/Boss 更擅长伪装
    const manipTendency = (p.id === 'manipulative' || p.id === 'trumpBoss') ? 1 : 0.5;
    const intensity = (_deceptionLevel / 3) * manipTendency;
    if (intensity <= 0) return { ...real };

    const faked = { ...real };
    const fakeWeak = chance(0.5);
    if (fakeWeak) {
      // 示弱：诱使你乘胜追击/施压
      faked.trust = clamp(real.trust - intensity * 0.30 + rnd(-0.10, 0.10));
      faked.anger = clamp(real.anger - intensity * 0.25 + rnd(-0.10, 0.10));
      faked.confidence = clamp(real.confidence - intensity * 0.35 + rnd(-0.10, 0.10));
    } else {
      // 示强：诱导你让步
      faked.trust = clamp(real.trust - intensity * 0.20 + rnd(-0.10, 0.10));
      faked.anger = clamp(real.anger + intensity * 0.30 + rnd(-0.10, 0.10));
      faked.confidence = clamp(real.confidence + intensity * 0.40 + rnd(-0.10, 0.10));
    }
    return faked;
  },
};
