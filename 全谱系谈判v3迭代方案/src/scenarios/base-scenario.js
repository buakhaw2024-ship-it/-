// scenarios/base-scenario.js — 场景抽象基类
// 子类实现 start() 与 handleAction(action)，通过 emitRender/finish 与外界通信。
// v2 增强：initExperience 接入场景变体 / 局势卡 / 反问 / 隐藏目标 / 开场白。

import { EventBus } from '../core/event-bus.js';
import { EVENTS } from '../core/events.js';
import { Store } from '../core/store.js';
import { OpponentAI } from '../engine/opponent-ai.js';
import { Mood } from '../engine/mood.js';
import { chance } from '../engine/util.js';
import { PERSONALITY_TELLS } from '../data/opponents.js';
import { C } from '../ui/components.js';

import { pickScenarioVariantV2, applyVariantMoodBias, renderVariantText } from '../data/scenario-variants-v2.js';
import { getOpponentOpeningLine } from '../data/opponent-lines-v2.js';
import { generateSituationEvents, applySituationChoice } from '../engine/situation-events-v2.js';
import { shouldTriggerCounterQuestion, inferTagsFromAction } from '../engine/counter-questions-v2.js';
import { pickHiddenObjective, resolveHiddenObjective, renderHiddenObjectiveHint } from '../engine/hidden-objectives-v2.js';

const CRAM_MAP = { easy: 0, medium: 0, hard: 1, extreme: 2, hell: 3 };

export class BaseScenario {
  constructor(opp) {
    this.opp = opp;
    this.log = [];
    this.peeksLeft = 2;
    this._peekSnap = null;
    // 蚕食机制（动态锚定 / 中途加码）
    this._cramAttempts = 0;
    this._maxCramAttempts = CRAM_MAP[Store.get('difficulty')] || 0;
    this._cramCooldown = 0;
    this._pendingCram = null;
    // v2 体验增强
    this.scenarioKey = null;
    this.variant = null;
    this.variantParams = {};
    this.hiddenObjective = null;
    this._situationEvents = [];
    this._pendingSituation = null;
    this._pendingQuestion = null;
    this._questionTriggered = false;
    this._experienceNotes = [];
    this._openingLine = '';
  }

  // 子类在 start() 中调用：抽取场景变体、生成事件序列、隐藏目标、开场白
  initExperience(scenarioKey, params = {}) {
    this.scenarioKey = scenarioKey;
    this.variant = pickScenarioVariantV2(scenarioKey, Store.get('difficulty'));
    this.variantParams = params;
    if (this.variant) applyVariantMoodBias(this.opp.id, this.variant);
    this.hiddenObjective = pickHiddenObjective(scenarioKey, this.variant);
    this._situationEvents = generateSituationEvents(scenarioKey, this.variant, Store.get('difficulty'));
    this._openingLine = getOpponentOpeningLine(this.opp);
  }

  // 渲染变体上下文（替换占位符）
  variantContext() {
    if (!this.variant) return '';
    return renderVariantText(this.variant.context, this.opp, this.variantParams);
  }
  variantHint() { return this.variant ? this.variant.hint : ''; }

  // 顶部开场白 + 场景情境块
  experienceBanner() {
    let html = '';
    if (this._openingLine) {
      html += C.dialogBubble(this._openingLine, 'ai', `${this.opp.name} 开场`);
    }
    if (this.variant) {
      html += C.hint(`<b>${this.variant.name}：</b>${this.variantContext()}　<span style="color:var(--dim);font-size:11px">${this.variantHint()}</span>`, 'cyan');
    }
    if (this.hiddenObjective) {
      html += renderHiddenObjectiveHint(this.hiddenObjective);
    }
    return html;
  }

