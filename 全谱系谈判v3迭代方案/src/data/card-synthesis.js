// data/card-synthesis.js — 卡牌合成系统
// 提供 8 张合成专属"萌系"新卡 + 合成配方 + Q 版融合头像 + 碎片经济。
// 设计原则：源卡不消耗（只需"拥有"），合成结果是全新的独立卡。

import { Store } from '../core/store.js';
import { EventBus } from '../core/event-bus.js';
import { savePlayer } from '../analytics/player-data.js';

// ─── 合成专属卡池 ──────────────────────────────────────────────────────────────
// 这 8 张只能通过合成获得，不会出现在常规对局解锁条件里。
export const FUSION_CARDS = [
  // ── 4 张 SR 融合卡（萌系组合）─────────────────────────────────
  {
    id: 'fx_logic_heart',
    rarity: 'SR', tier: 'fusion',
    name: '💫 理智之心',
    flavor: '当冷静的算法第一次为温度让步，是最美的妥协。',
    requires: ['r_rational_1', 'r_emo_1'],
    shards: 200,
    avatar: 'logicHeart',
  },
  {
    id: 'fx_iron_olive',
    rarity: 'SR', tier: 'fusion',
    name: '🌸 铁与橄榄',
    flavor: '握紧的拳头里藏着一束花，强硬之下亦可优雅。',
    requires: ['r_aggr_1', 'r_coop_1'],
    shards: 200,
    avatar: 'ironOlive',
  },
  {
    id: 'fx_shadow_shield',
    rarity: 'SR', tier: 'fusion',
    name: '🌙 影盾',
    flavor: '看透是另一种保护，识破是更稳的盾。',
    requires: ['r_mani_1', 'r_risk_1'],
    shards: 200,
    avatar: 'shadowShield',
  },
  {
    id: 'fx_anchor_balance',
    rarity: 'SR', tier: 'fusion',
    name: '⚖️ 平衡之锚',
    flavor: '稳住自己，比说服别人更难。',
    requires: ['r_fair_1', 'r_trust_1', 'r_assert_1'],
    shards: 250,
    avatar: 'anchorBalance',
  },

  // ── 3 张 SSR 融合卡（高阶共鸣）──────────────────────────────────
  {
    id: 'fx_spectrum_echo',
    rarity: 'SSR', tier: 'fusion',
    name: '🌈 全谱共鸣',
    flavor: '七种人格的回声，在你身上汇成一道彩虹。',
    requires: ['sr_diversify', 'sr_consistent', 'sr_read_1'],
    shards: 600,
    avatar: 'spectrumEcho',
  },
  {
    id: 'fx_strategy_nova',
    rarity: 'SSR', tier: 'fusion',
    name: '⭐ 策略奇点',
    flavor: '所有路径在你这里收敛成一个最优解。',
    requires: ['ssr_master', 'sr_tft_1', 'sr_rational_2'],
    shards: 700,
    avatar: 'strategyNova',
  },
  {
    id: 'fx_heart_oracle',
    rarity: 'SSR', tier: 'fusion',
    name: '💎 心灵之眼',
    flavor: '看穿不靠技巧，靠的是真正在意。',
    requires: ['ssr_read_pro', 'sr_emo_2', 'sr_fair_2'],
    shards: 700,
    avatar: 'heartOracle',
  },

  // ── 1 张 SP 终极融合卡（全收藏致敬）────────────────────────────
  {
    id: 'fx_soul_negotiator',
    rarity: 'SP', tier: 'fusion',
    name: '👑 谈判之魂',
    flavor: '当你不再为输赢谈判，你就赢了所有。这是所有融合之后的灵魂。',
    requires: [
      'fx_logic_heart', 'fx_iron_olive', 'fx_shadow_shield', 'fx_anchor_balance',
      'fx_spectrum_echo',
    ],
    shards: 2000,
    avatar: 'soulNegotiator',
  },
];

