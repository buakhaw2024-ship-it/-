// test_hell.mjs — 地狱级难度专项断言
// 覆盖：DIFFICULTIES 表 / getDifficultyMod 数值 / Boss 解锁 / 与 extreme 的相对关系

import { getDifficultyMod, DIFFICULTIES, getDifficultyLabel } from './src/engine/difficulty.js';
import { canUnlockBoss } from './src/data/ranks.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } };

console.log('[1] DIFFICULTIES 含 hell');
ok(DIFFICULTIES.some((d) => d.key === 'hell'), 'hell 条目存在');
ok(DIFFICULTIES.find((d) => d.key === 'hell')?.label === '地狱级', '标签=地狱级');
ok(DIFFICULTIES.length === 5, '共 5 个难度档');
ok(getDifficultyLabel('hell') === '地狱级', 'getDifficultyLabel("hell") 正确');

console.log('[2] getDifficultyMod(hell) 数值');
const hell = getDifficultyMod('hell');
const extreme = getDifficultyMod('extreme');
ok(hell.coopFactor === 0.45, `coopFactor=0.45 (got ${hell.coopFactor})`);
ok(hell.toughFactor === 1.55, `toughFactor=1.55 (got ${hell.toughFactor})`);
ok(hell.acceptShift === -20, `acceptShift=-20 (got ${hell.acceptShift})`);

console.log('[3] hell 相对 extreme 单调更严');
ok(hell.coopFactor < extreme.coopFactor, '对手慷慨度更低');
ok(hell.toughFactor > extreme.toughFactor, '对手强硬度更高');
ok(Math.abs(hell.acceptShift) > Math.abs(extreme.acceptShift), '接受偏移更大');

console.log('[4] Boss 解锁条件');
const gm    = { total: 30, wins: 25 };   // wr=83% → 宗师级
const notGm = { total: 10, wins: 5 };    // wr=50% → 谈判官
ok(canUnlockBoss(gm, 'hell'),       '宗师 + hell → 解锁');
ok(canUnlockBoss(gm, 'extreme'),    '宗师 + extreme → 解锁（不变）');
ok(!canUnlockBoss(notGm, 'hell'),   '非宗师 + hell → 不解锁');
ok(!canUnlockBoss(gm, 'hard'),      '宗师 + hard → 不解锁');
ok(!canUnlockBoss(null, 'hell'),    'null player + hell → 不解锁');

console.log('\n─────────────────────────────────');
console.log(`地狱难度验证：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
