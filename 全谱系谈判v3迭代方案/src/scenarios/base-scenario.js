// scenarios/base-scenario.js — 场景抽象基类，定义统一生命周期与事件契约
// 子类实现 start() 与 handleAction(action)，通过 emitRender/finish 与外界通信。
// 约束：场景不操作 DOM、不 import ui 屏幕逻辑（仅可用 components 纯字符串构造器）。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';

export class BaseScenario {
  constructor(opp) {
    this.opp = opp;
    this.log = [];
  }

  // 发起一次渲染：把 HTML 交给 game-view 落地
  emitRender(html) {
    EventBus.emit(EVENTS.GAME_RENDER, { html });
  }

  // 结束对局：result = { playerScore, oppScore, outcome, summary(html) }
  finish(result) {
    EventBus.emit(EVENTS.GAME_END, { result });
  }

  // 子类必须实现
  start() { throw new Error('start() not implemented'); }
  handleAction(_action) { throw new Error('handleAction() not implemented'); }
}