// ─── 萌系 Q 版头像 SVG（精美可爱风格）──────────────────────────────────────────
// 设计语言：大圆头、闪烁高光、爱心 / 星辰、双色融合背景、温柔渐变。
export const FUSION_AVATARS = {
  logicHeart: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgLH" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#5b8def"/><stop offset="1" stop-color="#ff9eb5"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgLH)"/>
  <circle cx="32" cy="34" r="22" fill="#fce8d8"/>
  <path d="M10 28 Q10 10 32 10 Q54 10 54 28 Q48 16 32 16 Q16 16 10 28 Z" fill="#3050a8"/>
  <path d="M32 24 Q28 18 24 22 Q22 26 32 32 Q42 26 40 22 Q36 18 32 24 Z" fill="#ff6b8a"/>
  <circle cx="24" cy="38" r="5" fill="#1a1a28"/><circle cx="40" cy="38" r="5" fill="#1a1a28"/>
  <circle cx="25.5" cy="36" r="2" fill="#fff"/><circle cx="41.5" cy="36" r="2" fill="#fff"/>
  <circle cx="22" cy="40" r="1" fill="#ffd6e0"/><circle cx="42" cy="40" r="1" fill="#ffd6e0"/>
  <circle cx="18" cy="44" r="2" fill="#ffb4c4" opacity=".7"/><circle cx="46" cy="44" r="2" fill="#ffb4c4" opacity=".7"/>
  <path d="M28 48 Q32 50 36 48" stroke="#d04060" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <text x="48" y="14" font-size="7" fill="#fff">✨</text>
</svg>`,

  ironOlive: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgIO" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#7e8aa8"/><stop offset="1" stop-color="#a0d8b0"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgIO)"/>
  <circle cx="32" cy="34" r="22" fill="#fbe8d2"/>
  <path d="M12 26 Q14 12 32 12 Q50 12 52 26 L48 24 L44 28 L40 24 L36 28 L32 24 L28 28 L24 24 L20 28 L16 24 Z" fill="#506890"/>
  <circle cx="48" cy="22" r="3" fill="#88c890"/>
  <ellipse cx="50" cy="20" rx="2" ry="3" fill="#5fa570" transform="rotate(-30 50 20)"/>
  <circle cx="24" cy="38" r="5" fill="#1a1a28"/><circle cx="40" cy="38" r="5" fill="#1a1a28"/>
  <circle cx="25.5" cy="36" r="2" fill="#fff"/><circle cx="41.5" cy="36" r="2" fill="#fff"/>
  <circle cx="20" cy="44" r="1.5" fill="#ffc0c0" opacity=".6"/>
  <circle cx="44" cy="44" r="1.5" fill="#ffc0c0" opacity=".6"/>
  <path d="M28 48 Q32 51 36 48" stroke="#806060" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <text x="6" y="14" font-size="6" fill="#fff">🌸</text>
</svg>`,

  shadowShield: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgSS" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#2c1f4a"/><stop offset="1" stop-color="#6bb8d8"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgSS)"/>
  <circle cx="32" cy="34" r="22" fill="#e8dcf0"/>
  <path d="M10 28 Q10 10 32 10 Q54 10 54 28 L46 22 L40 26 L32 22 L24 26 L18 22 Z" fill="#3a2860"/>
  <path d="M32 14 L48 22 L48 36 Q48 44 32 48 Q16 44 16 36 L16 22 Z" fill="#7090c0" opacity=".35"/>
  <circle cx="24" cy="38" r="5" fill="#1a1a28"/><circle cx="40" cy="38" r="5" fill="#1a1a28"/>
  <circle cx="25.5" cy="36" r="2" fill="#fff"/><circle cx="41.5" cy="36" r="2" fill="#fff"/>
  <path d="M32 28 L34 32 L32 36 L30 32 Z" fill="#ffd700"/>
  <path d="M28 48 Q32 49 36 48" stroke="#806080" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <text x="6" y="14" font-size="6" fill="#ffd700">🌙</text>
