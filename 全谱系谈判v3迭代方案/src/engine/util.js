// engine/util.js — 决策引擎通用工具

export const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

// 指数滑动平均：近期行为权重更高
export const ema = (prev, val, a = 0.4) => prev * (1 - a) + val * a;

export const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

export const chance = (p) => Math.random() < p;