  // ─── 蚕食 ────────────────────────────────────────────────────────
  tryCram(opts = {}) {
    if (this._pendingCram) return this._pendingCram;
    if (this._cramAttempts >= this._maxCramAttempts) return null;
    if (this._cramCooldown > 0) { this._cramCooldown -= 1; return null; }
    const opp = this.opp;
    const canCram = opp.boss || opp.id === 'aggressive' || opp.id === 'manipulative';
    if (!canCram) return null;
    const round = opts.round != null ? opts.round : 0;
    const totalRounds = opts.totalRounds || 5;
    const midGame = round >= 1 && round <= totalRounds - 2;
    if (!midGame) return null;
    const triggerChance = Math.min(0.6, (this._cramAttempts + 1) / (this._maxCramAttempts + 2));
    if (!chance(triggerChance)) return null;
    this._cramAttempts += 1;
    this._cramCooldown = 2;
    this._pendingCram = { text: opts.text || '', kind: opts.kind || 'generic' };
    return this._pendingCram;
  }

  cramControls() {
    if (!this._pendingCram) return '';
    const cram = this._pendingCram;
    return C.hint(`<b>⚠ ${this.opp.name} 中途加码：</b>${cram.text}`, 'red') +
      `<div class="grid2" style="margin:8px 0">` +
        C.actionBtn('resist-cram', '', '<b>🛡 拒绝额外条件</b>（坚守原框架）', 'btn-red') +
        C.actionBtn('accept-cram', '', '<b>🤝 接受新条件</b>（推进谈判）', 'btn-green') +
      `</div>`;
  }

  consumeCram() {
    const c = this._pendingCram;
    this._pendingCram = null;
    return c;
  }

  // ─── 局势卡 ──────────────────────────────────────────────────────
  checkSituationEvent() {
    if (this._pendingSituation) return this._pendingSituation;
    if (!this._situationEvents || !this._situationEvents.length) return null;
    const total = this.rounds || (this.stages ? this.stages.length : 5);
    const now = this.round != null ? this.round : (this.stage || 0);
    const progress = total > 0 ? now / total : 0;
    const next = this._situationEvents.find((e) => !e.triggered && progress >= e.triggerAt);
    if (!next) return null;
    next.triggered = true;
    this._pendingSituation = next;
    if (EVENTS.EXPERIENCE_EVENT_TRIGGERED) {
      EventBus.emit(EVENTS.EXPERIENCE_EVENT_TRIGGERED, { scenarioKey: this.scenarioKey, event: next });
    }
    return next;
  }

  renderSituationEvent() {
    const ev = this._pendingSituation;
    if (!ev) return '';
    return C.panel(`局势卡｜${ev.title}`,
      C.hint(ev.text, 'yellow') +
      ev.choices.map((ch, idx) =>
        C.actionBtn('situation', String(idx),
          `<b>${ch.text}</b><br><span style="color:var(--dim);font-size:10px">${ch.desc || ''}</span>`)
      ).join('')
    );
  }

  handleSituationChoice(value) {
    const ev = this._pendingSituation;
    if (!ev) return false;
    const choice = ev.choices[parseInt(value, 10)];
    if (!choice) return false;
    applySituationChoice(this, choice);
    ev.resolved = true;
    this._pendingSituation = null;
    this.log.push({
      round: (this.round || this.stage || 0) + 1,
      systemEvent: true,
      eventTitle: ev.title,
      choiceText: choice.text,
      tags: choice.tags || [],
    });
    if (EVENTS.EXPERIENCE_EVENT_RESOLVED) {
      EventBus.emit(EVENTS.EXPERIENCE_EVENT_RESOLVED, { scenarioKey: this.scenarioKey, event: ev, choice });
    }
    this._render();
    return true;
  }

  // ─── 对手反问 ────────────────────────────────────────────────────
  renderCounterQuestion() {
    const q = this._pendingQuestion;
    if (!q) return '';
    return C.panel(`${this.opp.name} 的反问`,
      C.dialogBubble(q.text, 'ai', `${this.opp.name} 追问`) +
      q.choices.map((ch, idx) =>
        C.actionBtn('counter-question', String(idx),
          `<b>${ch.text}</b><br><span style="color:var(--dim);font-size:10px">${ch.desc || ''}</span>`)
      ).join('')
    );
  }

