// ui/cards.js — 泡泡马特风格卡池系统
// 30 张收藏卡，按稀有度分 R/SR/SSR/SP；游戏结算后自动开盒；集卡册屏幕。

import { EventBus } from '../core/event-bus.js';
import { EVENTS, SCREENS } from '../core/events.js';
import { Store } from '../core/store.js';
import { savePlayer } from '../analytics/player-data.js';

// ─── 30 张卡定义 ────────────────────────────────────────────────────────────
export const CARD_POOL = [
  // ── R (普通, 12 张) ──────────────────────────────────────────────────────
  { id:'r_coop_1',      rarity:'R',   name:'合作之手',    opp:'cooperative',  flavor:'伸出手，总比握拳更有力量。',                 condition: (s) => s.games >= 1 },
  { id:'r_rational_1',  rarity:'R',   name:'数据优先',    opp:'rational',     flavor:'没有数字，就没有谈判。',                     condition: (s) => s.games >= 1 },
  { id:'r_aggr_1',      rarity:'R',   name:'铁拳出击',    opp:'aggressive',   flavor:'压力是谈判桌上最廉价的货币。',               condition: (s) => s.games >= 2 },
  { id:'r_risk_1',      rarity:'R',   name:'稳中求胜',    opp:'riskAverse',   flavor:'慢即是快，谨慎是最好的策略。',               condition: (s) => s.games >= 2 },
  { id:'r_emo_1',       rarity:'R',   name:'共情之桥',    opp:'emotional',    flavor:'感受对方的情绪，才能真正触达需求。',         condition: (s) => s.coopMoves >= 3 },
  { id:'r_mani_1',      rarity:'R',   name:'识破伪装',    opp:'manipulative', flavor:'谎言总有破绽，耐心是最好的探针。',           condition: (s) => s.games >= 3 },
  { id:'r_fair_1',      rarity:'R',   name:'公平协议',    opp:'cooperative',  flavor:'双赢不是妥协，是更高级的胜利。',             condition: (s) => s.fairDeals >= 1 },
  { id:'r_trust_1',     rarity:'R',   name:'初步信任',    opp:'cooperative',  flavor:'信任是谈判中最难定价的资产。',               condition: (s) => s.trustInvested >= 10 },
  { id:'r_assert_1',    rarity:'R',   name:'坚守底线',    opp:'aggressive',   flavor:'退让有底线，才有继续谈的资格。',             condition: (s) => s.assertiveMoves >= 2 },
  { id:'r_adapt_1',     rarity:'R',   name:'随机应变',    opp:'manipulative', flavor:'战场随时在变，策略也要跟上。',               condition: (s) => (s.opponentsSeen || []).length >= 2 },
  { id:'r_impulse_1',   rarity:'R',   name:'冷静执行',    opp:'emotional',    flavor:'冲动是谈判中最贵的代价。',                   condition: (s) => s.impulseAvoid >= 3 },
  { id:'r_win_1',       rarity:'R',   name:'首胜纪念',    opp:'rational',     flavor:'每一次胜利，都是下一次的起点。',             condition: (s) => s.wins >= 1 },

  // ── SR (稀有, 10 张) ─────────────────────────────────────────────────────
  { id:'sr_tft_1',      rarity:'SR',  name:'以牙还牙',    opp:'rational',     flavor:'用对方的语言回应，是最有效的沟通。',         condition: (s) => s.tftWins >= 1 },
  { id:'sr_coop_2',     rarity:'SR',  name:'深度合作',    opp:'cooperative',  flavor:'反复合作，积累的不只是分数，还有信誉。',     condition: (s) => s.pureCoopWins >= 1 },
  { id:'sr_aggr_2',     rarity:'SR',  name:'硬碰硬',      opp:'aggressive',   flavor:'强压下不动摇，才是真正的谈判力。',           condition: (s) => s.hardWins >= 1 },
  { id:'sr_read_1',     rarity:'SR',  name:'识人术',      opp:'manipulative', flavor:'看穿对手，胜利已在掌握之中。',               condition: (s) => s.correctReads >= 1 },
  { id:'sr_fair_2',     rarity:'SR',  name:'黄金分割',    opp:'cooperative',  flavor:'55/45 是谈判桌上最古老的魔法。',             condition: (s) => s.fairDeals >= 3 },
  { id:'sr_rational_2', rarity:'SR',  name:'精算师',      opp:'rational',     flavor:'每一步都经过计算，才是真正的理性。',         condition: (s) => s.wins >= 5 },
  { id:'sr_emo_2',      rarity:'SR',  name:'情绪大师',    opp:'emotional',    flavor:'能引导情绪，才是高阶谈判者。',               condition: (s) => s.impulseAvoid >= 8 },
  { id:'sr_diversify',  rarity:'SR',  name:'全谱系探索',  opp:'cooperative',  flavor:'见过所有对手，才知道自己真正的边界。',       condition: (s) => (s.opponentsSeen || []).length >= 5 },
  { id:'sr_consistent', rarity:'SR',  name:'百局不败',    opp:'rational',     flavor:'坚持本身，就是一种战略。',                   condition: (s) => s.games >= 10 },
  { id:'sr_risk_2',     rarity:'SR',  name:'风险驾驭',    opp:'riskAverse',   flavor:'把不确定性变成筹码，才是高手。',             condition: (s) => s.riskyMoves >= 5 },

  // ── SSR (超稀有, 6 张) ───────────────────────────────────────────────────
  { id:'ssr_boss_1',    rarity:'SSR', name:'终局挑战者',  opp:'trumpBoss',    flavor:'走到最后，你才能见到真正的对手。',           condition: (s) => s.bossWins >= 1 },
  { id:'ssr_master',    rarity:'SSR', name:'宗师之路',    opp:'rational',     flavor:'不是每一个人都能走到这里。',                 condition: (s) => s.wins >= 15 },
  { id:'ssr_hell_1',    rarity:'SSR', name:'地狱幸存者',  opp:'aggressive',   flavor:'地狱之后，再无恐惧。',                       condition: (s) => s.hellWins >= 1 },
  { id:'ssr_purecoop',  rarity:'SSR', name:'纯粹合作',    opp:'cooperative',  flavor:'全程合作击败对手，是最美丽的博弈。',         condition: (s) => s.pureCoopWins >= 3 },
  { id:'ssr_tft_chain', rarity:'SSR', name:'连锁反应',    opp:'rational',     flavor:'三局 TfT 胜利，意味着你已读懂了博弈的本质。', condition: (s) => s.tftWins >= 3 },
  { id:'ssr_read_pro',  rarity:'SSR', name:'读心师',      opp:'manipulative', flavor:'五次正确识别，你已超越信息本身。',           condition: (s) => s.correctReads >= 5 },

  // ── SP (特别版, 2 张) ────────────────────────────────────────────────────
  { id:'sp_hell_boss',  rarity:'SP',  name:'🔥 地狱征服者', opp:'trumpBoss',  flavor:'地狱难度，最强 Boss，纯合作通关——这不可能发生，但你做到了。', condition: (s) => s.hellPureCoop >= 1 },
  { id:'sp_legend',     rarity:'SP',  name:'⚡ 传说谈判者', opp:'rational',   flavor:'30 局以上，胜率 80%，见过全部 7 类对手，这是谈判的终极勋章。', condition: (s) => s.games >= 30 && (s.wins / s.games) >= 0.8 && (s.opponentsSeen || []).length >= 7 },
];