</svg>`,

  anchorBalance: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgAB" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fcd980"/><stop offset="1" stop-color="#6bd8c0"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgAB)"/>
  <circle cx="32" cy="34" r="22" fill="#fff4e0"/>
  <path d="M12 26 Q14 12 32 12 Q50 12 52 26 Q44 18 32 18 Q20 18 12 26 Z" fill="#d08840"/>
  <circle cx="24" cy="38" r="5" fill="#1a1a28"/><circle cx="40" cy="38" r="5" fill="#1a1a28"/>
  <circle cx="25.5" cy="36" r="2" fill="#fff"/><circle cx="41.5" cy="36" r="2" fill="#fff"/>
  <line x1="20" y1="48" x2="44" y2="48" stroke="#a06030" stroke-width="2"/>
  <line x1="32" y1="48" x2="32" y2="54" stroke="#a06030" stroke-width="2"/>
  <circle cx="20" cy="48" r="3" fill="#ffd700"/>
  <circle cx="44" cy="48" r="3" fill="#88e0c0"/>
  <text x="4" y="14" font-size="6" fill="#fff">⚖</text>
</svg>`,

  spectrumEcho: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgSE" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ff6b8a"/><stop offset=".25" stop-color="#ffd700"/>
      <stop offset=".5" stop-color="#88e0c0"/><stop offset=".75" stop-color="#6bb8d8"/>
      <stop offset="1" stop-color="#c084fc"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgSE)"/>
  <circle cx="32" cy="34" r="22" fill="#fff8e8"/>
  <path d="M10 30 Q10 10 32 10 Q54 10 54 30 Q44 18 32 18 Q20 18 10 30 Z" fill="#a060c0"/>
  <circle cx="24" cy="38" r="5.5" fill="#1a1a28"/><circle cx="40" cy="38" r="5.5" fill="#1a1a28"/>
  <circle cx="25.5" cy="35.5" r="2.2" fill="#fff"/><circle cx="41.5" cy="35.5" r="2.2" fill="#fff"/>
  <circle cx="22" cy="40.5" r=".8" fill="#ffd6e0"/><circle cx="42" cy="40.5" r=".8" fill="#ffd6e0"/>
  <path d="M28 47 Q32 51 36 47" stroke="#d04080" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <text x="6" y="56" font-size="6" fill="#fff">🌈</text>
  <text x="50" y="14" font-size="6" fill="#fff">✦</text>
</svg>`,

  strategyNova: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgSN" cx=".5" cy=".5" r=".7">
      <stop offset="0" stop-color="#ffd700"/><stop offset="1" stop-color="#2a3550"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgSN)"/>
  <circle cx="32" cy="34" r="22" fill="#fff0c8"/>
  <path d="M12 26 Q14 12 32 12 Q50 12 52 26 Q46 18 32 18 Q18 18 12 26 Z" fill="#806020"/>
  <path d="M32 6 L34 14 L42 14 L36 20 L38 28 L32 24 L26 28 L28 20 L22 14 L30 14 Z" fill="#ffd700"/>
  <circle cx="24" cy="38" r="5" fill="#1a1a28"/><circle cx="40" cy="38" r="5" fill="#1a1a28"/>
  <circle cx="25.5" cy="36" r="2" fill="#fff"/><circle cx="41.5" cy="36" r="2" fill="#fff"/>
  <path d="M28 48 Q32 50 36 48" stroke="#806020" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`,

  heartOracle: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgHO" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#c084fc"/><stop offset="1" stop-color="#ffb4c4"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgHO)"/>
  <circle cx="32" cy="34" r="22" fill="#fce0f0"/>
  <path d="M10 28 Q10 10 32 10 Q54 10 54 28 Q44 18 32 18 Q20 18 10 28 Z" fill="#7a40a0"/>
  <circle cx="32" cy="30" r="3" fill="#fff"/><circle cx="32" cy="30" r="1.5" fill="#d04080"/>
  <circle cx="24" cy="38" r="5" fill="#1a1a28"/><circle cx="40" cy="38" r="5" fill="#1a1a28"/>
  <path d="M22 36 L26 38 M24 33 L25 37" stroke="#ffd700" stroke-width=".8"/>
  <path d="M38 36 L42 38 M40 33 L41 37" stroke="#ffd700" stroke-width=".8"/>
  <path d="M28 48 Q32 50 36 48" stroke="#7a40a0" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <text x="48" y="14" font-size="7" fill="#fff">💎</text>