  handleCounterQuestion(value) {
    const q = this._pendingQuestion;
    if (!q) return false;
    const choice = q.choices[parseInt(value, 10)];
    if (!choice) return false;
    applySituationChoice(this, choice);
    this._pendingQuestion = null;
    this.log.push({
      round: (this.round || this.stage || 0) + 1,
      counterQuestion: true,
      questionText: q.text,
      answerText: choice.text,
      tags: choice.tags || [],
    });
    if (EVENTS.OPPONENT_QUESTION_RESOLVED) {
      EventBus.emit(EVENTS.OPPONENT_QUESTION_RESOLVED, { scenarioKey: this.scenarioKey, question: q, choice });
    }
    this._render();
    return true;
  }

  // 子类玩家正常动作后调用：可能触发对手反问
  maybeAskCounterQuestion(type, value) {
    const tags = inferTagsFromAction(type, value);
    const q = shouldTriggerCounterQuestion(this, tags);
    if (q) { this._render(); return true; }
    return false;
  }

  // ─── 通用动作拦截 ────────────────────────────────────────────────
  // 子类 handleAction 在解析自身动作前调用，处理通用 v2 交互
  interceptCommonAction(type, value) {
    if (type === 'peek') { this.handlePeek(); return true; }
    if (type === 'situation') {
      if (this.handleSituationChoice(value)) return true;
    }
    if (type === 'counter-question') {
      if (this.handleCounterQuestion(value)) return true;
    }
    return false;
  }

  // ─── 渲染：通用顶部块 ────────────────────────────────────────────
  emitRender(html) {
    EventBus.emit(EVENTS.GAME_RENDER, { html });
  }

  // ─── 结束 ────────────────────────────────────────────────────────
  finish(result) {
    result.variant = this.variant || null;
    result.experienceNotes = this._experienceNotes || [];
    result.hiddenObjective = resolveHiddenObjective(this, result);
    EventBus.emit(EVENTS.GAME_END, { result });
  }

  // ─── peek ────────────────────────────────────────────────────────
  peekControls() {
    const label = this.peeksLeft > 0 ? `🔍 识破对手（剩 ${this.peeksLeft} 次）` : '🔍 识破次数已用完';
    let html = C.actionBtn('peek', '', label, 'btn-purple');
    if (this._peekSnap) {
      const m = this._peekSnap.mood;
      const pct = (x) => Math.round(x * 100);
      const tells = (PERSONALITY_TELLS[this.opp.id] || []).join(' / ');
      const deceptive = this._peekSnap.deceptive
        ? `<div style="color:var(--red);font-size:10px;margin-top:4px">⚠ 高难度对手可能伪装情绪，数据仅供参考</div>` : '';
      html += C.hint(
        `<b>读心快照：</b>信任 ${pct(m.trust)}% · 愤怒 ${pct(m.anger)}% · 耐心 ${pct(m.patience)}% · 自信 ${pct(m.confidence)}%<br><span style="color:var(--dim)">行为信号：${tells}</span>${deceptive}`,
        'purple');
    }
    return html;
  }

  handlePeek() {
    if (this.peeksLeft > 0 && !this._peekSnap) {
      this.peeksLeft -= 1;
      const deceptive = Mood.isDeceptionActive();
      const realSnap = OpponentAI.snapshot(this.opp.id);
      const mood = deceptive
        ? Mood.getDeceptiveSnapshot(this.opp.id, this.opp)
        : { ...realSnap.mood };
      this._peekSnap = {
        mood,
        realMood: { ...realSnap.mood },
        deceptive,
      };
    }
    this._render();
  }

  start() { throw new Error('start() not implemented'); }
  handleAction(_action) { throw new Error('handleAction() not implemented'); }
}
