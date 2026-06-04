// build_preview.mjs — 生成独立静态预览页（使用真实 C 组件 + 真实 styles.css）
// 输出 dist/preview.html，双击即可在浏览器离线查看谈判桌全部视觉元素。
import { C } from './src/ui/components.js';
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync(new URL('./src/styles.css', import.meta.url), 'utf8');

// 复刻 game-view.js 的 buildChrome（带样例温度位置与情绪）
function chrome(opp, tempPct, mood, isHell = false) {
  const ringCls = (opp.boss ? 'nego-avatar-ring boss-ring' : 'nego-avatar-ring') + (isHell ? ' hell-ring' : '');
  const chromeCls = 'nego-chrome' + (isHell ? ' hell-chrome' : '');
  const typeLine = (opp.type || '').split('/')[0].trim();
  const indicator = isHell ? `<div class="hell-indicator">🔥 地狱级 · 无上限协议 · Boss 豁免取消</div>` : '';
  return `${indicator}<div class="${chromeCls}">
    <div class="nego-avatar-section">
      <div class="${ringCls} avatar-svg-host">${C.avatarSvg(opp.id)}</div>
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

// 地狱警告弹窗（静态截图样式，无交互）
const hellModalPreview = `<div style="position:relative;height:280px;background:rgba(0,0,0,.82);border-radius:4px;display:flex;align-items:center;justify-content:center">
  <div class="hell-modal" style="position:static">
    <div class="hell-modal-icon">🔥</div>
    <div class="hell-modal-title">地狱级 · 无上限协议</div>
    <div class="hell-modal-body">
      <ul>
        <li>对手让步空间压缩至 <b style="color:var(--red)">45%</b>，强硬度倍增至 <b style="color:var(--red)">1.55×</b></li>
        <li>接受概率下移 <b style="color:var(--red)">−20</b> 点，谈判空间极度压缩</li>
        <li>隐藏 Boss 的豁免被取消——难度修正直接叠加到其极端基础行为上</li>
      </ul>
    </div>
    <div class="hell-modal-btns">
      <button class="btn btn-red" style="min-width:120px">接受挑战</button>
      <button class="btn" style="min-width:80px">撤回</button>
    </div>
  </div>
</div>`;

const OPP_RATIONAL = { id:'rational', name:'陈逻辑', type:'理性分析型 / 利益最大化', boss:false };
const OPP_AGGR     = { id:'aggressive', name:'钢铁王', type:'强硬鹰派型 / 锚定施压', boss:false };
const OPP_BOSS     = { id:'trumpBoss', name:'极限交易者', type:'极限交易型 / 高压锚定型', boss:true };

const ALL_OPPS = [
  { id:'rational',     name:'陈逻辑', type:'理性分析型' },
  { id:'emotional',    name:'林敏感', type:'情感驱动型' },
  { id:'aggressive',   name:'钢铁王', type:'强硬鹰派型' },
  { id:'cooperative',  name:'和谐李', type:'合作共赢型' },
  { id:'manipulative', name:'影子张', type:'操纵控制型' },
  { id:'riskAverse',   name:'稳健吴', type:'风险规避型' },
  { id:'trumpBoss',    name:'极限交易者', type:'极限交易型', boss:true },
];

function avatarGalleryCell(o) {
  return `<div style="text-align:center;padding:8px 4px">
    ${C.avatarBadge(o, 72)}
    <div style="color:var(--white);font-size:12px;font-weight:bold;margin-top:8px">${o.name}</div>
    <div style="color:var(--purple);font-size:10px">${o.type}</div>
  </div>`;
}

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

// 地狱级版 Boss 卡片（红色边框 + 红徽章）
function hellBossCard(o) {
  return `<div class="opp-card boss-card hell-boss">
    <div class="opp-card-avatar">${C.avatarBadge(o, 48)}</div>
    <div class="boss-badge hell" style="display:block;text-align:center;margin-bottom:4px">🔥 地狱 BOSS</div>
    <div class="opp-name" style="text-align:center">${o.name}</div>
    <div class="opp-type" style="text-align:center">${o.type}</div>
    <div class="opp-desc" style="margin:4px 0">极端开价、公开施压、几乎不让步，把每一步都包装成胜负叙事。</div>
    <div style="margin-top:6px;font-size:10px;color:var(--dim)">⚠ 地狱级：难度修正叠加到 Boss 上，无豁免，无上限</div>
  </div>`;
}

// 难度按钮预览
function diffButtons(active) {
  const labels = [['easy','初级',''],['medium','中级',''],['hard','高级',''],['extreme','终局挑战',''],['hell','地狱级','btn-red']];
  return labels.map(([k,l,base]) => {
    const isActive = k === active;
    const activeCls = isActive ? (k==='hell' ? 'active-diff-hell' : 'btn-cyan active-diff') : '';
    return `<button class="btn btn-sm diff-btn ${base} ${activeCls}" style="margin:2px">${l}</button>`;
  }).join('');
}

// 对手选择卡片
function oppCard(o, infoLine, isBoss) {
  return `<div class="opp-card${isBoss?' boss-card':''}">
    <div class="opp-card-avatar">${C.avatarBadge(o, 48)}</div>
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
/* preview-only: mirror body.hell-mode selectors so a scoped container shows the same look */
.hell-mode-demo{border:1px dashed rgba(255,79,106,.25);padding:12px;border-radius:3px}
.hell-mode-demo .tl-current{background:var(--red);border-color:var(--red);animation:hell-pulse-dot 1.1s ease-in-out infinite}
.hell-mode-demo .tl-done{background:rgba(255,79,106,.55);border-color:rgba(255,79,106,.55)}
.hell-mode-demo .bubble-ai{border-color:rgba(255,79,106,.28);background:linear-gradient(135deg,rgba(255,79,106,.05),var(--bg3))}
.hell-mode-demo .bubble-ai .bubble-label{color:var(--red)}
.hell-mode-demo .bubble-player{border-color:rgba(255,79,106,.18);background:rgba(255,79,106,.04)}
.hell-mode-demo .bubble-player .bubble-label{color:#ff9aa8}
.hell-mode-demo .header h1{color:var(--red);text-shadow:0 0 20px rgba(255,79,106,.6)}
</style></head>
<body><div class="container">
<div class="header"><h1>◆ 谈判桌 UI 预览 ◆</h1><div class="sub">PHASE 7 · 可视化谈判桌组件静态预览（样例数据）</div></div>

${section('⓪ 七位角色专属 SVG 头像（含特朗普 Boss）',
  `<div class="preview-note">每个头像为纯 SVG（1–2KB），由 .nego-avatar-ring 提供圆形裁切与光环动画；Boss 自动套金色呼吸光环。</div>
   <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:14px">
     ${ALL_OPPS.map(avatarGalleryCell).join('')}
   </div>`)}

${section('① 谈判桌外壳：对手头像 + 关系温度条（三种温度/情绪/Boss）',
  `<div class="preview-note">滑块位置 = 信任−愤怒映射；Boss 头像为金色光环。在浏览器中光环有呼吸动画。</div>
   ${chrome(OPP_RATIONAL, 81, {trust:0.72,anger:0.1})}
   ${chrome(OPP_AGGR, 28, {trust:0.2,anger:0.64})}
   ${chrome(OPP_BOSS, 50, {trust:0.4,anger:0.4})}`)}

${section('① bis — 地狱级谈判桌（红色氛围 + 烈焰头像环 + 顶部指示条）',
  `<div class="preview-note">地狱级专属：难度指示条脉冲动画 + 红色边框 + 头像红色光环（boss-ring 无效；hell-ring 接管）。</div>
   ${chrome(OPP_BOSS, 22, {trust:0.12,anger:0.85,patience:0.2,confidence:0.55}, true)}`)}

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

${section('⑥ 难度按钮组（地狱级红色，激活态红高亮）',
  `<div class="preview-note">激活的「地狱级」用红色字+红色描边；其它档位激活态保持原青色。</div>
   <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${diffButtons('hell')}</div>
   <div style="font-size:11px;color:var(--dim)">
     初级：显示弱点 &nbsp;|&nbsp; 中级：行为信号 &nbsp;|&nbsp; 高级：信息封锁 &nbsp;|&nbsp; 终局挑战：宗师专属 &nbsp;|&nbsp; <span style="color:var(--red)">地狱级：Boss 无豁免·无上限</span>
   </div>`)}

${section('⑦ 地狱级 Boss 卡片（红色边框 + 红徽章 + 警示）',
  `<div class="preview-note">仅在难度=地狱级且玩家为宗师级时出现；与终局挑战的金色 Boss 卡片做视觉对比。</div>
   <div class="grid2">
     ${oppCard(OPP_BOSS, '未知对手 — 请通过行为判断其类型', true)}
     ${hellBossCard(OPP_BOSS)}
   </div>`)}

${section('⑧ bis — 地狱级警告弹窗（选中地狱级按钮后弹出，需主动确认）',
  `<div class="preview-note">静态预览：实际运行时点击「地狱级」按钮先震动，随后弹出此弹窗；点击背景/撤回 → 回退到终局挑战。</div>
   ${hellModalPreview}`)}

${section('⑨ 结果屏头像头部',
  `<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:6px 0 14px">
     ${C.avatarBadge(OPP_BOSS, 40)}
     <div style="text-align:left">
       <div style="color:var(--white);font-size:13px;font-weight:bold">${OPP_BOSS.name}</div>
       <div style="color:var(--purple);font-size:10px">${OPP_BOSS.type}</div>
     </div>
   </div>`)}

${section('⑩ 地狱模式全局渲染（body.hell-mode 级联：时间线/气泡/头部）',
  `<div class="preview-note">下面用 hell-mode-demo 容器模拟 body.hell-mode 的效果——回合点变红脉冲、AI 气泡红色描边、玩家气泡红粉化、头部 H1 转红。</div>
   <div class="hell-mode-demo">
     <div class="header"><h1>关税战 — 训练结束（地狱级演示）</h1></div>
     ${C.roundTimeline([{}, {}, {}], 5, 3)}
     <div class="bubble-log">
       ${C.dialogBubble('我提出 25% 关税，要么接受，要么走人。', 'ai', `${OPP_BOSS.name} 😡`)}
       ${C.dialogBubble('我需要确认底层数据，能否先暂停 24 小时？', 'player', '你 · 第3轮')}
       ${C.dialogBubble('24 小时也没有，价格只会更糟。', 'ai', `${OPP_BOSS.name} 🔥`)}
     </div>
   </div>`)}

${section('⑪ 地狱戳（结果屏）— 通过 / 失败',
  `<div class="preview-note">仅当难度=地狱级时显示在结果屏头部下方；通过=绿色戳，失败=红色戳。</div>
   <div class="hell-stamp-wrap"><span class="hell-stamp pass">★ 地狱已通过 ★</span></div>
   <div class="hell-stamp-wrap"><span class="hell-stamp">✗ 地狱级 失败 ✗</span></div>`)}

<div style="text-align:center;color:var(--dim);font-size:10px;margin:30px 0 10px">
  此预览由 build_preview.mjs 用真实组件 + 真实样式生成 · 与 dist/game_trainer.html 视觉一致
</div>
</div></body></html>`;

writeFileSync(new URL('./dist/preview.html', import.meta.url), page, 'utf8');
console.log('✓ 预览已生成：dist/preview.html (' + (Buffer.byteLength(page)/1024).toFixed(1) + ' KB)');
