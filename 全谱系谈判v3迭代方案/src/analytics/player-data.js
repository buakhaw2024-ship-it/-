// analytics/player-data.js — 玩家档案 + LocalStorage 持久化
// 兼容 v2.0 存档：key = gts_player_<name>，字段 {name,sessions,total,wins,draws,losses}

const KEY_PREFIX = 'gts_player_';

// 行为统计累加器（Phase 4：心理画像基于真实决策序列计算）
export function freshBehaviorStats() {
  return {
    games: 0,
    coopMoves: 0, totalMoves: 0,
    riskyMoves: 0, assertiveMoves: 0,
    fairActs: 0, fairOpps: 0,
    trustInvested: 0, trustMax: 0,
    impulseAvoid: 0, impulseTotal: 0,
    wins: 0, hardGames: 0, hardWins: 0,
    opponentsSeen: [],
    // 卡池解锁相关统计
    correctReads: 0,    // 正确判断对手类型（使用 peek 后仍获胜）
    tftWins: 0,         // 以 TfT 混合策略赢得囚徒困境
    pureCoopWins: 0,    // 纯合作策略赢得/平局公共品
    hellPureCoop: 0,    // 地狱难度下的纯合作胜利
    fairDeals: 0,       // 公平成交局数
    hellWins: 0,        // 地狱难度胜利数
    bossWins: 0,        // 击败 Boss 次数
  };
}

export function loadPlayer(name) {
  try {
    const saved = localStorage.getItem(KEY_PREFIX + name);
    if (saved) {
      const p = JSON.parse(saved);
      // 向后兼容：补齐 v3 可能新增的字段
      p.sessions = p.sessions || [];
      p.behaviorStats = { ...freshBehaviorStats(), ...(p.behaviorStats || {}) };
      if (typeof p.cardShards !== 'number') p.cardShards = 0;
      return p;
    }
  } catch (e) {
    console.warn('[player-data] 读取存档失败，新建档案', e);
  }
  return { name, sessions: [], total: 0, wins: 0, draws: 0, losses: 0, behaviorStats: freshBehaviorStats(), cardShards: 0 };
}

export function savePlayer(player) {
  if (!player) return;
  try {
    localStorage.setItem(KEY_PREFIX + player.name, JSON.stringify(player));
  } catch (e) {
    console.warn('[player-data] 保存存档失败', e);
  }
}

// 追加一局记录并持久化；返回更新后的 player
export function addSession(player, rec) {
  player.sessions.push(rec);
  player.total += 1;
  if (rec.outcome === 'win') player.wins += 1;
  else if (rec.outcome === 'draw' || rec.outcome === 'coop') player.draws += 1;
  else player.losses += 1;
  savePlayer(player);
  return player;
}
