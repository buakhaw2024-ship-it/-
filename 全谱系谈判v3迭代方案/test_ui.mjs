import { C } from './src/ui/components.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ FAIL: ' + msg); } };
const balanced = (h) => (h.match(/<div\b/g)||[]).length === (h.match(/<\/div>/g)||[]).length;
const dots = (h) => (h.match(/class="tl-dot /g)||[]).length; // 精确匹配圆点（排除 tl-dots 容器）

console.log('[1] avatarEmoji 映射');
ok(C.avatarEmoji('trumpBoss') === '👑', 'Boss = 👑');
ok(C.avatarEmoji('rational') === '🧮', '理性 = 🧮');
ok(C.avatarEmoji('unknown') === '🤝', '未知回退 = 🤝');

console.log('[2] avatarBadge');
const badge = C.avatarBadge({ id:'aggressive', boss:false }, 40);
ok(badge.includes('<svg'), '含 SVG 头像');
ok(badge.includes('avatar-svg-host'), '含 SVG 宿主 class');
ok(badge.includes('nego-avatar-ring'), '含光环类');
ok(!badge.includes('boss-ring'), '非 Boss 无金环');
ok(C.avatarBadge({ id:'trumpBoss', boss:true }).includes('boss-ring'), 'Boss 有金环');
ok(C.avatarBadge(null) === '', 'null 安全返回空');
ok(C.avatarSvg('trumpBoss').includes('<svg'), '特朗普专属 SVG');
ok(C.avatarSvg('rational') !== C.avatarSvg('trumpBoss'), '不同角色 SVG 不同');

console.log('[3] moodEmoji 分支（完整 mood 对象）');
ok(C.moodEmoji({ trust:0.2, anger:0.8, patience:0.5, confidence:0.5 }) === '😠', '高愤怒 = 😠');
ok(C.moodEmoji({ trust:0.8, anger:0.1, patience:0.5, confidence:0.5 }) === '😊', '高信任 = 😊');
ok(C.moodEmoji({ trust:0.6, anger:0.2, patience:0.5, confidence:0.5 }) === '🤝', '信任合作 = 🤝');
ok(C.moodEmoji({ trust:0.3, anger:0.1, patience:0.1, confidence:0.5 }) === '⏰', '低耐心 = ⏰');
ok(C.moodEmoji({ trust:0.3, anger:0.1, patience:0.5, confidence:0.8 }) === '😎', '高自信 = 😎');
ok(C.moodEmoji({ trust:0.3, anger:0.1, patience:0.5, confidence:0.3 }) === '🤔', '中立 = 🤔');
ok(C.moodEmoji(null) === '', 'null 安全');

console.log('[4] dialogBubble 三种角色');
const pb = C.dialogBubble('出价 50', 'player', '第1轮');
ok(pb.includes('bubble-row-player') && pb.includes('bubble-player'), '玩家气泡类正确');
ok(pb.includes('第1轮') && pb.includes('出价 50'), '玩家气泡含标签与文本');
ok(balanced(pb), '玩家气泡 div 平衡');
const ab = C.dialogBubble('合作', 'ai', '理性 😊');
ok(ab.includes('bubble-row-ai') && ab.includes('bubble-ai'), 'AI 气泡类正确');
ok(ab.includes('😊'), 'AI 气泡含情绪 emoji');
ok(balanced(ab), 'AI 气泡 div 平衡');
ok(C.dialogBubble('提案被拒', 'system', '第2轮').includes('bubble-system'), '系统气泡类正确');
ok(C.dialogBubble('', 'ai') === '', '空文本返回空');

console.log('[5] roundTimeline');
const tl = C.roundTimeline([{},{}], 5, 2);
ok(tl.includes('第3/5轮'), '标签显示当前/总');
ok((tl.match(/tl-done/g)||[]).length === 2, '2 个已完成');
ok((tl.match(/tl-current/g)||[]).length === 1, '1 个当前');
ok((tl.match(/tl-pending/g)||[]).length === 2, '2 个待开始');
ok(dots(tl) === 5, '总 5 个圆点');

console.log('[6] stageProgress');
const sp = C.stageProgress(1, 4);
ok(sp.includes('阶段2/4'), '阶段标签正确');
ok(dots(sp) === 4, '总 4 个阶段点');
ok((sp.match(/tl-current/g)||[]).length === 1, '1 个当前阶段');

console.log('\n────────────────────────────────────');
console.log(`UI 验证：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
