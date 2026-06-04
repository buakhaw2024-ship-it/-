// build_preview.mjs — 生成独立静态预览页（使用真实 C 组件 + 真实 styles.css）
// 输出 dist/preview.html，双击即可在浏览器离线查看谈判桌全部视觉元素。
import { C } from './src/ui/components.js';
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync(new URL('./src/styles.css', import.meta.url), 'utf8');

// 复刻 game-view.js 的 buildChrome（带样例温度位置与情绪）
function chrome(opp, tempPct, mood) {
  const ringCls = opp.boss ? 'nego-avatar-ring boss-ring' : 'nego-avatar-ring';
  const typeLine = (opp.type || '').split('/')[0].trim();
  return `<div class="nego-chrome">
    <div class="nego-avatar-section">
      <div class="${ringCls}"><span class="nego-avatar-emoji">${C.avatarEmoji(opp.id)}</span></div>
      <div class="nego-avatar-name">${opp.name}</div>
      <div class="nego-avatar-type">${typeLine}</div>
    </div>
    <div class="nego-temp-section">
      <div class="nego-temp-label">⟺ 关系温度</div>
      <div class="nego-temp-track"><div class="nego-temp-marker" style="left:${tempPct}%"></div></div>
      <div class="nego-temp-meta">${C.moodEmoji(mood)}  信任 ${Math.round(mood.trust*100)}% · 愤怒 ${Math.round(mood.anger*100)}%</div>
    </div>
  </div>`;
}

const OPP_RATIONAL = { id:'rational', name:'理性博弈者', type:'理性算计型 / 利益最大化', boss:false };
const OPP_AGGR     = { id:'aggressive', name:'强硬鹰派', type:'高压强硬型 / 锚定施压', boss:false };
const OPP_BOSS     = { id:'trumpBoss', name:'极限交易者', type:'极限交易型 / 高压锚定型', boss:true };

// 样例对话（囚徒困境）
const convo =
  C.dialogBubble('选择合作', 'player', '第1轮') +
  C.dialogBubble('合作 (+3 vs +3) — 你示好，我暂且回应', 'ai', `理性博弈者 ${C.moodEmoji({trust:0.62,anger:0.1,patience:0.6,confidence:0.5})}`) +
  C.dialogBubble('选择背叛', 'player', '第2轮') +
  C.dialogBubble('背叛 (+1 vs +1) — 你变脸，我立刻报复', 'ai', `理性博弈者 ${C.moodEmoji({trust:0.25,anger:0.7,patience:0.4,confidence:0.6})}`) +
  C.dialogBubble('选择合作', 'player', '第3轮') +
  C.dialogBubble('背叛 (+0 vs +5) — 信任已破，继续收割', 'ai', `理性博弈者 ${C.moodEmoji({trust:0.18,anger:0.78,patience:0.3,confidence:0.7})}`);

// 系统气泡（最后通牒）
const sysConvo =
  C.dialogBubble('提案 我方 60 / 对方 40 → <span style="color:var(--green)">✓ 接受</span>', 'system', '第1轮') +
  C.dialogBubble('提案 我方 70 / 对方 30 → <span style="color:var(--red)">✗ 拒绝</span>', 'system', '第2轮');

// 对手选择卡片
function oppCard(o, infoLine, isBoss) {
  return `<div class="opp-card${isBoss?' boss-card':''}">
    <div class="opp-card-avatar">${C.avatarBadge(o, 38)}</div>
    ${isBoss?'<div class="boss-badge" style="display:block;text-align:center;margin-bottom:4px">隐藏 BOSS</div>':''}
    <div class="opp-name" style="text-align:center">${o.name}</div>
    <div class="opp-type" style="text-align:center">${o.type}</div>
    <div class="opp-desc" style="margin:4px 0">样例描述文本：该对手的行为风格与谈判倾向。</div>
    <div style="margin-top:6px;font-size:10px;color:var(--dim)">${infoLine}</div>
  </div>`;
}

const section = (t, body) => `<h2 style="color:var(--cyan);font-size:14px;letter-spacing:1px;border-bottom:1px solid var(--border);padding-bottom:6px;margin:28px 0 12px">${t}</h2>${body}`;

const page = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>谈判桌 UI 预览</title>
<style>${css}
.preview-note{color:var(--dim);font-size:11px;margin-bottom:10px}
</style></head>
<body><div class="container">
<div class="header"><h1>◆ 谈判桌 UI 预览 ◆</h1><div class="sub">PHASE 7 · 可视化谈判桌组件静态预览（样例数据）</div></div>

${section('① 谈判桌外壳：对手头像 + 关系温度条（三种温度/情绪/Boss）',
  `<div class="preview-note">滑块位置 = 信任−愤怒映射；Boss 头像为金色光环。在浏览器中光环有呼吸动画。</div>
   ${chrome(OPP_RATIONAL, 81, {trust:0.72,anger:0.1})}
   ${chrome(OPP_AGGR, 28, {trust:0.2,anger:0.64})}
   ${chrome(OPP_BOSS, 50, {trust:0.4,anger:0.4})}`)}

${section('② 回合时间线 / 阶段进度',
  `<div class="preview-note">青色脉冲点=当前回合（浏览器中有脉冲动画），暗灰=已完成，空心=待开始。</div>
   ${C.roundTimeline([{}, {}], 5, 2)}
   ${C.stageProgress(1, 4)}`)}

${section('③ 对话气泡：玩家（右·青）/ 对手（左·暗·含情绪 emoji）',
  `<div class="preview-note">最新一条在浏览器中会有淡入滑动动画；气泡区超高时自动滚动。</div>
   <div class="bubble-log">${convo}</div>`)}

${section('④ 系统气泡（最后通牒 / 多阶段场景）',
  `<div class="bubble-log">${sysConvo}</div>`)}

${section('⑤ 对手选择卡片（带头像，难度分级信息）',
  `<div class="grid2">
     ${oppCard(OPP_RATIONAL, '弱点：过度依赖计算，易被非理性扰动', false)}
     ${oppCard(OPP_AGGR, '行为信号：开局高锚定 / 极少让步', false)}
     ${oppCard(OPP_BOSS, '未知对手 — 请通过行为判断其类型', true)}
   </div>`)}

${section('⑥ 结果屏头像头部',
  `<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0 14px">
     ${C.avatarBadge(OPP_BOSS, 40)}
     <div style="text-align:left">
       <div style="color:var(--white);font-size:13px;font-weight:bold">${OPP_BOSS.name}</div>
       <div style="color:var(--purple);font-size:10px">${OPP_BOSS.type}</div>
     </div>
   </div>`)}

<div style="text-align:center;color:var(--dim);font-size:10px;margin:30px 0 10px">
  此预览由 build_preview.mjs 用真实组件 + 真实样式生成 · 与 dist/game_trainer.html 视觉一致
</div>
</div></body></html>`;

writeFileSync(new URL('./dist/preview.html', import.meta.url), page, 'utf8');
console.log('✓ 预览已生成：dist/preview.html (' + (Buffer.byteLength(page)/1024).toFixed(1) + ' KB)');
