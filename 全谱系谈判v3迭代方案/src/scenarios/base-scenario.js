// scenarios/base-scenario.js — 场景抽象基类，定义统一生命周期与事件契约
// 子类实现 start() 与 handleAction(action)，通过 emitRender/finish 与外界通信。
// 约束：场景不操作 DOM、不 import ui 屏幕逻辑（仅可用 components 纯字符串构造器）。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { Store } from '../core/store.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { Mood } from '../engine/mood.js';
import { chance } from '../engine/util.js';
import { PERSONALITY_TELLS } from '../data/opponents.js';
import { C } from '../ui/components.js';

const CRAM_MAP = { easy: 0, medium: 0, hard: 1, extreme: 2, hell: 3 };

export class BaseScenario {
  constructor(opp) {
    this.opp = opp;
    this.log = [];
    this.peeksLeft = 2;   // Phase 4：消耗式"识破对手"次数
    this._peekSnap = null;
    // 蚕食机制（动态锚定 / 中途加码）
    this._cramAttempts = 0;
    this._maxCramAttempts = CRAM_MAP[Store.get('difficulty')] || 0;
    this._cramCooldown = 0;
    this._pendingCram = null;
  }

  // 子类在 _render() 开头调用：决定本回合是否抛出新条件
  // 仅 Boss / 强硬型 / 操纵型 + hard 及以上难度才会触发
  tryCram(opts = {}) {
    if (this._pendingCram) return this._pendingCram;
    if (this._cramAttempts >= this._maxCramAttempts) return null;
    if (this._cramCooldown > 0) { this._cramCooldown -= 1; return null; }
    const opp = this.opp;
    const canCram = opp.boss || opp.id === 'aggressive' || opp.id === 'manipulative';
    if (!canCram) return null;
    const round = opts.round != null ? opts.round : 0;
    const totalRounds = opts.totalRounds || 5;
    const midGame = round >= 1 && round <= totalRounds - 2;
    if (!midGame) return null;
    // 概率随尝试次数递增，但每次最多 ~60%
    const triggerChance = Math.min(0.6, (this._cramAttempts + 1) / (this._maxCramAttempts + 2));
    if (!chance(triggerChance)) return null;
    this._cramAttempts += 1;
    this._cramCooldown = 2;
    this._pendingCram = { text: opts.text || '', kind: opts.kind || 'generic' };
    return this._pendingCram;
  }

  cramControls() {
    if (!this._pendingCram) return '';
    const cram = this._pendingCram;
    return C.hint(`<b>⚠ ${this.opp.name} 中途加码：</b>${cram.text}`, 'red') +
      `<div class="grid2" style="margin:8px 0">` +
        C.actionBtn('resist-cram', '', '<b>🛡 拒绝额外条件</b>（坚守原框架）', 'btn-red') +
        C.actionBtn('accept-cram', '', '<b>🤝 接受新条件</b>（推进谈判）', 'btn-green') +
      `</div>`;
  }

  consumeCram() {
    const c = this._pendingCram;
    this._pendingCram = null;
    return c;
  }

  emitRender(html) {
    EventBus.emit(EVENTS.GAME_RENDER, { html });
  }

  finish(result) {
    EventBus.emit(EVENTS.GAME_END, { result });
  }

  // 破绽提示控件：按钮 + ℹ说明 + （已识破时）对手情绪/行为快照
  peekControls() {
    const label = this.peeksLeft > 0 ? `🔍 识破对手（剩 ${this.peeksLeft} 次）` : '🔍 识破次数已用完';
    let html = C.actionBtn('peek', '', label, 'btn-purple');
    html += `<div class="peek-tip-row"><button class="info-tip-btn" data-itip="peek" title="了解识破功能">ℹ</button><span class="peek-tip-label">每局 2 次 · 高难度可能伪装</span></div>`;
    if (this._peekSnap) {
      const m = this._peekSnap.mood;
      const pct = (x) => Math.round(x * 100);
      const tells = (PERSONALITY_TELLS[this.opp.id] || []).join(' / ');
      const deceptive = this._peekSnap.deceptive
        ? `<div style="color:var(--red);font-size:10px;margin-top:4px">⚠ 高难度对手可能伪装情绪，数据仅供参考</div>` : '';
      html += C.hint(
        `<b>读心快照：</b>信任 ${pct(m.trust)}% · 愤怒 ${pct(m.anger)}% · 耐心 ${pct(m.patience)}% · 自信 ${pct(m.confidence)}%<br><span style="color:var(--dim)">行为信号：${tells}</span>${deceptive}`,
        'purple');
    }
    return html;
  }

  handlePeek() {
    if (this.peeksLeft > 0 && !this._peekSnap) {
      this.peeksLeft -= 1;
      const deceptive = Mood.isDeceptionActive();
      const realSnap = OpponentAI.snapshot(this.opp.id);
      const mood = deceptive
        ? Mood.getDeceptiveSnapshot(this.opp.id, this.opp)
        : { ...realSnap.mood };
      this._peekSnap = {
        mood,
        realMood: { ...realSnap.mood }, // 真实情绪保留供复盘
        deceptive,
      };
    }
    this._render();
  }

  start() { throw new Error('start() not implemented'); }
  handleAction(_action) { throw new Error('handleAction() not implemented'); }
}
