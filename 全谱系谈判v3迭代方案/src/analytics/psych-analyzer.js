// analytics/psych-analyzer.js — 8 维心理画像引擎（Phase 4 重构）
// 不再用固定 +0.08 线性累加，而是从真实决策序列累计行为统计，按比例计算 8 维向量。
// 统计累加在 player.behaviorStats（随存档持久化）。

const HARD_OPPONENTS = ['aggressive', 'manipulative'];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const safe = (a, b, d = 0.5) => (b > 0 ? clamp01(a / b) : d);

// 从一局的回合日志提取行为信号，累加进 player.behaviorStats
export function accumulate(player, kind, rounds, result, opp) {
  const s = player.behaviorStats;
  s.games += 1;
  if (opp && !s.opponentsSeen.includes(opp.id)) s.opponentsSeen.push(opp.id);
  if (result.outcome === 'win') s.wins += 1;
  if (opp && HARD_OPPONENTS.includes(opp.id)) {
    s.hardGames += 1;
    if (result.outcome === 'win') s.hardWins += 1;
  }
  if (!rounds || !rounds.length) return player;

  if (kind === 'prisoners') {
    rounds.forEach((r) => {
      s.totalMoves += 1; s.impulseTotal += 1;
      if (r.player === 'coop') { s.coopMoves += 1; s.impulseAvoid += 1; }
      else { s.riskyMoves += 1; s.assertiveMoves += 1; }
    });
  } else if (kind === 'trust') {
    rounds.forEach((r) => {
      s.totalMoves += 1; s.impulseTotal += 1;
      s.trustInvested += r.invested; s.trustMax += 10;
      if (r.invested >= 5) s.coopMoves += 1;
      if (r.invested >= 10) s.riskyMoves += 1;
      if (r.invested === 0) s.assertiveMoves += 1;
      if (r.myNet >= 0) s.impulseAvoid += 1;
    });
  } else if (kind === 'publicgoods') {
    rounds.forEach((r) => {
      s.totalMoves += 1; s.impulseTotal += 1;
      s.trustInvested += r.my; s.trustMax += 10;
      if (r.my >= 5) { s.coopMoves += 1; s.impulseAvoid += 1; }
      if (r.my <= 1) s.assertiveMoves += 1;
      if (r.my === 0) s.riskyMoves += 1;
    });
  } else if (kind === 'bargaining') {
    rounds.forEach((r, i) => {
      s.totalMoves += 1; s.impulseTotal += 1;
      const prev = i > 0 ? rounds[i - 1].my : r.my;
      if (r.my - prev <= 3) s.impulseAvoid += 1;
      if (r.my < 42) s.assertiveMoves += 1;
    });
  } else if (kind === 'ultimatum') {
    rounds.forEach((r) => {
      s.totalMoves += 1; s.fairOpps += 1;
      if (r.accepted && r.myOffer >= 40 && r.myOffer <= 62) s.fairActs += 1;
      else if (r.accepted) s.fairActs += 0.5;
      if (r.myOffer > 62) s.assertiveMoves += 1;
    });
  } else if (kind === 'crisis' || kind === 'coalition') {
    rounds.forEach((r) => {
      s.totalMoves += 1; s.impulseTotal += 1;
      if (r.ps > 0) s.impulseAvoid += 1;
    });
  }
  return player;
}

// 由行为统计计算 8 维心理向量
export function computeProfile(player) {
  const s = (player && player.behaviorStats) || {};
  const winRate = safe(s.wins, s.games);
  const hardWinRate = safe(s.hardWins, s.hardGames, 0.4);
  return {
    cooperation_rate: safe(s.coopMoves, s.totalMoves),
    risk: safe(s.riskyMoves, s.totalMoves),
    fairness: safe(s.fairActs, s.fairOpps),
    depth: clamp01(0.3 + 0.3 * winRate + 0.4 * hardWinRate),
    emotion: safe(s.impulseAvoid, s.impulseTotal),
    assert: safe(s.assertiveMoves, s.totalMoves),
    adapt: clamp01(0.6 * Math.min(1, (s.opponentsSeen ? s.opponentsSeen.length : 0) / 6) + 0.4 * Math.min(1, (s.games || 0) / 8)),
    trust: safe(s.trustInvested, s.trustMax),
  };
}

export function getProfileType(p) {
  const profiles = [
    { name:'战略家', cond:() => p.depth > 0.6 && p.assert > 0.5, desc:'冷静理智，善于全局规划和长远布局',
      advice:['适当增加情感投入以建立更强的谈判关系','尝试更多合作性策略','注意不要过于机械化'] },
    { name:'调解者', cond:() => p.cooperation_rate > 0.7 && p.fairness > 0.6, desc:'天生的关系维护者，擅长化解冲突',
      advice:['学会在合适时机坚守底线','避免为维持和谐而过度妥协','增强BATNA意识'] },
    { name:'竞争者', cond:() => p.assert > 0.6 && p.risk > 0.5, desc:'目标明确，勇于争取最大利益',
      advice:['关注对方利益，寻找双赢机会','长期关系比单次收益更有价值','练习主动倾听'] },
    { name:'外交家', cond:() => p.adapt > 0.6 && p.emotion > 0.6, desc:'灵活适应，善于在不同情境切换策略',
      advice:['在核心利益上保持一致性','增强策略深度分析能力','建立清晰的底线意识'] },
    { name:'分析师', cond:() => p.depth > 0.5 && p.risk < 0.4, desc:'谨慎周密，偏好有据可查的决策路径',
      advice:['适当增加行动果断性','在信息不完整时学会做出判断','尝试更多创新性解决方案'] },
    { name:'实用主义者', cond:() => true, desc:'务实灵活，根据情境选择最优策略',
      advice:['深化某一领域的专项谈判技能','建立系统性的谈判框架','记录每次谈判的经验教训'] },
  ];
  return profiles.find((pp) => pp.cond()) || profiles[profiles.length - 1];
}

export function hasEnoughData(totalSessions) {
  return totalSessions >= 2;
}

// 基于 v3 全比例模型的短板检测（阈值针对真实决策比例校准，非 0.5 基线）
export function detectWeakPoints(profile) {
  if (!profile) return [];
  const weak = [];
  if ((profile.assert || 0) < 0.30)                                   weak.push('主张强度不足');
  if ((profile.depth || 0) < 0.45)                                    weak.push('策略深度不足');
  if ((profile.adapt || 0) < 0.40)                                    weak.push('策略适配不足');
  if ((profile.risk || 0) < 0.20)                                     weak.push('风险承受偏低');
  if ((profile.emotion || 0) < 0.35)                                  weak.push('情绪调节不足');
  if ((profile.fairness || 0) > 0.75 && (profile.assert || 0) < 0.30) weak.push('公平敏感偏高，可能过度让步');
  return weak;
}

// 兼容旧入口名（recorder 调用）
export const PsychAnalyzer = { accumulate, computeProfile, getProfileType, hasEnoughData };
