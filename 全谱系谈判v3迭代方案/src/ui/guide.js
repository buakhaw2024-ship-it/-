// ui/guide.js — UI 交互引导系统（新手导览 + 各屏快速提示）
// 首次访问每屏自动触发；右下角 ? 按钮随时重触。
// 无外部依赖，纯 DOM + localStorage。

const _GUIDE_KEY = 'gts_guide_';

function _isDone(id) {
  try { return !!localStorage.getItem(_GUIDE_KEY + id); } catch (e) { return false; }
}
function _markDone(id) {
  try { localStorage.setItem(_GUIDE_KEY + id, '1'); } catch (e) {}
}

// ── Tour 内容（对应说明书各章节）──────────────────────────────────────────────
const _TOURS = {
  welcome: [
    {
      title: '🎮 欢迎使用全谱系博弈演练系统 v3',
      body: '融合博弈理论 × 谈判心理学 × 泡泡马特集卡，覆盖 <b>7 大博弈场景</b>、<b>7 位对手</b>、<b>5 档难度</b>。<br>本引导约 1 分钟，帮你快速上手系统。',
      position: 'center',
    },
    {
      selector: '#player-name-input',
      title: '① 输入训练代号',
      body: '代号是你的唯一标识，用于保存本地档案（<b>无需注册</b>）。<br>每个代号对应独立的心理画像、战绩和卡牌收藏。<br>建议起一个有辨识度的名字，例如 "谈判精英"。',
      position: 'bottom',
    },
    {
      selector: '#btn-enter',
      title: '② 进入系统',
      body: '输入代号后点击此按钮（或按 Enter）进入主菜单。<br>若代号已存在，系统自动加载历史档案，<b>兼容 v2.0 存档</b>。',
      position: 'top',
    },
  ],

  main: [
    {
      title: '📋 主菜单 · 六大功能导览',
      body: '系统核心入口，包含训练、分析、理论和收藏四大模块。<br><b>推荐新手路径</b>：① 场景实战 → ③ 策略理论库 → ④ 心理档案分析',
      position: 'center',
    },
    {
      selector: '[data-idx="0"]',
      title: '① 场景实战训练',
      body: '<b>7 大博弈场景</b>，每局 15~25 分钟：<br>囚徒困境 · 最后通牒 · 信任博弈 · 砍价谈判<br>危机谈判 · 公共品博弈 · 联盟博弈<br><b>新手建议从囚徒困境（初级）开始</b>，逐步解锁高难场景。',
      position: 'bottom',
    },
    {
      selector: '[data-idx="1"]',
      title: '② 快速训练模式',
      body: '系统随机分配场景 + 对手，<b>无需手动选择</b>。<br>适合碎片时间训练，同样计入成绩、心理档案和卡牌解锁，是提升局数的最快方式。',
      position: 'bottom',
    },
    {
      selector: '[data-idx="2"]',
      title: '③ 策略理论库',
      body: '收录 4 大板块：<br><b>策略卡牌</b> · <b>沟通技术</b> · <b>心理防御手册</b> · <b>六大宗师理论</b><br>孙子、马基雅维利、拉法、费舍尔等宗师系统收录其中。<br>遇到反复败北的场景，先查阅对应宗师理论。',
      position: 'bottom',
    },
    {
      selector: '[data-idx="3"]',
      title: '④ 心理档案分析',
      body: '<b>8 维博弈心理画像</b>：合作性 · 冒险性 · 公平感 · 信任度<br>情绪控制 · 自信心 · 策略性 · 适应性<br>系统根据历史决策序列动态计算，<b>10 局后趋于准确</b>，可识别你属于 6 种谈判类型中的哪一种。',
      position: 'top',
    },
    {
      selector: '[data-idx="4"]',
      title: '⑤ 训练成绩看板',
      body: '查看历史战绩、胜率曲线和场景专项统计。<br><b>军衔系统（16 级）</b>：新兵 → 士兵 → … → 宗师<br>达到 <b>宗师级</b> 后解锁隐藏 Boss（极限交易者）和地狱难度。',
      position: 'top',
    },
    {
      selector: '[data-idx="5"]',
      title: '⑥ 卡牌收藏册（泡泡马特联名）',
      body: '共 <b>30 张</b>联名卡，4 种稀有度：<br><b style="color:#9ca3af">R</b> 普通 &nbsp;·&nbsp; <b style="color:#6ecfff">SR</b> 稀有 &nbsp;·&nbsp; <b style="color:#c084fc">SSR</b> 超稀有 &nbsp;·&nbsp; <b style="color:#ffd700">SP</b> 限定<br>每局结束后自动检测解锁条件，以<b>盲盒开箱动画</b>展示新卡。',
      position: 'top',
    },
  ],

  'scenario-select': [
    {
      title: '🗺️ 选择训练场景',
      body: '7 个场景覆盖不同博弈类型，每个场景侧重不同谈判技能维度。<br><b>推荐训练顺序</b>：囚徒困境 → 最后通牒 → 信任博弈 → 砍价谈判 → 危机谈判 → 公共品博弈 → 联盟博弈',
      position: 'center',
    },
    {
      selector: '.diff',
      title: '场景难度标签',
      body: '每个场景有内置基础难度（与训练难度叠加计算）：<br><span style="color:#00ff9f">■ 初级</span> 合作导向，门槛较低<br><span style="color:#ffd700">■ 中级</span> 混合博弈，需要判断对手意图<br><span style="color:#ff4f6a">■ 高级</span> 零和竞争，决策压力大<br>点击任意场景卡片继续选择对手。',
      position: 'bottom',
    },
  ],

  'opponent-select': [
    {
      title: '🧑‍💼 对手选择 · 先设难度再选对手',
      body: '难度影响 AI 策略强度、让步空间和信息透明度。<br>建议先在上方选好难度，再选择对手开始对局。',
      position: 'center',
    },
    {
      selector: '#diff-btns',
      title: '训练难度（5 档）',
      body: '<b>初级</b>：显示对手弱点，辅助信息完整<br><b>中级</b>：显示行为信号，需自行判断<br><b>高级</b>：信息封锁，完全依赖观察<br><b>终局挑战</b>：宗师级专属，AI 最强参数<br><b style="color:#ff4f6a">地狱级</b>：让步空间压至 45%，难度无上限，Boss 无豁免（需宗师级）',
      position: 'bottom',
    },
    {
      selector: '.opp-card',
      title: '7 位对手（泡泡马特联名角色）',
      body: '<b>陈逻辑</b>（理性·Skullpanda）— 数学最优，策略稳健<br><b>林敏感</b>（情绪·Crybaby）— 情绪波动，可被激将<br><b>钢铁王</b>（强硬·Molly）— 强硬开场，让步极少<br><b>和谐李</b>（合作·Dimoo）— 追求共赢，善于倾听<br><b>影子张</b>（操控·Pucky）— 善用信息不对称<br><b>稳健吴</b>（风险规避·Hirono）— 规避极端，稳健推进<br><b>极限交易者</b>（隐藏 Boss）— 需宗师级 + 终局挑战解锁',
      position: 'right',
    },
  ],

  game: [
    {
      title: '⚡ 对局进行中 · 核心操作说明',
      body: '• <b>上方对手区</b>：头像 + 情绪温度计（红→黄→绿，越绿越友好）<br>• <b>圆点进度条</b>：当前轮次，实心=已完成<br>• <b>对话气泡</b>：AI 的言行是重要线索<br>• <b>下方选择区</b>：每轮点击选择你的策略<br><b>关键</b>：关注对手情绪走势，在恰当时机让步或强硬。',
      position: 'center',
    },
  ],

  result: [
    {
      title: '📊 对局结果 · 解读与卡牌奖励',
      body: '• <b>结局标签</b>：胜利 / 失败 / 平局 / 合作共赢<br>• <b>关键指标</b>：报价/得分 + 对话轮次复盘<br>• <b>战绩更新</b>：军衔、胜率实时同步<br>• <b>卡牌解锁</b>：若满足条件将触发盲盒开箱动画 🎁<br>• 地狱级对局另有<b>地狱印章</b>（通过/失败）标注。',
      position: 'center',
    },
  ],

  strategy: [
    {
      title: '📚 策略理论库 · 四大模块',
      body: '<b>策略卡牌</b>：各博弈类型的核心策略（含适用场景）<br><b>沟通技术</b>：锚定、框架、积极倾听等 17 种技巧<br><b>心理防御</b>：12 种反操控技术，识别对手心理战术<br><b>六大宗师</b>：孙子、马基雅维利、拉法、费舍尔…<br>每位宗师包含完整策略体系，点击卡片深入阅读。',
      position: 'center',
    },
  ],

  psychology: [
    {
      title: '🧠 心理档案 · 8 维博弈心理画像',
      body: '8 个维度，每维 0~100 分：<br><b>合作性 · 冒险性 · 公平感 · 信任度</b><br><b>情绪控制 · 自信心 · 策略性 · 适应性</b><br>系统据此判定你属于 6 种类型（竞争型/合作型/战略型/适应型/情绪型/平衡型）之一。<br><b>10 局后分析趋于准确</b>，建议定期查看。',
      position: 'center',
    },
  ],

  dashboard: [
    {
      title: '📈 训练成绩看板',
      body: '实时展示全量训练数据：<br>• <b>总战绩</b>：胜/平/负及胜率趋势<br>• <b>当前军衔</b>：16 级晋升体系（新兵 → 宗师）<br>• <b>场景专项</b>：各场景独立胜率分布<br>• <b>近期对局</b>：详细对局摘要复盘<br>军衔达 <b>宗师级</b> 后解锁 Boss + 地狱难度。',
      position: 'center',
    },
  ],

  'card-album': [
    {
      title: '🃏 泡泡马特联名卡牌 · 30 张全收集',
      body: '4 种稀有度的解锁方式：<br><b style="color:#9ca3af">R</b> 普通 — 完成对局自动解锁<br><b style="color:#6ecfff">SR</b> 稀有 — 在特定场景获胜或达到场景专属条件<br><b style="color:#c084fc">SSR</b> 超稀有 — 累计多局特定行为成就<br><b style="color:#ffd700">SP</b> 限定 — 地狱胜利 / 击败 Boss / 极限成就<br>未解锁的卡显示锁定灰色状态。',
      position: 'center',
    },
    {
      selector: '.album-grid',
      title: 'SP 限定卡解锁条件（挑战目标）',
      body: '<b>地狱宗师卡</b>：地狱难度胜利累计 3 次<br><b>终极 Boss 征服者</b>：击败极限交易者 2 次<br><b>纯粹合作者</b>：公共品博弈纯合作通关 5 次<br><b>地狱合作主义者</b>：地狱难度下纯合作通关<br><b>全知牌手</b>：累计正确读牌 10 次<br>悬停已解锁的卡片可见发光效果 ✨',
      position: 'top',
    },
  ],
};

