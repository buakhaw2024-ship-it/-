// ui/screens/opponent-select.js — 对手选择屏（含难度选择 + Trump Boss 解锁）

import { EventBus } from '../../core/event-bus.js';
import { EVENTS, SCREENS } from '../../core/events.js';
import { Store } from '../../core/store.js';
import { OPPONENTS, TRUMP_BOSS, PERSONALITY_TELLS } from '../../data/opponents.js';
import { SCENARIO_META } from '../../data/scenarios.meta.js';
import { DIFFICULTIES, getDifficultyLabel } from '../../engine/difficulty.js';
import { canUnlockBoss, isGrandMaster } from '../../data/ranks.js';
import { loadReputation, applyReputation } from '../../engine/reputation.js';
import { C } from '../components.js';

// 把 reputation 数据转成对玩家可读的徽章 HTML
function repBadge(oppId) {
  const rep = loadReputation(oppId);
  if (rep.games < 2) return '';
  const { openerBias } = applyReputation(oppId, rep);
  const wrText = rep.wins > 0 ? `${Math.round(rep.wins / rep.games * 100)}%` : '0%';
  let alert = '';
  if (openerBias > 0.15) alert = '<span class="rep-alert hot">🔥 已警惕</span>';
  else if (openerBias > 0.05) alert = '<span class="rep-alert warm">⚠ 已建档</span>';
  else if (openerBias < -0.05) alert = '<span class="rep-alert cold">💤 略松懈</span>';
  return `<div class="rep-badge">交手 ${rep.games} 次 · 胜率 ${wrText}${alert}</div>`;
}

function buildOpponentCard(o, difficulty, player) {
  const isBoss = !!o.boss;
  const isEasy = difficulty === 'easy';
  const isMed  = difficulty === 'medium';
  const isHell = difficulty === 'hell';
  const tells  = PERSONALITY_TELLS[o.id] || [];

  let infoLine = '';
  if (isEasy)     infoLine = `弱点：${o.weakness}`;
  else if (isMed) infoLine = `行为信号：${tells.join(' / ')}`;
  else if (isHell && isBoss) infoLine = '⚠ 地狱级：难度修正叠加到 Boss 上，无豁免，无上限';
  else            infoLine = '未知对手 — 请通过行为判断其类型';

  const bossCls = isBoss ? (isHell ? ' boss-card hell-boss' : ' boss-card') : '';
  const badgeCls = isHell ? ' hell' : '';
  const badgeText = isBoss ? (isHell ? '🔥 地狱 BOSS' : '隐藏 BOSS') : '';

  return `
    <div class="opp-card${bossCls}" data-opp="${o.id}">
      <div class="opp-card-avatar">${C.avatarBadge(o, 38)}</div>
      ${isBoss ? `<div class="boss-badge${badgeCls}" style="display:block;text-align:center;margin-bottom:4px">${badgeText}</div>` : ''}
      <div class="opp-name" style="text-align:center">${o.name}</div>
      <div class="opp-type" style="text-align:center">${o.type}</div>
      ${repBadge(o.id)}
      <div class="opp-desc" style="margin:4px 0">${o.desc}</div>
      ${isEasy ? `<div style="font-size:10px;color:var(--yellow)">弱点：${o.weakness}</div>` : ''}
      <div style="margin-top:6px;font-size:10px;color:var(--dim)">${infoLine}</div>
    </div>`;
}

