// core/event-bus.js — 事件总线
// 所有模块通过它通信，模块之间不直接调用彼此的行为函数。
// 开发态：ES Module 导出 EventBus；分发态：build.js 剥离 export 后并入同一作用域。

export const EventBus = (() => {
  const listeners = new Map(); // event -> Set<handler>

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => off(event, handler); // 返回取消订阅函数
  }

  function once(event, handler) {
    const wrapper = (payload) => {
      off(event, wrapper);
      handler(payload);
    };
    return on(event, wrapper);
  }

  function off(event, handler) {
    const set = listeners.get(event);
    if (set) set.delete(handler);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    // 复制一份，避免 handler 内部增删订阅导致迭代异常
    [...set].forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] handler error on "${event}":`, err);
      }
    });
  }

  return { on, once, off, emit };
})();