// ── State ─────────────────────────────────────────────────────────────────────
let _gDim = null, _gSpot = null, _gTip = null, _gHelp = null;
let _gScreen = '', _gSteps = [], _gIdx = 0, _gActive = false;

// ── Helpers ──────────────────────────────────────────────────────────────────
function _rmEl(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

function _cleanTour() {
  _gActive = false;
  _rmEl(_gDim); _rmEl(_gSpot); _rmEl(_gTip);
  _gDim = _gSpot = _gTip = null;
}

function _rmHelp() { _rmEl(_gHelp); _gHelp = null; }

function _positionTip(targetEl, pos) {
  if (!targetEl || pos === 'center') {
    Object.assign(_gTip.style, {
      left: '50%', top: '50%', transform: 'translate(-50%,-50%)', right: '', bottom: '',
    });
    return;
  }
  _gTip.style.transform = '';
  const r = targetEl.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const TW = 350, TH = 260, M = 14;
  let left, top;
  if (pos === 'bottom') { top = r.bottom + M; left = r.left + r.width / 2 - TW / 2; }
  else if (pos === 'top') { top = r.top - TH - M; left = r.left + r.width / 2 - TW / 2; }
  else if (pos === 'right') { left = r.right + M; top = r.top + r.height / 2 - TH / 2; }
  else { left = r.left - TW - M; top = r.top + r.height / 2 - TH / 2; }
  left = Math.max(8, Math.min(left, vw - TW - 8));
  top = Math.max(8, Math.min(top, vh - TH - 8));
  Object.assign(_gTip.style, { left: left + 'px', top: top + 'px', right: '', bottom: '' });
}

function _renderStep(i) {
  _gIdx = i;
  const step = _gSteps[i];
  const isLast = i === _gSteps.length - 1;

  let targetEl = null;
  if (step.selector) targetEl = document.querySelector(step.selector);

  // Spotlight: box-shadow trick creates dim with transparent hole at target
  if (targetEl) {
    if (!_gSpot) {
      _gSpot = document.createElement('div');
      _gSpot.className = 'guide-spotlight';
      document.body.appendChild(_gSpot);
    }
    if (_gDim) _gDim.style.background = 'transparent';
    const r = targetEl.getBoundingClientRect();
    const P = 8;
    Object.assign(_gSpot.style, {
      display: 'block',
      left: (r.left - P) + 'px', top: (r.top - P) + 'px',
      width: (r.width + P * 2) + 'px', height: (r.height + P * 2) + 'px',
    });
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    if (_gSpot) _gSpot.style.display = 'none';
    if (_gDim) _gDim.style.background = 'rgba(0,0,0,0.72)';
  }

  const prevBtn = i > 0 ? `<button class="guide-btn guide-btn-sec" id="g-prev">← 上一步</button>` : '';
  const mainBtn = isLast
    ? `<button class="guide-btn guide-btn-pri" id="g-done">完成引导 ✓</button>`
    : `<button class="guide-btn guide-btn-pri" id="g-next">下一步 →</button>`;

  _gTip.innerHTML = `
    <div class="guide-tip-head">
      <span class="guide-tip-count">${i + 1} / ${_gSteps.length}</span>
      <button class="guide-skip-x" id="g-skip" title="跳过引导">✕</button>
    </div>
    <div class="guide-tip-title">${step.title}</div>
    <div class="guide-tip-body">${step.body}</div>
    <div class="guide-tip-btns">${prevBtn}${mainBtn}</div>
  `;

  _positionTip(targetEl, step.position || 'bottom');

  const nx = document.getElementById('g-next');
  const pv = document.getElementById('g-prev');
  const dn = document.getElementById('g-done');
  const sk = document.getElementById('g-skip');
  if (nx) nx.onclick = () => _renderStep(i + 1);
  if (pv) pv.onclick = () => _renderStep(i - 1);
  if (dn) dn.onclick = _finishTour;
  if (sk) sk.onclick = _finishTour;
}

function _finishTour() {
  _markDone(_gScreen);
  _cleanTour();
  _addHelpBtn();
}

function _addHelpBtn() {
  _rmHelp();
  if (!_TOURS[_gScreen]) return;
  _gHelp = document.createElement('button');
  _gHelp.className = 'guide-help-btn';
  _gHelp.textContent = '?';
  _gHelp.title = '重看操作引导';
  _gHelp.addEventListener('click', function () { _startTour(_gScreen); });
  document.body.appendChild(_gHelp);
}

function _startTour(screenId) {
  if (_gActive) _cleanTour();
  _gScreen = screenId;
  _gSteps = _TOURS[screenId];
  _gActive = true;
  _rmHelp();

  _gDim = document.createElement('div');
  _gDim.className = 'guide-dim';
  document.body.appendChild(_gDim);

  _gTip = document.createElement('div');
  _gTip.className = 'guide-tooltip';
  document.body.appendChild(_gTip);

  _renderStep(0);
}

// ── Public API ────────────────────────────────────────────────────────────────

// Called by router after each screen render.
// Shows tour automatically on first visit; otherwise shows ? help button only.
function showTour(screenId) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  _cleanTour();
  _rmHelp();
  _gScreen = screenId;
  if (!_TOURS[screenId]) return;
  if (_isDone(screenId)) {
    _addHelpBtn();
    return;
  }
  // Slight delay to let DOM settle after screen render
  setTimeout(function () { _startTour(screenId); }, 380);
}

// Called by router before each screen render to clear any active guide.
function hideGuide() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  _cleanTour();
  _rmHelp();
}
