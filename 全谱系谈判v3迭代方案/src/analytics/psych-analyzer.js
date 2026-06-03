// analytics/psych-analyzer.js — 8 维心理画像引擎
// Phase 2：沿用 v2.0 算法（基于胜负 outcome 的线性累加）先跑通。
// Phase 4：将重构为基于真实决策序列的计算（见 03-实施路线图.md F-06）。

const _profile = {
  cooperation_rate: 0, risk: 0, fairness: 0, depth: 0,
  emotion: 0, assert: 0, adapt: 0, trust: 0,
};

export const PsychAnalyzer = {
  getProfile() {
    return { ..._profile };
  },

  // 每局结束根据结果与对手类型演化画像（v2.0 updateAnalyzer 逻辑）
  update(outcome, opp) {
    const p = _profile;
    const delta = 0.08;
    if (outcome === 'coop' || outcome === 'win') {
      p.cooperation_rate = Math.min(1, (p.cooperation_rate || 0.5) + delta);
      p.depth = Math.min(1, (p.depth || 0.5) + delta * 0.5);
    } else if (outcome === 'lose') {
      p.risk = Math.max(0, (p.risk || 0.5) - delta);
    }
    p.adapt = Math.min(1, (p.adapt || 0.5) + delta * 0.3);
    if (opp) {
      if (opp.id === 'aggressive') p.assert = Math.min(1, (p.assert || 0.5) + delta * 0.5);
      if (opp.id === 'emotional') p.emotion = Math.min(1, (p.emotion || 0.5) + delta * 0.5);
    }
  },

  // 根据画像推断心理类型（v2.0 getProfileType 逻辑）
  getProfileType() {
    const p = _profile;
    const profiles = [
      { name:'战略家', cond:() => p.depth > 0.6 && p.assert > 0.5, desc:'冷静理智，善于全局规划和长远布局',
        advice:['适当增加情感投入以建立更强的谈判关系','尝试更多合作性策略','注意不要过于机械化'] },
      { name:'调解者', cond:() => p.cooperation_rate > 0.7 && p.fairness > 0.6, desc:'天生的关系维护者，擅长化解冲突',
        advice:['学会在合适时机坚守底线','避免为维持和谐而过度妥协','增强BATNA意识'] },
      { name:'竞争者', cond:() => p.assert > 0.7 && p.risk > 0.5, desc:'目标明确，勇于争取最大利益',
        advice:['关注对方利益，寻找双赢机会','长期关系比单次收益更有价值','练习主动倾听'] },
      { name:'外交家', cond:() => p.adapt > 0.6 && p.emotion > 0.6, desc:'灵活适应，善于在不同情境切换策略',
        advice:['在核心利益上保持一致性','增强策略深度分析能力','建立清晰的底线意识'] },
      { name:'分析师', cond:() => p.depth > 0.5 && p.risk < 0.4, desc:'谨慎周密，偏好有据可查的决策路径',
        advice:['适当增加行动果断性','在信息不完整时学会做出判断','尝试更多创新性解决方案'] },
      { name:'实用主义者', cond:() => true, desc:'务实灵活，根据情境选择最优策略',
        advice:['深化某一领域的专项谈判技能','建立系统性的谈判框架','记录每次谈判的经验教训'] },
    ];
    return profiles.find((pp) => pp.cond()) || profiles[profiles.length - 1];
  },

  // 是否已有足够数据出报告（至少 2 局）—— 由调用方传入局数
  hasEnoughData(totalSessions) {
    return totalSessions >= 2;
  },
};
