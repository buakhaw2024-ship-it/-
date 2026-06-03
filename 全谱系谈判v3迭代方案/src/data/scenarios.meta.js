// data/scenarios.meta.js — 7 场景元数据（名称/难度/领域/描述）
// 不含场景逻辑类；类的绑定在 scenarios/registry.js。

export const SCENARIO_META = {
  prisoners:   { name:'囚徒困境',     diff:'easy', domain:'经典博弈', desc:'经典非零和博弈，合作还是背叛？' },
  ultimatum:   { name:'最后通牒博弈', diff:'easy', domain:'分配博弈', desc:'分配者提议，接受者决定接受或拒绝' },
  trust:       { name:'信任博弈',     diff:'med',  domain:'信任博弈', desc:'信任与回馈的两阶段测试' },
  bargaining:  { name:'商业谈判博弈', diff:'med',  domain:'谈判博弈', desc:'多轮价格谈判，争取最佳成交' },
  crisis:      { name:'危机谈判',     diff:'hard', domain:'危机处置', desc:'四阶段危机处置，需要高超的沟通策略' },
  publicgoods: { name:'公共品博弈',   diff:'med',  domain:'合作博弈', desc:'公共项目贡献决策，团队与个人利益的博弈' },
  coalition:   { name:'联盟谈判',     diff:'hard', domain:'多方博弈', desc:'多方利益协调，建立稳定联盟' },
};

export const DIFF_LABEL = { easy:'入门', med:'进阶', hard:'高阶' };
export const DIFF_CLASS = { easy:'diff-easy', med:'diff-med', hard:'diff-hard' };
