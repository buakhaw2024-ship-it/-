// data/ranks.js — 军衔阈值 + 心理类型定义（从 v2.0 平移）

export function getRank(total, wins) {
  const wr = total > 0 ? wins / total : 0;
  if (total === 0) return '新兵';
  if (total < 5) return '学员';
  if (total < 10) return wr > 0.6 ? '谈判官' : '学员进阶';
  if (total < 20) return wr > 0.7 ? '策略师' : '谈判官';
  if (total < 30) return wr > 0.75 ? '博弈大师' : '策略师';
  return wr > 0.8 ? '宗师级' : '博弈大师';
}

// Trump Boss 解锁条件：宗师级 + 终局挑战 / 地狱级难度
export function isGrandMaster(player) {
  if (!player) return false;
  return getRank(player.total, player.wins) === '宗师级';
}

export function canUnlockBoss(player, difficulty) {
  return isGrandMaster(player) && (difficulty === 'extreme' || difficulty === 'hell');
}

// 8 维心理向量的展示定义
export const PSYCH_DIMENSIONS = [
  { key:'cooperation_rate', label:'合作倾向', color:'bar-green' },
  { key:'risk',             label:'风险承受', color:'bar-yellow' },
  { key:'fairness',         label:'公平敏感', color:'bar-cyan' },
  { key:'depth',            label:'策略深度', color:'bar-purple' },
  { key:'emotion',          label:'情绪调节', color:'bar-cyan' },
  { key:'assert',           label:'主张强度', color:'bar-red' },
  { key:'adapt',            label:'适应灵活', color:'bar-green' },
  { key:'trust',            label:'信任倾向', color:'bar-yellow' },
];