</svg>`,

  soulNegotiator: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgSL" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ff4f6a"/><stop offset=".5" stop-color="#ffd700"/><stop offset="1" stop-color="#c084fc"/>
    </linearGradient>
    <radialGradient id="halo" cx=".5" cy=".3" r=".7">
      <stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#bgSL)"/>
  <circle cx="32" cy="20" r="18" fill="url(#halo)"/>
  <circle cx="32" cy="34" r="22" fill="#fff8e0"/>
  <path d="M10 26 Q10 8 32 8 Q54 8 54 26 Q44 14 32 14 Q20 14 10 26 Z" fill="#7a3a8a"/>
  <path d="M22 8 L26 12 L24 16 L28 14 L32 18 L36 14 L40 16 L38 12 L42 8 L36 10 L32 4 L28 10 Z" fill="#ffd700"/>
  <circle cx="24" cy="38" r="5.5" fill="#1a1a28"/><circle cx="40" cy="38" r="5.5" fill="#1a1a28"/>
  <circle cx="25.5" cy="35.5" r="2.5" fill="#fff"/><circle cx="41.5" cy="35.5" r="2.5" fill="#fff"/>
  <circle cx="22" cy="42" r=".8" fill="#ffd6e0"/><circle cx="42" cy="42" r=".8" fill="#ffd6e0"/>
  <path d="M28 48 Q32 52 36 48" stroke="#d04080" stroke-width="2" fill="none" stroke-linecap="round"/>
  <text x="4" y="58" font-size="5" fill="#fff">✦</text>
  <text x="54" y="58" font-size="5" fill="#fff">✦</text>
</svg>`,
};

// ─── 碎片经济 ──────────────────────────────────────────────────────────────────
export function getShards(player) {
  return (player && player.cardShards) || 0;
}

export function addShards(player, amount, reason) {
  if (!player || !amount) return 0;
  player.cardShards = (player.cardShards || 0) + amount;
  if (reason) {
    player._lastShardGain = { amount, reason, at: Date.now() };
  }
  savePlayer(player);
  return player.cardShards;
}

// 按对局结果计算应得碎片
export function computeShardsForGame(result, opp, isDailyFirst) {
  let total = 20;
  if (result.outcome === 'win' || result.outcome === 'coop') total += 30;
  if (result.outcome === 'win' && opp && opp.boss) total += 50;
  if (result.outcome === 'win' && result.difficulty === 'hell') total += 50;
  if (result.hiddenObjective && result.hiddenObjective.passed) total += 40;
  if (isDailyFirst) total += 50;
  return total;
}

// ─── 配方查询 ──────────────────────────────────────────────────────────────────
export function getRecipeStatus(player, recipe) {
  const owned = (player && player.cardCollection) || [];
  const shards = getShards(player);
  const missingCards = recipe.requires.filter((id) => !owned.includes(id));
  const enoughShards = shards >= recipe.shards;
  const alreadyOwned = owned.includes(recipe.id);
  return {
    alreadyOwned,
    canCraft: !alreadyOwned && missingCards.length === 0 && enoughShards,
    missingCards,
    enoughShards,
    shards,
  };
}

// ─── 执行合成 ──────────────────────────────────────────────────────────────────
export function craftFusionCard(player, recipeId) {
  if (!player) return { ok: false, reason: 'no-player' };
  const recipe = FUSION_CARDS.find((c) => c.id === recipeId);
  if (!recipe) return { ok: false, reason: 'no-recipe' };
  const status = getRecipeStatus(player, recipe);
  if (status.alreadyOwned) return { ok: false, reason: 'already-owned' };
  if (status.missingCards.length) return { ok: false, reason: 'missing-cards', missing: status.missingCards };
  if (!status.enoughShards) return { ok: false, reason: 'not-enough-shards', need: recipe.shards, have: status.shards };

  player.cardShards = (player.cardShards || 0) - recipe.shards;
  player.cardCollection = player.cardCollection || [];
  player.cardCollection.push(recipe.id);
  savePlayer(player);
  Store.set('player', player);

  return { ok: true, card: recipe, shardsLeft: player.cardShards };
}