// ─── 稀有度配置 ─────────────────────────────────────────────────────────────
export const RARITY_CFG = {
  R:   { label:'R',   color:'#a0b0c8', glow:'rgba(160,176,200,.4)', bg:'rgba(160,176,200,.08)' },
  SR:  { label:'SR',  color:'#c084fc', glow:'rgba(192,132,252,.5)', bg:'rgba(192,132,252,.1)'  },
  SSR: { label:'SSR', color:'#ffd700', glow:'rgba(255,215,0,.6)',   bg:'rgba(255,215,0,.12)'   },
  SP:  { label:'SP',  color:'#ff4f6a', glow:'rgba(255,79,106,.7)',  bg:'rgba(255,79,106,.15)'  },
};

// ─── 存档 helpers ────────────────────────────────────────────────────────────
export function getCollection(player) {
  return player.cardCollection || [];
}

export function hasCard(player, cardId) {
  return getCollection(player).includes(cardId);
}

// 扫描当前 behaviorStats，返回新解锁的卡（未持有 + 条件满足）
export function checkNewCards(player) {
  const s = player.behaviorStats;
  const owned = getCollection(player);
  return CARD_POOL.filter((c) => !owned.includes(c.id) && c.condition(s));
}

// 把新卡写入存档并持久化
export function unlockCards(player, newCards) {
  if (!player.cardCollection) player.cardCollection = [];
  newCards.forEach((c) => {
    if (!player.cardCollection.includes(c.id)) player.cardCollection.push(c.id);
  });
  savePlayer(player);
}

