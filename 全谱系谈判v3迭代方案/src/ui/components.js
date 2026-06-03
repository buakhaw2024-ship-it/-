// ui/components.js — 纯 HTML 片段构造器（无 DOM 操作，仅返回字符串）
// 被 screens 与 scenarios 复用。游戏内交互元素统一带 data-game-action / data-value，
// 由 game-view 的事件委托翻译成 player:action 事件。

export const C = {
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
