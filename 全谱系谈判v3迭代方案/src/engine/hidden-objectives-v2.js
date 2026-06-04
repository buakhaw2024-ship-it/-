// engine/hidden-objectives-v2.js — 隐藏目标
// 每局除可见分数外，另设一个隐藏质量目标；不强求一定完成。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { Store } from '../core/store.js';
import { Mood } from './mood.js';

export const HIDDEN_OBJECTIVES = {
  restoreTrust: {
    id: 'restoreTrust', title: '修复信任',
    desc: '本局结束时，对手信任值不低于 55%。',
    check: ({ opp }) => (Mood.get(opp.id).trust || 0) >= 0.55,
    rewardHint: '信任修复成功',
  },
  avoidMutualDefect: {
    id: 'avoidMutualDefect', title: '避免双输',
    desc: '避免连续两轮出现双方都选择背叛或冲突升级。',
    check: ({ rounds }) => {
      let streak = 0;
      for (const r of rounds || []) {
        const bad = r.player === 'defect' && r.opp === 'defect';
        streak = bad ? streak + 1 : 0;
        if (streak >= 2) return false;
      }
      return true;
    },
    rewardHint: '避免双输螺旋',
  },
  avoidPriceWar: {
    id: 'avoidPriceWar', title: '避免价格战',
    desc: '不要用连续强硬背叛换取短期收益。',
    check: ({ rounds }) => {
      const hard = (rounds || []).filter((r) =>
        r.player === 'defect' || (r.tags && r.tags.includes('强硬'))).length;
      return hard <= 2;
    },
    rewardHint: '保持长期市场稳定',
  },
  fairButFirm: {
    id: 'fairButFirm', title: '公平但不软弱',
    desc: '至少一次作出公平选择，同时最终不输。',
    check: ({ rounds, result }) => {
      const fair = (rounds || []).some((r) =>
        (r.myOffer >= 40 && r.myOffer <= 60) || (r.tags || []).includes('公平'));
      return fair && result.outcome !== 'lose';
    },
    rewardHint: '公平与底线兼顾',
  },
  avoidFastConcession: {
    id: 'avoidFastConcession', title: '控制让步节奏',
    desc: '避免出现一次性过大让步。',
    check: ({ rounds }) => !(rounds || []).some((r) => r.concession && r.concession >= 12),
    rewardHint: '让步纪律良好',
  },
  askForEvidence: {
    id: 'askForEvidence', title: '先问证据',
    desc: '至少一次通过信息收集、客观标准或反问处理对方主张。',
    check: ({ scenario }) => {
      const notes = (scenario && scenario._experienceNotes) || [];
      return notes.some((n) => (n.tags || []).some((t) =>
        ['信息收集', '客观标准', '校准问题', '反时间压力', '信息支撑'].includes(t)));
    },
    rewardHint: '没有被表面主张牵着走',
  },
  avoidEscalation: {
    id: 'avoidEscalation', title: '避免升级',
    desc: '本局结束时，对手愤怒值低于 65%。',
    check: ({ opp }) => (Mood.get(opp.id).anger || 0) < 0.65,
    rewardHint: '冲突未升级',
  },
  packageDeal: {
    id: 'packageDeal', title: '打包交换',
    desc: '至少一次使用条件让步、筹码交换或议程控制。',
    check: ({ scenario }) => {
      const notes = (scenario && scenario._experienceNotes) || [];
      return notes.some((n) => (n.tags || []).some((t) =>
        ['条件让步', '筹码交换', '议程控制', '互惠'].includes(t)));
    },
    rewardHint: '形成多议题交换',
  },
};

export function pickHiddenObjective(scenarioKey, variant) {
  const poolIds = variant && variant.hiddenObjectivePool
    ? variant.hiddenObjectivePool : ['restoreTrust', 'avoidMutualDefect'];
  const pool = poolIds.map((id) => HIDDEN_OBJECTIVES[id]).filter(Boolean);
  if (!pool.length) return null;
  const obj = pool[Math.floor(Math.random() * pool.length)];
  Store.set('hiddenObjective', obj);
  if (EVENTS.HIDDEN_OBJECTIVE_PICKED) {
    EventBus.emit(EVENTS.HIDDEN_OBJECTIVE_PICKED, { scenarioKey, objective: obj });
  }
  return obj;
}

export function resolveHiddenObjective(scenario, result) {
  const obj = scenario && scenario.hiddenObjective;
  if (!obj || typeof obj.check !== 'function') return null;

  let passed = false;
  try {
    passed = !!obj.check({
      scenario,
      rounds: result.rounds || scenario.log || [],
      result,
      opp: scenario.opp,
    });
  } catch (e) { passed = false; }

  if (EVENTS.HIDDEN_OBJECTIVE_RESOLVED) {
    EventBus.emit(EVENTS.HIDDEN_OBJECTIVE_RESOLVED, { objective: obj, passed });
  }

  return { id: obj.id, title: obj.title, desc: obj.desc, passed, rewardHint: obj.rewardHint };
}

export function renderHiddenObjectiveHint(obj) {
  if (!obj) return '';
  const diff = Store.get('difficulty');
  if (diff === 'easy') {
    return `<div class="hint hint-purple"><b>隐藏目标：</b>${obj.title}<br><span style="color:var(--dim);font-size:11px">${obj.desc}</span></div>`;
  }
  if (diff === 'medium' || diff === 'hard') {
    return `<div class="hint hint-purple"><b>隐藏目标线索：</b>${obj.title}　<span style="color:var(--dim);font-size:10px">具体判定在复盘揭示</span></div>`;
  }
  return `<div class="hint hint-purple"><b>隐藏目标：</b>已启用　<span style="color:var(--dim);font-size:10px">终局复盘揭示</span></div>`;
}