// ─── 开盒动画 HTML ────────────────────────────────────────────────────────────
export function renderBoxOpenModal(newCards, onClose) {
  if (!newCards || !newCards.length) { onClose && onClose(); return; }

  const overlay = document.createElement('div');
  overlay.className = 'box-modal-overlay';

  const cardsHtml = newCards.map((c, i) => {
    const rc = RARITY_CFG[c.rarity] || RARITY_CFG.R;
    return `<div class="box-card box-card-hidden" data-idx="${i}"
                 style="--card-color:${rc.color};--card-glow:${rc.glow};--card-bg:${rc.bg}">
      <div class="box-card-inner">
        <div class="box-card-front">
          <div class="box-card-rarity">${rc.label}</div>
          <div class="box-card-avatar">${buildCardAvatar(c.opp)}</div>
          <div class="box-card-name">${c.name}</div>
          <div class="box-card-flavor">${c.flavor}</div>
        </div>
        <div class="box-card-back">?</div>
      </div>
    </div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="box-modal">
      <div class="box-modal-title">✨ 获得新卡片！</div>
      <div class="box-cards-row">${cardsHtml}</div>
      <button class="btn btn-cyan box-modal-close" style="margin-top:18px;min-width:140px">收下，继续 ▶</button>
    </div>`;
  document.body.appendChild(overlay);

  // 逐张翻牌动画
  const cardEls = overlay.querySelectorAll('.box-card');
  cardEls.forEach((el, i) => {
    setTimeout(() => {
      el.classList.remove('box-card-hidden');
      el.classList.add('box-card-reveal');
    }, 400 + i * 600);
  });

  overlay.querySelector('.box-modal-close').addEventListener('click', () => {
    document.body.removeChild(overlay);
    onClose && onClose();
  });
}

function buildCardAvatar(oppId) {
  // inline SVG from avatars module (already loaded in scope)
  if (typeof avatarSvg === 'function') return `<div class="box-card-svg">${avatarSvg(oppId)}</div>`;
  const emojiMap = { rational:'🧮', emotional:'🌊', aggressive:'🦅', cooperative:'🤝', manipulative:'🎭', riskAverse:'🛡️', trumpBoss:'👑' };
  return `<span style="font-size:28px">${emojiMap[oppId] || '🤝'}</span>`;
}

// ─── 集卡册屏幕 ───────────────────────────────────────────────────────────────
export function renderCardAlbum() {
  const player = Store.get('player');
  if (!player) return '<div class="hint hint-yellow">请先创建玩家档案。</div>';
  const owned = getCollection(player);
  const total = CARD_POOL.length;
  const got = owned.length;

  const byRarity = { SP: [], SSR: [], SR: [], R: [] };
  CARD_POOL.forEach((c) => byRarity[c.rarity].push(c));

  const sections = Object.entries(byRarity).map(([rarity, cards]) => {
    const rc = RARITY_CFG[rarity];
    const items = cards.map((c) => {
      const unlocked = owned.includes(c.id);
      const dim = !unlocked;
      return `<div class="album-card ${unlocked ? 'album-card-owned' : 'album-card-locked'}"
                   style="--card-color:${rc.color};--card-glow:${rc.glow};--card-bg:${rc.bg}"
                   title="${unlocked ? c.flavor : '???'}">
        <div class="album-card-rarity">${rc.label}</div>
        <div class="album-card-avatar">${dim ? '<span style="font-size:22px;opacity:.3">🔒</span>' : buildCardAvatar(c.opp)}</div>
        <div class="album-card-name">${unlocked ? c.name : '???'}</div>
      </div>`;
    }).join('');
    const ownedCount = cards.filter((c) => owned.includes(c.id)).length;
    return `<div style="margin-bottom:18px">
      <div style="color:${rc.color};font-size:11px;letter-spacing:2px;margin-bottom:8px;font-weight:bold">
        ◆ ${rarity} &nbsp;<span style="color:var(--dim)">${ownedCount}/${cards.length}</span>
      </div>
      <div class="album-grid">${items}</div>
    </div>`;
  }).join('');

  return `
    <div class="flex-between">
      <div class="section-title">⑥ 卡牌收藏册</div>
      <button class="back-btn" data-nav="main">← 返回</button>
    </div>
    <div class="hint hint-cyan" style="margin-bottom:12px">
      已收集 <b style="color:var(--cyan)">${got}</b> / ${total} 张 &nbsp;·&nbsp; 完成率 <b style="color:var(--yellow)">${Math.round(got / total * 100)}%</b> &nbsp;·&nbsp; 通过对局解锁新卡
    </div>
    ${sections}
  `;
}

renderCardAlbum.afterRender = function () {
  const back = document.querySelector('[data-nav="main"]');
  if (back) back.addEventListener('click', () => EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.MAIN, params: {} }));
};
