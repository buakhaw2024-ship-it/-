// analytics/replay.js — 逐回合复盘评分（Phase 4）
// 输入：场景 kind + 回合日志 + 结果 + 对手；输出：逐回合 0-100 评分 + 转折点 + 改进建议 + 对手情绪序列。

import { getOpponentTips } from '../data/opponents.js';

const clampScore = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

function scorePrisoners(rounds) {
  return rounds.map((r) => {
    let score, comment;
    if (r.player === 'coop' && r.opp === 'coop') { score = 85; comment = '互利合作，稳健可持续'; }
    else if (r.player === 'defect' && r.opp === 'coop') { score = 66; comment = '占得便宜，但易招致后续报复'; }
    else if (r.player === 'coop' && r.opp === 'defect') { score = 40; comment = '被对方利用，吃亏'; }
    else { score = 32; comment = '双输僵局，零和内耗'; }
    return { label: `第${r.round}轮`, score, comment, mood: r.mood };
  });
}

function scoreTrust(rounds) {
  return rounds.map((r) => {
    const score = clampScore(50 + r.myNet * 4);
    const comment = r.myNet > 3 ? '信任获得正回报' : r.myNet >= 0 ? '基本持平' : '信任被辜负，受损';
    return { label: `第${r.round}轮(投${r.invested})`, score, comment, mood: r.mood };
  });
}

function scorePublicGoods(rounds) {
  return rounds.map((r) => {
    const gain = r.share - r.my;
    const score = clampScore(50 + gain * 6);
    const comment = r.my >= 5 && r.opp >= 5 ? '集体共赢' : r.my === 0 ? '搭便车，短期获利但侵蚀信任' : '谨慎参与';
    return { label: `第${r.round}轮(贡${r.my})`, score, comment, mood: r.mood };
  });
}

function scoreBargaining(rounds, result) {
  const per = rounds.map((r, i) => {
    const prev = i > 0 ? rounds[i - 1].my : r.my;
    const conc = r.my - prev;
    const score = clampScore(88 - conc * 3);
    const comment = conc <= 3 ? '小步施压，纪律良好' : conc >= 12 ? '让步过快，丢失筹码' : '让步适中';
    return { label: `第${r.round}轮(出${r.my})`, score, comment, mood: r.mood };
  });
  // 追加成交评分
  const price = 100 - result.playerScore;
  per.push({
    label: `成交(${price}元)`,
    score: clampScore(price <= 55 ? 92 : price <= 65 ? 70 : 45),
    comment: price <= 55 ? '远低于真实价值，出色' : price <= 65 ? '接近真实价值' : '偏高，议价不足',
  });
  return per;
}

function scoreUltimatum(rounds) {
  return rounds.map((r) => {
    let score, comment;
    if (!r.accepted) { score = 30; comment = '提案被否，双方归零'; }
    else if (r.myOffer >= 40 && r.myOffer <= 62) { score = 85; comment = '分配合理，顺利达成'; }
    else if (r.myOffer > 62) { score = 60; comment = '自留偏多，侥幸通过'; }
    else { score = 70; comment = '偏让利，关系友好'; }
    return { label: `第${r.round}轮`, score, comment };
  });
}

function scoreStaged(rounds) {
  return rounds.map((r, i) => {
    const max = r.maxPs || 20;
    const score = clampScore(Math.round((r.ps / max) * 100));
    const comment = r.ps >= max * 0.8 ? '上佳选择' : r.ps > 0 ? '有效推进' : '适得其反，激化局面';
    return { label: r.stage || `第${i + 1}阶段`, score, comment };
  });
}

const SCORERS = {
  prisoners: scorePrisoners,
  trust: scoreTrust,
  publicgoods: scorePublicGoods,
  bargaining: scoreBargaining,
  ultimatum: scoreUltimatum,
  crisis: scoreStaged,
  coalition: scoreStaged,
};

export function buildReplay(kind, rounds, opp, result) {
  const scorer = SCORERS[kind];
  if (!scorer || !rounds || !rounds.length) {
    return { perRound: [], avgScore: null, turning: null, advice: opp ? getOpponentTips(opp.id).slice(0, 2) : [], moodSeries: null };
  }
  const perRound = scorer(rounds, result);
  const avgScore = Math.round(perRound.reduce((s, r) => s + r.score, 0) / perRound.length);

  // 转折点：最低分回合（若整体优秀则取最佳一手）
  let turning = null;
  if (perRound.length) {
    const worst = perRound.reduce((a, b) => (b.score < a.score ? b : a));
    const best = perRound.reduce((a, b) => (b.score > a.score ? b : a));
    turning = worst.score < 55
      ? { type: 'bad', text: `${worst.label}是本局关键失误（${worst.score}分）：${worst.comment}` }
      : { type: 'good', text: `${best.label}是本局最佳一手（${best.score}分）：${best.comment}` };
  }

  // 对手情绪序列（仅决策类场景携带 mood）
  const moods = perRound.filter((r) => r.mood).map((r) => r.mood);
  const moodSeries = moods.length ? moods : null;

  // 改进建议：表现 + 对手专项
  const advice = [];
  if (avgScore >= 75) advice.push('整体决策质量高，可尝试更高难度对手或更激进的目标。');
  else if (avgScore >= 55) advice.push('决策稳健但有提升空间，关注转折点回合的更优解。');
  else advice.push('多个回合失分明显，建议复盘转折点，调整对该类对手的策略。');
  if (opp) advice.push(...getOpponentTips(opp.id).slice(0, 2));

  return { perRound, avgScore, turning, advice, moodSeries };
}