export function renderOpponentSelect() {
  const key = Store.get('scenarioKey');
  const meta = SCENARIO_META[key] || { name: '—', desc: '' };
  const difficulty = Store.get('difficulty') || 'medium';
  const player = Store.get('player');

  const unlocked = canUnlockBoss(player, difficulty);
  const grandMaster = isGrandMaster(player);

  // Difficulty button row
  const diffBtns = DIFFICULTIES.map((d) => {
    const active = d.key === difficulty;
    const gated = d.key === 'extreme' || d.key === 'hell';
    if (gated && !grandMaster) return '';
    const isHellBtn = d.key === 'hell';
    const activeCls = active ? (isHellBtn ? 'active-diff-hell' : 'btn-cyan active-diff') : '';
    const baseCls = isHellBtn ? ' btn-red' : '';
    return `<button class="btn btn-sm diff-btn${baseCls} ${activeCls}"
              data-diff="${d.key}" style="margin:2px">${d.label}</button>`;
  }).join('');

  // Opponent cards
  const opps = [...OPPONENTS];
  if (unlocked) opps.push(TRUMP_BOSS);

  const cards = opps.map((o) => buildOpponentCard(o, difficulty, player)).join('');

  // Unlock hint
  let hintHtml = '';
  if (unlocked && difficulty === 'hell') {
    hintHtml = C.hint('🔥 <b>地狱级已激活</b>：对手让步空间压到极限（45%），Boss 的豁免被取消——难度修正直接叠加到其已极端的基础行为上。', 'red');
  } else if (unlocked) {
    hintHtml = C.hint('🔓 <b>终局挑战已开启</b>：隐藏 Boss 可选，展示你的宗师实力。', 'yellow');
  } else if (grandMaster) {
    hintHtml = C.hint('你已达到 <b>宗师级</b>，选择「终局挑战」或「地狱级」解锁隐藏 Boss。', 'cyan');
  } else {
    hintHtml = C.hint('隐藏 Boss 解锁条件：军衔 <b>宗师级</b> + <b>终局挑战</b>（或地狱级）难度。', 'purple');
  }

  return `
    <div class="flex-between">
      <div class="section-title">▶ 选择对手</div>
      <button class="back-btn" data-nav="${SCREENS.SCENARIO_SELECT}">← 返回</button>
    </div>
    ${C.hint(`已选场景：<b style="color:var(--cyan)">${meta.name}</b>  <span style="color:var(--dim)">${meta.desc}</span>`)}
    <div class="panel" style="margin-bottom:12px">
      <div class="panel-title">训练难度</div>
      <div id="diff-btns" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${diffBtns}</div>
      <div style="font-size:11px;color:var(--dim)">
        初级：显示弱点 &nbsp;|&nbsp; 中级：行为信号 &nbsp;|&nbsp; 高级：信息封锁 &nbsp;|&nbsp; 终局挑战：宗师专属 &nbsp;|&nbsp; <span style="color:var(--red)">地狱级：Boss 无豁免·无上限</span>
      </div>
    </div>
    ${hintHtml}
    <div class="grid2">${cards}</div>
    <div style="margin-top:12px">
      <button class="btn btn-yellow" style="width:100%" data-opp="random">⚡ 随机对手（挑战未知）</button>
    </div>
  `;
}

function showHellWarning(onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'hell-modal-overlay';
  overlay.innerHTML = `
    <div class="hell-modal">
      <div class="hell-modal-icon">🔥</div>
      <div class="hell-modal-title">地狱级 · 无上限协议</div>
      <div class="hell-modal-body">
        <ul>
          <li>对手让步空间压缩至 <b style="color:var(--red)">45%</b>，强硬度倍增至 <b style="color:var(--red)">1.55×</b></li>
          <li>接受概率下移 <b style="color:var(--red)">−20</b> 点，谈判空间极度压缩</li>
          <li>隐藏 Boss 的豁免被取消——难度修正直接叠加到其极端基础行为上</li>
          <li>没有信息辅助，对手的行为几乎不可预测</li>
        </ul>
      </div>
      <div class="hell-modal-btns">
        <button class="btn btn-red" id="hell-confirm" style="min-width:120px">接受挑战</button>
        <button class="btn" id="hell-cancel" style="min-width:80px">撤回</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#hell-confirm').addEventListener('click', () => {
    document.body.removeChild(overlay);
    onConfirm();
  });
  overlay.querySelector('#hell-cancel').addEventListener('click', () => {
    document.body.removeChild(overlay);
    Store.set('difficulty', 'extreme');
    EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.OPPONENT_SELECT, params: {} });
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      Store.set('difficulty', 'extreme');
      EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.OPPONENT_SELECT, params: {} });
    }
  });
}

renderOpponentSelect.afterRender = function () {
  const key = Store.get('scenarioKey');

  // Difficulty button click
  document.querySelectorAll('.diff-btn[data-diff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const diff = btn.getAttribute('data-diff');
      if (diff === 'hell') {
        // shake animation, then show warning modal
        btn.classList.add('btn-shake');
        btn.addEventListener('animationend', () => btn.classList.remove('btn-shake'), { once: true });
        Store.set('difficulty', 'hell');
        showHellWarning(() => {
          EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.OPPONENT_SELECT, params: {} });
        });
        return;
      }
      Store.set('difficulty', diff);
      EventBus.emit(EVENTS.NAV_GOTO, { screen: SCREENS.OPPONENT_SELECT, params: {} });
    });
  });

  // Opponent card click
  document.querySelectorAll('[data-opp]').forEach((el) => {
    el.addEventListener('click', () => {
      const oppId = el.getAttribute('data-opp');
      EventBus.emit(EVENTS.GAME_START, { scenarioKey: key, opponentId: oppId });
    });
  });

  const back = document.querySelector('[data-nav]');
  if (back) back.addEventListener('click', () =>
    EventBus.emit(EVENTS.NAV_GOTO, { screen: back.getAttribute('data-nav'), params: {} }));
};
