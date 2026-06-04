// ui/components.js — 纯 HTML 片段构造器（无 DOM 操作，仅返回字符串）
// 被 screens 与 scenarios 复用。游戏内交互元素统一带 data-game-action / data-value，
// 由 game-view 的事件委托翻译成 player:action 事件。

import { avatarSvg } from './avatars.js';
import { Mood } from '../engine/mood.js';
import { loadReputation } from '../engine/reputation.js';
import { Store } from '../core/store.js';
import { clamp } from '../engine/util.js';

export const C = {
  // 对手头像 emoji 映射（保留为 fallback / 角色徽章场景）
  avatarEmoji(oppId) {
    const MAP = {
      rational: '🧮', emotional: '🌊', aggressive: '🦅',
      cooperative: '🤝', manipulative: '🎭', riskAverse: '🛡️', trumpBoss: '👑',
    };
    return MAP[oppId] || '🤝';
  },

  // 角色专属风格化 SVG 头像（无外部资源）
  avatarSvg(oppId) {
    return avatarSvg(oppId);
  },

  // 独立头像徽章（结果屏等处复用）—— 使用 SVG 头像
  avatarBadge(opp, size = 44) {
    if (!opp) return '';
    const ringCls = opp.boss ? 'nego-avatar-ring boss-ring' : 'nego-avatar-ring';
    return `<div class="${ringCls} avatar-svg-host" style="width:${size}px;height:${size}px">${this.avatarSvg(opp.id)}</div>`;
  },

  panel(title, body) {
    return `<div class="panel"><div class="panel-title">${title}</div>${body}</div>`;
  },

  hint(text, kind = 'cyan') {
    return `<div class="hint hint-${kind}">${text}</div>`;
  },

  scoreBox(num, label, color) {
    const style = color ? ` style="color:${color}"` : '';
    return `<div class="score-box"><div class="score-num"${style}>${num}</div><div class="score-lbl">${label}</div></div>`;
  },

  bar(label, val, colorClass = 'bar-cyan') {
    const pct = Math.round(Math.min(1, Math.max(0, val)) * 100);
    return `<div class="bar-wrap">
      <div class="bar-label"><span>${label}</span><span>${pct}%</span></div>
      <div class="bar-bg"><div class="bar-fill ${colorClass}" style="width:${pct}%"></div></div>
    </div>`;
  },

  infoRow(key, val) {
    return `<div class="info-row"><span class="info-key">${key}</span><span class="info-val">${val}</span></div>`;
  },

  tag(text, cls = 'tag-cyan') {
    return `<span class="tag ${cls}">${text}</span>`;
  },

  outcomeBadge(outcome) {
    const map = {
      win:  ['outcome-win', '胜利'],
      lose: ['outcome-lose', '败北'],
      draw: ['outcome-draw', '平局'],
      coop: ['outcome-coop', '合作双赢'],
    };
    const [cls, label] = map[outcome] || ['outcome-draw', outcome];
    return `<span class="outcome ${cls}">${label}</span>`;
  },

  // 对局内的页眉（含退出按钮）
  gameHeader(title) {
    return `<div class="flex-between">
      <div class="section-title">${title}</div>
      <button class="back-btn" data-game-action="exit">✕ 退出</button>
    </div>`;
  },

  // 对局内的动作按钮：点击经委托发出 player:action {type:action, value}
  actionBtn(action, value, html, extraClass = '') {
    return `<button class="choice-btn ${extraClass}" data-game-action="${action}" data-value="${value}">${html}</button>`;
  },

  // 回合日志容器
  logBox(title, entriesHtml) {
    if (!entriesHtml) return '';
    return `<div class="panel"><div class="panel-title">${title}</div><div class="log">${entriesHtml}</div></div>`;
  },

  // 将情绪状态映射为直觉表情（用于 AI 气泡标签）
  moodEmoji(mood) {
    if (!mood) return '';
    const { trust = 0, anger = 0, patience = 0, confidence = 0 } = mood;
    if (anger > 0.72) return '😠';
    if (anger > 0.50 && trust < 0.40) return '😤';
    if (trust > 0.72) return '😊';
    if (trust > 0.50 && anger < 0.35) return '🤝';
    if (patience < 0.25) return '⏰';
    if (confidence > 0.75) return '😎';
    return '🤔';
  },

  // 对话气泡：who='ai'|'player'|'system'
  dialogBubble(text, who = 'ai', label = '') {
    if (!text) return '';
    if (who === 'system') {
      return `<div class="bubble-row"><div class="bubble bubble-system">${label ? `<div class="bubble-label">${label}</div>` : ''}<div class="bubble-text">${text}</div></div></div>`;
    }
    return `<div class="bubble-row bubble-row-${who}">
      <div class="bubble bubble-${who}">
        ${label ? `<div class="bubble-label">${label}</div>` : ''}
        <div class="bubble-text">${text}</div>
      </div>
    </div>`;
  },

  // 回合时间线（圆点轨）
  roundTimeline(log, total, current) {
    const done = log ? log.length : 0;
    const dots = Array.from({ length: total }, (_, i) => {
      const cls = i < done ? 'tl-done' : i === current ? 'tl-current' : 'tl-pending';
      return `<div class="tl-dot ${cls}" title="第${i + 1}轮"></div>`;
    }).join('');
    return `<div class="round-timeline"><div class="tl-label">第${current + 1}/${total}轮 <button class="info-tip-btn" data-itip="rounds" title="回合说明">ℹ</button></div><div class="tl-dots">${dots}</div></div>`;
  },

  // 关系温度计：显式展示对手 Mood + 跨局记忆，高难度提示伪装
  relationshipPanel(opp) {
    if (!opp) return '';
    const mood = Mood.get(opp.id);
    const rep = loadReputation(opp.id);
    const diff = Store.get('difficulty') || 'medium';
    const pct = (n) => Math.round(clamp(n || 0, 0, 1) * 100);
    const memText = rep.games >= 2
      ? `已交手 ${rep.games} 次 · 上局：${rep.lastOutcome || '—'} · 历史合作率 ${Math.round((rep.coopRate || 0.5) * 100)}%`
      : '首次或低样本交手 · 对手尚未完全建档';
    const warn = (diff === 'hell' || diff === 'extreme')
      ? '<div style="font-size:10px;color:var(--red);margin-top:4px">⚠ 高难度下，对手可能伪装情绪，状态仅供参考。</div>'
      : (diff === 'hard' ? '<div style="font-size:10px;color:var(--dim);margin-top:4px">状态估计存在误差。</div>' : '');
    return `<div class="panel relationship-panel" style="padding:10px 12px">
      <div class="panel-title">对手状态监测</div>
      ${this.bar('信任', (mood.trust || 0), 'bar-green')}
      ${this.bar('愤怒', (mood.anger || 0), 'bar-red')}
      ${this.bar('耐心', (mood.patience || 0), 'bar-yellow')}
      ${this.bar('自信', (mood.confidence || 0), 'bar-purple')}
      <div style="font-size:10px;color:var(--dim);margin-top:6px">${memText}</div>
      ${warn}
    </div>`;
  },

  // 阶段进度条（用于危机/联盟等多阶段场景）
  stageProgress(current, total) {
    const dots = Array.from({ length: total }, (_, i) => {
      const cls = i < current ? 'tl-done' : i === current ? 'tl-current' : 'tl-pending';
      return `<div class="tl-dot ${cls}" title="第${i + 1}阶段"></div>`;
    }).join('');
    return `<div class="round-timeline"><div class="tl-label">阶段${current + 1}/${total} <button class="info-tip-btn" data-itip="rounds" title="阶段说明">ℹ</button></div><div class="tl-dots">${dots}</div></div>`;
  },

  // 对手情绪曲线（信任/愤怒随回合演化）—— 内联 SVG
  moodSparkline(series) {
    if (!series || !series.length) return '';
    const W = 280, H = 48, n = series.length;
    const x = (i) => (n > 1 ? (i / (n - 1)) * (W - 8) + 4 : W / 2);
    const y = (v) => (H - 4) - v * (H - 8);
    const line = (key, color) => {
      const pts = series.map((m, i) => `${x(i).toFixed(0)},${y(m[key] || 0).toFixed(0)}`).join(' ');
      const dots = series.map((m, i) => `<circle cx="${x(i).toFixed(0)}" cy="${y(m[key] || 0).toFixed(0)}" r="2" fill="${color}"/>`).join('');
      return `<polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/>${dots}`;
    };
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="background:var(--bg);border:1px solid var(--border);border-radius:3px">
      ${line('trust', 'var(--cyan)')}${line('anger', 'var(--red)')}
    </svg>
    <div style="font-size:10px;color:var(--dim);margin-top:2px">— 信任(青) ／ — 愤怒(红)　对手情绪随回合演化</div>`;
  },
};
