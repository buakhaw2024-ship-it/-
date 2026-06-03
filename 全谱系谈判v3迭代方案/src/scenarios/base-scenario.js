// scenarios/base-scenario.js — 场景抽象基类，定义统一生命周期与事件契约
// 子类实现 start() 与 handleAction(action)，通过 emitRender/finish 与外界通信。
// 约束：场景不操作 DOM、不 import ui 屏幕逻辑（仅可用 components 纯字符串构造器）。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { PERSONALITY_TELLS } from '../data/opponents.js';
import { C } from '../ui/components.js';

export class BaseScenario {
  constructor(opp) {
    this.opp = opp;
    this.log = [];
    this.peeksLeft = 2;   // Phase 4：消耗式"识破对手"次数
    this._peekSnap = null;
  }

  emitRender(html) {
    EventBus.emit(EVENTS.GAME_RENDER, { html });
  }

  finish(result) {
    EventBus.emit(EVENTS.GAME_END, { result });
  }

  // 破绽提示控件：按钮 + （已识破时）对手情绪/行为快照
  peekControls() {
    const label = this.peeksLeft > 0 ? `🔍 识破对手（剩 ${this.peeksLeft} 次）` : '🔍 识破次数已用完';
    let html = C.actionBtn('peek', '', label, 'btn-purple');
    if (this._peekSnap) {
      const m = this._peekSnap.mood;
      const pct = (x) => Math.round(x * 100);
      const tells = (PERSONALITY_TELLS[this.opp.id] || []).join(' / ');
      html += C.hint(
        `<b>读心快照：</b>信任 ${pct(m.trust)}% · 愤怒 ${pct(m.anger)}% · 耐心 ${pct(m.patience)}% · 自信 ${pct(m.confidence)}%<br><span style="color:var(--dim)">行为信号：${tells}</span>`,
        'purple');
    }
    return html;
  }

  handlePeek() {
    if (this.peeksLeft > 0 && !this._peekSnap) {
      this.peeksLeft -= 1;
      this._peekSnap = OpponentAI.snapshot(this.opp.id);
    }
    this._render();
  }

  start() { throw new Error('start() not implemented'); }
  handleAction(_action) { throw new Error('handleAction() not implemented'); }
}
