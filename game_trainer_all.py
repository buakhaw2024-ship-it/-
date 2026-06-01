#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全谱系博弈实战演练系统 — 单文件版
pip install rich  &&  python game_trainer_all.py
"""
import sys, random, json, os, time
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
from enum import Enum
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.prompt import Prompt, IntPrompt
from rich import box
from rich.rule import Rule
from rich.align import Align


# ========================================================================
# opponents.py
# ========================================================================




class PersonalityType(Enum):
    RATIONAL    = "理性分析型"
    EMOTIONAL   = "情感驱动型"
    AGGRESSIVE  = "强硬鹰派型"
    COOPERATIVE = "合作共赢型"
    MANIPULATOR = "操纵控制型"
    RISK_AVERSE = "风险规避型"


@dataclass
class OpponentState:
    trust_level: float = 0.5       # 0=distrust, 1=full trust
    anger_level: float = 0.0       # 0=calm, 1=furious
    satisfaction: float = 0.5      # 0=dissatisfied, 1=satisfied
    concession_budget: float = 1.0 # remaining willingness to concede


PERSONALITY_PROFILES = {
    PersonalityType.RATIONAL: {
        "description": "冷静计算，追求纳什均衡，理性分析每个选择的期望收益。",
        "traits": ["逻辑严密", "不受情绪影响", "偏好确定性收益", "长期视角"],
        "weakness": "有时显得冷酷无情，难以建立感情联系",
        "tells": ["沉默时间长", "要求看数据", "常问'这对双方有何收益'"],
        "coop_base": 0.45,
        "concession_rate": 0.12,
        "bluff_rate": 0.05,
    },
    PersonalityType.EMOTIONAL: {
        "description": "决策受情绪影响显著，对不公平极为敏感，重视关系和面子。",
        "traits": ["感情丰富", "重视公平", "易受激惹", "关系导向"],
        "weakness": "情绪化决策，容易被激怒或感化",
        "tells": ["语气变化明显", "提及'感受'", "对低报价愤怒反应"],
        "coop_base": 0.60,
        "concession_rate": 0.20,
        "bluff_rate": 0.15,
    },
    PersonalityType.AGGRESSIVE: {
        "description": "高压强硬策略，极少让步，以威胁和强硬立场主导谈判。",
        "traits": ["强势主导", "极少妥协", "使用威胁", "争取最大利益"],
        "weakness": "过度强硬会破坏合作机会，难以达成双赢",
        "tells": ["频繁使用最后通牒", "声称'不谈了'", "快速回应不思考"],
        "coop_base": 0.20,
        "concession_rate": 0.05,
        "bluff_rate": 0.40,
    },
    PersonalityType.COOPERATIVE: {
        "description": "追求互利共赢，倾向于合作，相信通过合作能创造更大价值。",
        "traits": ["合作导向", "乐于让步", "建立信任", "长期关系"],
        "weakness": "可能被强硬对手过度压榨",
        "tells": ["主动提出折衷方案", "询问对方需求", "强调'双赢'"],
        "coop_base": 0.80,
        "concession_rate": 0.25,
        "bluff_rate": 0.02,
    },
    PersonalityType.MANIPULATOR: {
        "description": "善用心理战术，先建立信任再伺机利用，擅长框架效应和锚定。",
        "traits": ["策略性信任建立", "心理操控", "善用框架效应", "伺机而动"],
        "weakness": "一旦被识破，完全失去信任",
        "tells": ["过度友好的开场", "选择性披露信息", "制造虚假紧迫感"],
        "coop_base": 0.65,
        "concession_rate": 0.18,
        "bluff_rate": 0.55,
    },
    PersonalityType.RISK_AVERSE: {
        "description": "极度规避风险，偏好确定性结果，宁可少得也要稳妥。",
        "traits": ["保守稳健", "回避不确定性", "偏好保证", "容易达成协议"],
        "weakness": "过于保守，可能错失高收益机会",
        "tells": ["频繁寻求保证", "偏好书面确认", "对不确定表达焦虑"],
        "coop_base": 0.70,
        "concession_rate": 0.22,
        "bluff_rate": 0.08,
    },
}


class Opponent:
    def __init__(self, personality: PersonalityType, name: str = None):
        self.personality = personality
        self.profile = PERSONALITY_PROFILES[personality]
        self.name = name or personality.value
        self.state = OpponentState()
        self.history: List[str] = []
        self.round_num = 0

    def decide_prisoners_dilemma(self, player_history: List[str]) -> str:
        """Decide cooperate/defect in prisoner's dilemma."""
        self.round_num += 1
        p = self.personality

        if p == PersonalityType.RATIONAL:
            if self.round_num == 1:
                return "合作" if random.random() < 0.6 else "背叛"
            last = player_history[-1] if player_history else "合作"
            return last  # Tit-for-tat with occasional defection

        elif p == PersonalityType.EMOTIONAL:
            if self.state.anger_level > 0.6:
                return "背叛"
            coop_chance = self.profile["coop_base"] + self.state.trust_level * 0.3
            return "合作" if random.random() < coop_chance else "背叛"

        elif p == PersonalityType.AGGRESSIVE:
            betrayal_count = player_history.count("背叛")
            if betrayal_count > 0:
                return "背叛"
            return "背叛" if random.random() < 0.7 else "合作"

        elif p == PersonalityType.COOPERATIVE:
            if player_history and player_history[-1] == "背叛":
                return "背叛" if random.random() < 0.3 else "合作"
            return "合作"

        elif p == PersonalityType.MANIPULATOR:
            if self.round_num <= 2:
                return "合作"  # Build trust first
            if self.state.trust_level > 0.7 and random.random() < 0.5:
                return "背叛"  # Exploit trust
            return "合作"

        else:  # RISK_AVERSE
            if player_history and player_history[-1] == "背叛":
                return "背叛"
            return "合作" if random.random() < 0.75 else "背叛"

    def decide_ultimatum_response(self, offer: int, total: int) -> bool:
        """Decide whether to accept an ultimatum offer (True=accept)."""
        ratio = offer / total
        p = self.personality

        if p == PersonalityType.RATIONAL:
            return offer > 0  # Any positive offer is rational to accept

        elif p == PersonalityType.EMOTIONAL:
            if ratio < 0.25:
                self.state.anger_level = min(1.0, self.state.anger_level + 0.5)
                return random.random() < 0.1  # Very likely to reject unfair offers
            if ratio < 0.40:
                return random.random() < 0.4
            return True

        elif p == PersonalityType.AGGRESSIVE:
            return ratio >= 0.45  # Demands near-equal split

        elif p == PersonalityType.COOPERATIVE:
            return ratio >= 0.20  # Accepts reasonable offers

        elif p == PersonalityType.MANIPULATOR:
            if ratio < 0.30:
                return random.random() < 0.3  # Rejects to signal power
            return True

        else:  # RISK_AVERSE
            return offer > 0  # Accepts any positive amount to avoid zero

    def make_bargaining_offer(self, round_n: int, max_rounds: int,
                               my_reserve: int, their_reserve: int,
                               last_their_offer: Optional[int] = None) -> int:
        """Return a bargaining offer (how much you want for yourself)."""
        urgency = round_n / max_rounds
        p = self.personality
        base_demand = my_reserve + int((their_reserve - my_reserve) * 0.8)

        if p == PersonalityType.RATIONAL:
            # Concede steadily based on time pressure
            target = base_demand - int((base_demand - my_reserve) * urgency * 0.5)
            return max(my_reserve, target)

        elif p == PersonalityType.EMOTIONAL:
            if last_their_offer and last_their_offer < my_reserve * 1.2:
                self.state.anger_level = min(1.0, self.state.anger_level + 0.3)
            anger_stubbornness = self.state.anger_level * 0.3
            target = base_demand - int((base_demand - my_reserve) * urgency * (0.4 - anger_stubbornness))
            return max(my_reserve, target)

        elif p == PersonalityType.AGGRESSIVE:
            # Barely concedes
            target = base_demand - int((base_demand - my_reserve) * urgency * 0.15)
            return max(my_reserve, target)

        elif p == PersonalityType.COOPERATIVE:
            target = base_demand - int((base_demand - my_reserve) * urgency * 0.65)
            return max(my_reserve, target)

        elif p == PersonalityType.MANIPULATOR:
            if round_n == 1:
                return their_reserve - 5  # Anchor high
            target = base_demand - int((base_demand - my_reserve) * urgency * 0.35)
            return max(my_reserve, target)

        else:  # RISK_AVERSE
            target = base_demand - int((base_demand - my_reserve) * urgency * 0.55)
            return max(my_reserve, target)

    def react_to_player_action(self, action: str, context: dict) -> Tuple[str, str]:
        """Generate opponent reaction comment and update internal state.
        Returns (reaction_text, psychological_tell)."""
        p = self.personality
        reactions = {
            PersonalityType.RATIONAL: {
                "合作": ("我注意到您选择合作，这是理性的。", "面无表情，记录数据"),
                "背叛": ("有趣…您选择了背叛。我会调整我的策略。", "轻微皱眉，重新计算"),
                "高报价": ("这个价格超出合理范围，我需要重新评估。", "翻阅文件，沉默"),
                "低报价": ("这是经过计算的吗？数字不支持这个报价。", "指向数据，冷静质疑"),
            },
            PersonalityType.EMOTIONAL: {
                "合作": ("太好了！我喜欢和能够合作的人谈判！", "微笑，身体前倾"),
                "背叛": ("你…你怎么能这样！我信任你！", "脸色变红，声音提高"),
                "高报价": ("这明显是在侮辱我的智商！", "站起来，愤怒表情"),
                "低报价": ("嗯，这还算可以，我们可以继续聊。", "放松肩膀，点头"),
            },
            PersonalityType.AGGRESSIVE: {
                "合作": ("合作？哼，这只是你的策略而已。", "冷笑，手臂交叉"),
                "背叛": ("聪明。但别以为你能赢过我。", "赞许点头，眼神锐利"),
                "高报价": ("不可能。要么接受我的条件，要么谈判结束。", "推开文件，直视对方"),
                "低报价": ("这才是谈判！但还不够，我需要更多。", "往前靠，强势姿态"),
            },
            PersonalityType.COOPERATIVE: {
                "合作": ("太棒了！我相信我们能找到对双方都好的方案！", "热情握手姿势，眼神真诚"),
                "背叛": ("我...有些失望。但也许我们可以重新开始？", "皱眉，但保持开放"),
                "高报价": ("嗯，这超出了我的预算，但我们一起想想有没有创意解决方案？", "思考姿势，建设性"),
                "低报价": ("谢谢你的灵活性！我也会相应调整我的条件。", "感激点头"),
            },
            PersonalityType.MANIPULATOR: {
                "合作": ("很好，我就知道我们是一类人。", "友好微笑，但眼神在观察"),
                "背叛": ("哦，我早就猜到了。其实这对你来说未必是好事。", "若无其事，暗示知道更多"),
                "高报价": ("哈，我理解你的立场。但我有些信息可能对你有用…", "神秘微笑，制造悬念"),
                "低报价": ("这正好在我的期望范围内，不过我还有个条件…", "立刻追加要求"),
            },
            PersonalityType.RISK_AVERSE: {
                "合作": ("太好了，合作让大家都安心。", "明显放松，如释重负"),
                "背叛": ("天啊...这让我很不安，我不确定能否继续。", "焦虑表情，快速眨眼"),
                "高报价": ("这个风险太大了，我需要一些保证。", "手抖，要求书面确认"),
                "低报价": ("这在安全范围内，我可以接受。", "迅速点头，急于确认"),
            },
        }

        action_map = {
            "合作": "合作", "背叛": "背叛",
            "high_offer": "高报价", "low_offer": "低报价",
        }
        key = action_map.get(action, "合作")
        reaction_dict = reactions.get(p, reactions[PersonalityType.RATIONAL])
        text, tell = reaction_dict.get(key, ("...", "保持中立"))

        # Update state
        if action == "合作":
            self.state.trust_level = min(1.0, self.state.trust_level + 0.1)
        elif action == "背叛":
            self.state.trust_level = max(0.0, self.state.trust_level - 0.2)
            if p == PersonalityType.EMOTIONAL:
                self.state.anger_level = min(1.0, self.state.anger_level + 0.3)

        return text, tell

    def get_psychological_hint(self) -> str:
        """Return a psychological hint about the opponent's current state."""
        hints = []
        p = self.personality

        if self.state.trust_level > 0.7:
            hints.append("对方信任度较高，可能愿意做出更多让步")
        elif self.state.trust_level < 0.3:
            hints.append("对方信任度很低，需要重建信任才能推进")

        if self.state.anger_level > 0.5:
            hints.append("对方情绪激动，此时做让步效果最好")

        if p == PersonalityType.MANIPULATOR and self.round_num > 2:
            hints.append("注意！对手可能正在布局，建议核实其陈述")

        if p == PersonalityType.AGGRESSIVE:
            hints.append("强硬对手：不要先让步，坚守底线，等对方先动")

        if p == PersonalityType.RISK_AVERSE and self.state.satisfaction < 0.4:
            hints.append("对方正在焦虑，给予明确保证可以快速推进")

        return " | ".join(hints) if hints else "继续观察对方行为模式"


def get_opponent(personality: PersonalityType) -> Opponent:
    names = {
        PersonalityType.RATIONAL:    "陈逻辑",
        PersonalityType.EMOTIONAL:   "林敏感",
        PersonalityType.AGGRESSIVE:  "钢铁王",
        PersonalityType.COOPERATIVE: "和谐李",
        PersonalityType.MANIPULATOR: "影子张",
        PersonalityType.RISK_AVERSE: "稳健吴",
    }
    return Opponent(personality, names[personality])


def random_opponent() -> Opponent:
    return get_opponent(random.choice(list(PersonalityType)))

# ========================================================================
# psychology.py
# ========================================================================


import math


@dataclass
class DecisionRecord:
    scenario: str
    action: str
    context: dict
    outcome: str
    score_delta: float


@dataclass
class PsychProfile:
    cooperation_rate: float = 0.0       # 0=purely competitive, 1=purely cooperative
    risk_tolerance: float = 0.5         # 0=risk-averse, 1=risk-seeking
    fairness_sensitivity: float = 0.5   # 0=indifferent to fairness, 1=highly sensitive
    strategic_depth: float = 0.5        # 0=reactive, 1=deep strategic planner
    emotional_regulation: float = 0.5   # 0=volatile, 1=very stable
    assertiveness: float = 0.5          # 0=passive, 1=highly assertive
    adaptability: float = 0.5           # 0=rigid, 1=highly adaptive
    trust_disposition: float = 0.5      # 0=suspicious, 1=trusting


PROFILE_TYPES = {
    "战略家": {
        "criteria": {"strategic_depth": (0.7, 1.0), "emotional_regulation": (0.6, 1.0)},
        "description": "您具备深度战略思维，能看穿博弈本质，在压力下保持冷静。",
        "strengths": ["长远规划", "冷静分析", "适应力强", "不轻易被情绪左右"],
        "weaknesses": ["有时显得冷酷", "可能忽视情感因素", "在快速变化中可能反应滞后"],
        "advice": "善用您的战略优势，但注意适时展示情感以建立信任。",
        "style": "bold blue",
    },
    "调解者": {
        "criteria": {"cooperation_rate": (0.65, 1.0), "fairness_sensitivity": (0.6, 1.0)},
        "description": "您天生具备调解能力，善于寻找共同利益，构建共赢方案。",
        "strengths": ["建立信任", "化解冲突", "同理心强", "创造双赢"],
        "weaknesses": ["有时过于顾及他人", "在强硬对手面前可能退让过多"],
        "advice": "坚守您的底线，不要让善意被对手利用。明确BATNA并坚持。",
        "style": "bold green",
    },
    "竞争者": {
        "criteria": {"assertiveness": (0.7, 1.0), "risk_tolerance": (0.6, 1.0)},
        "description": "您具有强烈的竞争意识，勇于承担风险，追求最大化收益。",
        "strengths": ["强势谈判", "不怕风险", "目标明确", "执行力强"],
        "weaknesses": ["可能破坏合作机会", "忽视关系建设", "在重复博弈中可能吃亏"],
        "advice": "学会识别合作比竞争更有利的场景，培养长期关系思维。",
        "style": "bold red",
    },
    "分析师": {
        "criteria": {"strategic_depth": (0.6, 1.0), "risk_tolerance": (0.2, 0.5)},
        "description": "您注重数据和逻辑，系统分析每个决策，偏好可预期结果。",
        "strengths": ["精确分析", "规避无谓风险", "决策一致性高"],
        "weaknesses": ["分析瘫痪", "在情感主导的谈判中显得冷漠", "灵活性不足"],
        "advice": "提高直觉决策能力，学会在不完全信息下快速行动。",
        "style": "bold cyan",
    },
    "外交家": {
        "criteria": {"adaptability": (0.65, 1.0), "trust_disposition": (0.6, 1.0)},
        "description": "您善于灵活变通，能快速读懂对方意图，建立有效沟通渠道。",
        "strengths": ["高度适应性", "善读人心", "沟通高效", "关系网络广"],
        "weaknesses": ["可能缺乏坚定立场", "原则性有时不足"],
        "advice": "在保持灵活性的同时，确立核心不可让步的原则。",
        "style": "bold magenta",
    },
    "实用主义者": {
        "criteria": {},  # Default type
        "description": "您务实灵活，根据具体情况调整策略，不拘泥于固定模式。",
        "strengths": ["务实高效", "不教条", "结果导向"],
        "weaknesses": ["缺乏一致性可能让对方难以预测（也可能是优势）"],
        "advice": "建立更系统的谈判框架，让您的务实性更有章法。",
        "style": "bold yellow",
    },
}

COMMUNICATION_STYLES = {
    "主动型": {
        "range": (0.65, 1.0),
        "dimension": "assertiveness",
        "description": "直接表达需求，主导谈判节奏",
        "tips": ["使用'我需要'而非'我希望'", "率先提出议程", "设定截止时间"],
    },
    "协作型": {
        "range": (0.55, 0.75),
        "dimension": "cooperation_rate",
        "description": "注重双赢，开放式沟通",
        "tips": ["多问'我们如何能…'", "分享信息以换取信息", "聚焦利益而非立场"],
    },
    "分析型": {
        "range": (0.0, 0.4),
        "dimension": "risk_tolerance",
        "description": "数据驱动，逻辑推理",
        "tips": ["用数字支撑论点", "要求对方提供证据", "建立清晰的决策矩阵"],
    },
    "关系型": {
        "range": (0.6, 1.0),
        "dimension": "trust_disposition",
        "description": "建立信任，情感联结",
        "tips": ["先聊共同经历", "表达对对方处境的理解", "使用对方的语言和框架"],
    },
}


class PsychologicalAnalyzer:
    def __init__(self):
        self.records: List[DecisionRecord] = []
        self.profile = PsychProfile()
        self.session_count = 0

    def record_decision(self, scenario: str, action: str,
                        context: dict, outcome: str, score_delta: float):
        self.records.append(DecisionRecord(scenario, action, context, outcome, score_delta))
        self._update_profile(scenario, action, context, score_delta)

    def _update_profile(self, scenario: str, action: str, context: dict, score: float):
        """Update profile dimensions based on new decision."""
        lr = 0.15  # learning rate

        # Cooperation rate
        if action in ("合作", "接受", "让步"):
            self.profile.cooperation_rate = self._smooth(
                self.profile.cooperation_rate, 1.0, lr)
        elif action in ("背叛", "拒绝", "强硬"):
            self.profile.cooperation_rate = self._smooth(
                self.profile.cooperation_rate, 0.0, lr)

        # Risk tolerance
        risk_level = context.get("risk_level", 0.5)
        if action in ("冒险", "高出价", "强硬"):
            self.profile.risk_tolerance = self._smooth(
                self.profile.risk_tolerance, risk_level, lr)
        elif action in ("保守", "低出价", "退出"):
            self.profile.risk_tolerance = self._smooth(
                self.profile.risk_tolerance, 1.0 - risk_level, lr)

        # Fairness sensitivity
        if "unfair_offer" in context and context["unfair_offer"] and action == "拒绝":
            self.profile.fairness_sensitivity = self._smooth(
                self.profile.fairness_sensitivity, 1.0, lr * 1.5)

        # Strategic depth - rewarded for good outcomes
        if score > 0:
            self.profile.strategic_depth = self._smooth(
                self.profile.strategic_depth, min(1.0, 0.5 + score / 100), lr * 0.5)

        # Emotional regulation - consistency metric
        recent = self.records[-5:]
        if len(recent) >= 3:
            actions = [r.action for r in recent]
            unique = len(set(actions)) / len(actions)
            consistency = 1.0 - unique  # More consistent = lower unique ratio
            self.profile.emotional_regulation = self._smooth(
                self.profile.emotional_regulation, consistency, lr * 0.3)

        # Adaptability - changes strategy when not working
        if len(self.records) >= 4:
            last_4 = self.records[-4:]
            bad_streak = all(r.score_delta < 0 for r in last_4)
            if bad_streak and action not in [self.records[-2].action]:
                self.profile.adaptability = self._smooth(
                    self.profile.adaptability, 0.8, lr)
            elif bad_streak:
                self.profile.adaptability = self._smooth(
                    self.profile.adaptability, 0.2, lr)

    def _smooth(self, current: float, target: float, rate: float) -> float:
        return min(1.0, max(0.0, current + rate * (target - current)))

    def get_profile_type(self) -> str:
        for ptype, data in PROFILE_TYPES.items():
            if ptype == "实用主义者":
                continue
            criteria = data["criteria"]
            match = all(
                lo <= getattr(self.profile, dim) <= hi
                for dim, (lo, hi) in criteria.items()
            )
            if match:
                return ptype
        return "实用主义者"

    def get_communication_style(self) -> str:
        p = self.profile
        scores = {
            "主动型":   abs(p.assertiveness - 0.8),
            "协作型":   abs(p.cooperation_rate - 0.65),
            "分析型":   abs(p.risk_tolerance - 0.3),
            "关系型":   abs(p.trust_disposition - 0.75),
        }
        return min(scores, key=scores.get)

    def generate_insights(self) -> List[Dict]:
        """Generate actionable psychological insights."""
        insights = []
        p = self.profile

        if p.cooperation_rate < 0.3:
            insights.append({
                "type": "warning",
                "title": "过度竞争倾向",
                "body": "您的合作率偏低。在重复博弈中，纯竞争策略往往不如合作策略收益高。"
                        "试试以合作开局，根据对方行为调整。",
                "score_impact": "提升合作率可增加10-30%长期收益",
            })
        elif p.cooperation_rate > 0.85:
            insights.append({
                "type": "info",
                "title": "过度合作风险",
                "body": "高合作率在面对强硬对手时可能被利用。学会识别何时合作对方不会回报。",
                "score_impact": "建立条件式合作策略",
            })

        if p.risk_tolerance < 0.25:
            insights.append({
                "type": "info",
                "title": "风险规避可能限制收益",
                "body": "您倾向于接受较低但确定的结果。适度冒险——尤其在信息充分时——可显著提升收益。",
                "score_impact": "建议在熟悉场景中提高风险接受度",
            })

        if p.strategic_depth < 0.35:
            insights.append({
                "type": "warning",
                "title": "短期思维主导",
                "body": "您的决策偏向即时收益。尝试在每次决策前问：'这个选择在5轮后对我意味着什么？'",
                "score_impact": "战略深度每提升0.1，平均分可增加15%",
            })

        if p.adaptability < 0.3:
            insights.append({
                "type": "warning",
                "title": "策略僵化",
                "body": "您在策略失效时调整不够快速。当连续3次结果不佳，是主动改变策略的信号。",
                "score_impact": "适应性提升可减少40%无效决策",
            })

        if p.emotional_regulation < 0.35:
            insights.append({
                "type": "warning",
                "title": "情绪影响决策",
                "body": "您的决策一致性较低，可能受情绪波动影响。建议在做重要决定前深呼吸，"
                        "设定3秒等待时间。",
                "score_impact": "提高情绪稳定性可减少30%非理性决策",
            })

        if p.fairness_sensitivity > 0.8:
            insights.append({
                "type": "info",
                "title": "公平敏感性过高",
                "body": "在博弈中拒绝不公平offer会损失实际收益。记住：接受10元比拒绝20元更合理。",
                "score_impact": "在单次博弈中，理性接受任何正值offer",
            })

        if not insights:
            insights.append({
                "type": "success",
                "title": "心理档案平衡",
                "body": "您的各项心理指标相对均衡，这是良好的谈判基础。继续积累实战经验。",
                "score_impact": "保持当前状态，针对特定对手类型精细调整",
            })

        return insights

    def get_blind_spots(self) -> List[str]:
        """Identify psychological blind spots."""
        blind_spots = []
        p = self.profile

        if p.trust_disposition > 0.75 and p.strategic_depth < 0.5:
            blind_spots.append("容易被操纵型对手利用：高信任+低战略深度是危险组合")

        if p.assertiveness > 0.8 and p.adaptability < 0.4:
            blind_spots.append("强势但不灵活：当强硬策略无效时，缺乏B计划")

        if p.cooperation_rate > 0.7 and p.fairness_sensitivity > 0.7:
            blind_spots.append("'好人综合征'：过度合作+公平执念可能让你在零和博弈中总是吃亏")

        if p.risk_tolerance > 0.8 and p.strategic_depth < 0.5:
            blind_spots.append("鲁莽冒险：高风险偏好缺乏战略支撑，容易在不必要的场景下冒险")

        return blind_spots if blind_spots else ["目前未发现明显心理盲点"]

    def get_negotiation_tips_for_opponent(self, opp_type: str) -> List[str]:
        """Generate specific tips for dealing with a given opponent type."""
        tips_db = {
            "理性分析型": [
                "用数据说话——展示对方从合作中可以量化获得的收益",
                "避免情感诉求，聚焦逻辑和收益计算",
                "提出多个方案供对方选择（'选择性关闭'策略）",
                "不要快速让步，这只会让对方认为你有更大空间",
            ],
            "情感驱动型": [
                "先建立情感连接，再谈具体条款",
                "表达对对方立场的理解和尊重",
                "用故事和案例代替数据",
                "给对方保留面子——让他觉得结果是公平的",
                "注意：不公平出价会激怒对方导致破裂",
            ],
            "强硬鹰派型": [
                "不要率先让步——首次让步会被视为软弱",
                "展示你的BATNA（最佳替代方案），降低对方的筹码",
                "使用'条件式让步'：'如果你在X方面让步，我才考虑Y'",
                "设定截止时间制造压力",
                "必要时选择暂停谈判，降低对方的心理优势",
            ],
            "合作共赢型": [
                "直接表达双赢意图，降低防御",
                "分享更多信息以激发互惠",
                "共同识别问题而非对立立场",
                "注意：不要过度压榨善意，长期关系更有价值",
            ],
            "操纵控制型": [
                "保持高度警觉，核实所有关键陈述",
                "不要因'友好'表现放松警惕",
                "明确提问，揭穿模糊表述",
                "记录每个承诺和陈述",
                "适时点明对方的操纵手法，打破其节奏",
            ],
            "风险规避型": [
                "提供保证和确定性以推进谈判",
                "将协议拆成小步骤，降低对方的风险感知",
                "展示历史案例和成功先例",
                "避免制造压力——这会让对方僵住",
                "书面确认可以加速决策",
            ],
        }
        return tips_db.get(opp_type, ["观察对方行为模式，灵活调整策略"])

    def get_full_report(self) -> Dict:
        profile_type = self.get_profile_type()
        comm_style = self.get_communication_style()
        insights = self.generate_insights()
        blind_spots = self.get_blind_spots()

        return {
            "profile_type": profile_type,
            "profile_data": PROFILE_TYPES[profile_type],
            "communication_style": comm_style,
            "comm_style_data": COMMUNICATION_STYLES.get(comm_style, {}),
            "dimensions": {
                "合作倾向": self.profile.cooperation_rate,
                "风险承受": self.profile.risk_tolerance,
                "公平敏感": self.profile.fairness_sensitivity,
                "战略深度": self.profile.strategic_depth,
                "情绪调节": self.profile.emotional_regulation,
                "主张强度": self.profile.assertiveness,
                "适应能力": self.profile.adaptability,
                "信任倾向": self.profile.trust_disposition,
            },
            "insights": insights,
            "blind_spots": blind_spots,
            "total_decisions": len(self.records),
        }

# ========================================================================
# analytics.py
# ========================================================================




@dataclass
class SessionRecord:
    timestamp: str
    scenario: str
    opponent_type: str
    player_score: float
    opponent_score: float
    outcome: str
    rounds: int = 0


@dataclass
class PlayerData:
    name: str
    created_at: str
    sessions: List[Dict] = field(default_factory=list)
    total_sessions: int = 0
    total_score: float = 0.0
    scenario_counts: Dict[str, int] = field(default_factory=dict)
    opponent_win_rates: Dict[str, float] = field(default_factory=dict)

    def add_session(self, record: SessionRecord):
        self.sessions.append(asdict(record))
        self.total_sessions += 1
        self.total_score += record.player_score
        self.scenario_counts[record.scenario] = (
            self.scenario_counts.get(record.scenario, 0) + 1
        )
        # Win rate vs opponent type
        opp = record.opponent_type
        wins = self.opponent_win_rates.get(opp + "_wins", 0)
        played = self.opponent_win_rates.get(opp + "_played", 0)
        if record.player_score > record.opponent_score:
            wins += 1
        played += 1
        self.opponent_win_rates[opp + "_wins"] = wins
        self.opponent_win_rates[opp + "_played"] = played

    def get_win_rate_vs(self, opp_type: str) -> Optional[float]:
        played = self.opponent_win_rates.get(opp_type + "_played", 0)
        wins = self.opponent_win_rates.get(opp_type + "_wins", 0)
        if played == 0:
            return None
        return wins / played

    def get_favorite_scenario(self) -> str:
        if not self.scenario_counts:
            return "尚无记录"
        return max(self.scenario_counts, key=self.scenario_counts.get)

    def get_avg_score(self) -> float:
        if self.total_sessions == 0:
            return 0
        return self.total_score / self.total_sessions


DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else os.getcwd(), "player_data.json")


def load_player(name: str) -> PlayerData:
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                all_data = json.load(f)
            if name in all_data:
                d = all_data[name]
                return PlayerData(
                    name=d["name"],
                    created_at=d["created_at"],
                    sessions=d.get("sessions", []),
                    total_sessions=d.get("total_sessions", 0),
                    total_score=d.get("total_score", 0.0),
                    scenario_counts=d.get("scenario_counts", {}),
                    opponent_win_rates=d.get("opponent_win_rates", {}),
                )
        except (json.JSONDecodeError, KeyError):
            pass
    return PlayerData(
        name=name,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
    )


def save_player(player: PlayerData):
    all_data = {}
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                all_data = json.load(f)
        except (json.JSONDecodeError, KeyError):
            pass
    all_data[player.name] = asdict(player)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)


def get_rank(total_sessions: int, avg_score: float) -> str:
    if total_sessions < 3:
        return "🥉 新兵学员"
    elif total_sessions < 8 or avg_score < 20:
        return "🥈 初级谈判者"
    elif total_sessions < 15 or avg_score < 40:
        return "🥇 中级策略师"
    elif total_sessions < 25 or avg_score < 60:
        return "💎 高级外交官"
    else:
        return "👑 博弈大师"


def generate_progress_bar(value: float, max_val: float = 1.0, width: int = 20) -> str:
    ratio = min(1.0, value / max_val) if max_val > 0 else 0
    filled = int(ratio * width)
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {ratio:.0%}"


def get_scenario_mastery(player: PlayerData) -> Dict[str, str]:
    mastery = {}
    for scenario, count in player.scenario_counts.items():
        if count >= 5:
            mastery[scenario] = "精通"
        elif count >= 3:
            mastery[scenario] = "熟练"
        elif count >= 1:
            mastery[scenario] = "了解"
        else:
            mastery[scenario] = "未涉及"
    return mastery

# ========================================================================
# strategies.py
# ========================================================================


STRATEGY_CARDS = [
    {
        "id": "01",
        "name": "针锋相对策略 (Tit-for-Tat)",
        "category": "博弈策略",
        "core": "以合作开局；之后镜像对方上一轮的行为。",
        "when_to_use": "重复囚徒困境、长期合作关系、需要建立互惠规范时",
        "pros": ["简单可预测，传递清晰信号", "惩罚背叛，奖励合作", "在重复博弈中接近最优"],
        "cons": ["对随机错误敏感（一次误解可引发报复螺旋）", "单次博弈无效"],
        "advanced": "改良版：'慷慨的针锋相对'——偶尔原谅背叛（1/10概率），避免永久报复循环。",
        "example": "供应链谈判中：对方延期交货就我方延期付款；对方准时交货就我方优先续签。",
    },
    {
        "id": "02",
        "name": "锚定效应 (Anchoring)",
        "category": "谈判技术",
        "core": "率先提出一个极端起始点，将谈判范围锚定在有利方向。",
        "when_to_use": "价格谈判、薪资谈判、任何涉及数字的讨价还价",
        "pros": ["率先锚定的一方通常获得更好结果", "对方的最终出价受初始锚点显著影响"],
        "cons": ["过于极端的锚定会破坏谈判信任", "对有明确市场参考价的场景效果弱"],
        "advanced": "对抗锚定：在对方锚定后，明确说出'我忽略这个数字'并立即提出反锚。",
        "example": "薪资谈判：HR报价20K，不要在此基础上讨论，立即说'我的目标是28K，让我解释原因'。",
    },
    {
        "id": "03",
        "name": "BATNA策略",
        "category": "谈判基础",
        "core": "明确你的最佳替代方案(Best Alternative to Negotiated Agreement)，永远不接受低于BATNA的结果。",
        "when_to_use": "任何谈判前必须准备，特别是高风险谈判",
        "pros": ["强化谈判底线", "降低被迫接受坏协议的风险", "给予你真实的心理优势"],
        "cons": ["需要事前准备", "如果BATNA很弱，谈判地位也弱"],
        "advanced": "同时改善自己的BATNA并削弱对方的BATNA（让对方没有好的替代选择）。",
        "example": "买房谈判：保持3套备选房产的报价，让卖家知道你有选择，增加谈判杠杆。",
    },
    {
        "id": "04",
        "name": "框架效应 (Framing)",
        "category": "心理技术",
        "core": "同一信息用不同方式呈现，产生截然不同的心理反应。",
        "when_to_use": "需要说服对方接受某个方案；化解对方反对意见时",
        "pros": ["不改变内容，仅改变呈现方式即可影响决策", "成本低，效果显著"],
        "cons": ["对高理性对手效果有限", "过度使用会被识破"],
        "advanced": "损失框架 > 收益框架：'如果不签合同，您将失去200万市场机会'比'签合同可以获得200万'更有力。",
        "example": "手术风险：'成功率90%'比'失败率10%'让患者更愿意手术（数字相同，感受不同）。",
    },
    {
        "id": "05",
        "name": "积极倾听 (Active Listening)",
        "category": "沟通技术",
        "core": "全神贯注地听，重复关键信息，提开放式问题，确认理解。",
        "when_to_use": "危机谈判、建立信任阶段、探明对方真实需求时",
        "pros": ["让对方感到被尊重，降低防御", "揭露对方真实利益和需求", "建立情感账户"],
        "cons": ["需要刻意练习，初学者容易假听"],
        "advanced": "标签技术：'听起来您感到...'可以准确反映对方情绪，效果强于直接问'你感觉怎么样'。",
        "example": "危机谈判员口头禅：'我听到了，请继续说...' + 副语言认可 + 最后重述关键点。",
    },
    {
        "id": "06",
        "name": "互惠原则 (Reciprocity)",
        "category": "影响力原则",
        "core": "先给予小恩惠，触发对方的心理义务感，使其更倾向于回报。",
        "when_to_use": "建立谈判关系初期；需要对方做出让步时",
        "pros": ["利用人类根深蒂固的互惠本能", "成本低，效果持久"],
        "cons": ["可能被操纵性对手利用（先送礼再提大要求）"],
        "advanced": "主动让步触发互惠：'我先在X点让步，我相信您也会在Y点有所调整'。",
        "example": "谈判前先分享一份对对方有价值的行业报告，对方更倾向于做出信息回报。",
    },
    {
        "id": "07",
        "name": "沉默的力量 (Strategic Silence)",
        "category": "谈判技术",
        "core": "提出方案后保持沉默；对方出价后保持沉默；制造心理压力。",
        "when_to_use": "对方出价后；提出重要要求后；等待对方让步时",
        "pros": ["填充沉默的心理压力让对方自动让步", "给自己思考时间", "传递信心信号"],
        "cons": ["在电话谈判中可能尴尬", "需要心理承受力"],
        "advanced": "研究表明：谈判中第一个打破沉默的一方往往做出让步。保持沉默至少5秒。",
        "example": "销售谈判：说出你的价格后，闭嘴。无论对方的反应如何，等待他们先开口。",
    },
    {
        "id": "08",
        "name": "条件式让步 (Conditional Concession)",
        "category": "谈判技术",
        "core": "用'如果...那么...'格式让步，每次让步都获得对等回报。",
        "when_to_use": "需要做出让步时；防止单边让步时",
        "pros": ["避免单向让步被误解为软弱", "每次让步都获得交换价值", "教育对方你不会无条件让步"],
        "cons": ["过于机械使用会让气氛变得对抗性"],
        "advanced": "递减让步：第一次让10%，第二次让5%，第三次让2%。传递信号：接近底线。",
        "example": "房产谈判：'如果你们能在两周内完成尽职调查，我愿意在价格上再降3万'。",
    },
    {
        "id": "09",
        "name": "纳什均衡识别",
        "category": "博弈理论",
        "core": "找到没有单方偏离动机的策略组合，预判稳定博弈结果。",
        "when_to_use": "分析对手策略；设计激励机制；预测市场竞争结果",
        "pros": ["提供客观的策略分析框架", "预测理性对手的行为"],
        "cons": ["现实中对手并非总是完全理性", "可能存在多个均衡"],
        "advanced": "混合策略均衡：当纯策略均衡不存在时，随机化选择可成为均衡（如点球博弈）。",
        "example": "价格战：两家企业都选择低价是纳什均衡，即使双方都高价利润更高（囚徒困境）。",
    },
    {
        "id": "10",
        "name": "双赢谈判框架 (Integrative Bargaining)",
        "category": "谈判框架",
        "core": "挖掘双方潜在利益而非固守立场，创造共同价值再分配。",
        "when_to_use": "长期合作关系；双方都有多维度利益时；避免零和博弈",
        "pros": ["创造更大总价值", "维护关系", "找到创意解决方案"],
        "cons": ["需要双方都有合作意愿", "信息分享有被利用风险"],
        "advanced": "利益树技术：让对方说出'为什么'而非'要什么'，挖掘根本利益，再创造满足两者的方案。",
        "example": "劳资谈判：工会要涨薪20%，公司只能给5%。通过挖掘利益发现工人核心诉求是工作稳定性，"
                   "最终方案：5%涨薪+3年不裁员保证。双方都比原方案更满意。",
    },
]

COMMUNICATION_TECHNIQUES = [
    {
        "name": "战略性披露",
        "desc": "有选择地分享信息，以换取对等信息或影响对方决策。",
        "rule": "分享对方需要知道的，隐藏可被利用的，揭示可增加信任的。",
    },
    {
        "name": "需求重构",
        "desc": "将对方'立场'（要什么）转化为'利益'（为什么要），打开创意空间。",
        "rule": "不断问'为什么'直到找到根本利益。'你为什么要这个价格？'",
    },
    {
        "name": "情绪标签",
        "desc": "准确命名对方情绪，降低情绪强度，建立情感连接。",
        "rule": "用'看起来/听起来您感到...'而非直接问'你生气了吗？'",
    },
    {
        "name": "校准性问题",
        "desc": "用'如何'和'什么'开头的问题，让对方参与解决方案。",
        "rule": "'我们如何能解决这个问题？'比'你能不能...'更有效。",
    },
    {
        "name": "战略性停顿",
        "desc": "在关键时刻停止说话，让压力发挥作用。",
        "rule": "说出你的条件后，保持沉默至少5秒，等对方先开口。",
    },
]

PSYCHOLOGICAL_DEFENSE_TACTICS = [
    {
        "attack": "极端锚定",
        "defense": "明确宣布忽略锚点：'这个数字和市场现实相差太远，我们从X点重新开始讨论。'",
    },
    {
        "attack": "时间压力（虚假截止时间）",
        "defense": "质疑截止时间的真实性：'如果今天不能达成，明天能继续吗？'大多数截止时间是可以延伸的。",
    },
    {
        "attack": "好警察/坏警察策略",
        "defense": "识别并点名：'我注意到你们在扮演不同的角色，我更愿意直接和决策者谈。'",
    },
    {
        "attack": "假让步（在不重要的点上让步）",
        "defense": "事先列出所有议题的优先级，识别对方让步是否在你真正关心的点上。",
    },
    {
        "attack": "稀缺性制造（'只剩一个了'）",
        "defense": "独立核实稀缺性是否真实。如无法核实，提出条件：'如果确实只剩一个，我需要额外折扣。'",
    },
    {
        "attack": "情感操控（激怒或取悦）",
        "defense": "建立情绪触发意识：当感到异常愤怒或高兴时，暂停谈判，冷静分析原因。",
    },
]

# ========================================================================
# experts.py
# ========================================================================


# ═══════════════════════════════════════════════════════════════════════════
# 罗杰·道森 (Roger Dawson) —— 《优势谈判》
# 美国总统顾问、被誉为"美国谈判之神"
# ═══════════════════════════════════════════════════════════════════════════

DAWSON_GAMBITS = {
    "name": "罗杰·道森",
    "title": "优势谈判 (Secrets of Power Negotiating)",
    "credentials": "美国总统候选人顾问 · 优势谈判机构创始人 · 谈判畅销书作家",
    "philosophy": (
        "优势谈判不是要击败对手，而是要让对方在赢得谈判的同时，"
        "感觉自己赢了。真正的高手让对方在签字时感觉良好。"
    ),
    "core_principle": "让对方先开价 | 锁定底线 | 让步必须有所回报 | 永远暗示更高权威",
    "gambits": {
        "开局战术": [
            {
                "name": "开出高于预期的条件",
                "rule": "你的开价应是目标的两倍距离（如目标价8万，对方报10万，你应开6万）",
                "why": "①给自己谈判空间 ②对方可能直接接受 ③提升你产品/服务的感知价值 ④创造让步空间让对方感觉自己赢了",
                "warning": "极端开价后要明确传递'这是可以协商的'信号，避免直接被拒绝",
                "example": "求职：期望2万，开口要价3万，并加一句'这只是我的初步想法'",
            },
            {
                "name": "永远不要接受第一次报价",
                "rule": "无论对方第一次开出什么条件，都要表现出震惊和不接受",
                "why": "①接受会让对方立刻怀疑'是不是给低了' ②会让对方感觉'是不是哪里有问题'",
                "warning": "即使对方的第一次报价已经低于你的目标，也要谈判几个回合",
                "example": "卖家报价8万，你想要的就是8万，也要说'8万？这超出我的预算太多了，能不能再让点？'",
            },
            {
                "name": "大吃一惊策略 (The Flinch)",
                "rule": "听到对方报价时，做出明显的、夸张的吃惊反应——身体后仰、皱眉、倒吸一口气",
                "why": "对方80%会因为你的反应而立刻提供让步，因为他们在测试你的反应",
                "warning": "面对面谈判效果最佳，电话/邮件谈判要用语言表达：'这价格让我难以接受'",
                "example": "供应商报价后，立刻倒吸一口气：'多少？！你确定吗？'然后沉默",
            },
            {
                "name": "不情愿的买家/卖家",
                "rule": "无论你多么渴望成交，都要装作不情愿的样子",
                "why": "立刻把对方谈判范围压缩50%。你的渴望度越低，对方越急于让步",
                "warning": "不要装得太过分让对方放弃；保持'还有可能'的暧昧",
                "example": "卖二手车：'我老婆其实不太想卖，但你诚心问的话，我可以考虑...'",
            },
            {
                "name": "钳子策略 (The Vise)",
                "rule": "对方报价后，简单回应'你需要给出更好的条件'然后保持沉默",
                "why": "把举证责任完全推给对方，强迫他们再次让步而不知道你的真实立场",
                "warning": "说完后必须保持沉默，等对方先开口。第一个打破沉默的人输",
                "example": "对方报10万，你只说：'你必须给出更好的价格。'然后看着对方，闭嘴",
            },
        ],
        "中场战术": [
            {
                "name": "请示更高权威",
                "rule": "永远暗示自己上面还有决策者（董事会/老板/合伙人/配偶）",
                "why": "①给自己留缓冲时间 ②可以以'权威不同意'为由继续压价 ③把'坏人'推给看不见的第三方",
                "warning": "保持权威模糊（'我的合伙人'好过'我老板John'）以免被识破",
                "example": "'这个价格我个人觉得可以，但我得回去问问合伙人，他们对预算很严格。'",
                "counter": "应对方法：先问'你有最终决定权吗？'让对方提前承诺",
            },
            {
                "name": "服务价值递减原则",
                "rule": "你为对方做的事，价值会随时间快速衰减。要在做之前就谈好回报",
                "why": "对方在需求满足后，对你贡献的感激度会大幅降低",
                "warning": "千万不要'先做后谈'——做完了对方就把你的功劳视为理所当然",
                "example": "客户紧急要求加班完成项目时，必须在开始前谈好加急费，而非完成后",
            },
            {
                "name": "永远不要折中价格",
                "rule": "面对'各让一半'的提议时，不要接受。要引导对方提出折中，然后再次还价",
                "why": "折中表面公平，实际上让你失去了进一步谈判的空间",
                "warning": "如果非要折中，让对方先提出折中方案",
                "example": "你要10万，对方给6万。对方提议'8万怎么样？'你说：'8万还是太低了，9万5如何？'",
            },
            {
                "name": "烫手山芋",
                "rule": "对方把问题（如'预算只有3万'）抛给你时，立刻测试其真实性并扔回去",
                "why": "对方常用虚假约束施压。要检验是否真实",
                "warning": "用平静的语气问，不要带情绪",
                "example": "'我理解预算紧张。但请告诉我，如果产品价值远超3万，预算就完全没有调整空间吗？'",
            },
            {
                "name": "礼尚往来 (Trade-off)",
                "rule": "对方提出任何要求时，永远问'你能为我做什么作为交换？'",
                "why": "①避免单方让步 ②对方可能撤回要求 ③即使没换到东西，也教育对方不能随便提要求",
                "warning": "每次都要问，形成习惯",
                "example": "'如果我同意提前两周交付，你能在付款条件上给我什么作为回报？'",
            },
        ],
        "终局战术": [
            {
                "name": "白脸黑脸",
                "rule": "两人组合：一人强硬不讲理（黑脸），一人友好通融（白脸）",
                "why": "对方为了避免和黑脸打交道，会向白脸做出本不该做的让步",
                "warning": "识别方法：要求只与一个决策者沟通，或当场点破：'你们在演白脸黑脸吧？'",
                "example": "采购谈判：经理强硬否决一切，最后由助理'好心'促成方案",
            },
            {
                "name": "蚕食策略 (Nibbling)",
                "rule": "在协议即将达成时，再要求一些小的额外好处",
                "why": "对方为了不让交易告吹，往往会同意小要求",
                "warning": "应对：'这个我们已经谈定了'+ 微笑+ 不为所动",
                "example": "签合同前：'对了，运费包含吧？还有培训也包含3天对吧？'",
            },
            {
                "name": "让步幅度递减",
                "rule": "让步幅度必须越来越小：100→50→25→10。绝不要等额让步",
                "why": "递减传递信号：你已接近底线。等额让步暗示还有大量空间",
                "warning": "永远不要做最后一次大让步——会让前面所有的小让步白费",
                "example": "降价：第一次降500，第二次降200，第三次降50。绝不是500-500-500",
            },
            {
                "name": "撤回出价 (Withdrawing an Offer)",
                "rule": "对方步步紧逼时，撤回之前的让步：'对不起，我之前的让步说错了'",
                "why": "立刻让对方从'攻势'转为'守势'，担心失去已得到的让步",
                "warning": "必须用模糊的'高层不同意'/'计算错了'为由，避免对抗升级",
                "example": "'抱歉，刚才说的免运费我没权限承诺，公司刚回复说不行...但价格可以再聊'",
            },
            {
                "name": "便于接受的姿态",
                "rule": "成交时做一个小让步，让对方感觉自己赢了",
                "why": "对方满意的关键不是得到了多少，而是感觉自己谈判得很好",
                "warning": "这个让步要小但'看上去价值大'（如赠送一次免费培训）",
                "example": "成交时说：'好吧，作为合作的诚意，我私下再送你3个月延保。'",
            },
        ],
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# 费雪 & 尤里 (Roger Fisher & William Ury) —— 《谈判力》
# 哈佛大学谈判项目创始人
# ═══════════════════════════════════════════════════════════════════════════

FISHER_URY_PRINCIPLED = {
    "name": "费雪 & 尤里",
    "title": "原则谈判法 (Principled Negotiation / Getting to Yes)",
    "credentials": "哈佛大学谈判项目创始人 · 全球谈判理论奠基者",
    "philosophy": (
        "不要在立场上讨价还价。聚焦双方真正的利益，"
        "共同寻找满足双方利益的方案，用客观标准评估。"
    ),
    "core_principle": "对事不对人 | 关注利益不是立场 | 创造共赢方案 | 坚持客观标准",
    "four_principles": [
        {
            "name": "把人和问题分开",
            "core": "谈判者首先是人。区分关系问题和实质问题，单独处理。",
            "techniques": [
                "感知：站在对方角度看问题，但不强迫接受对方观点",
                "情绪：承认并理解双方情绪，让对方'放气'而不反击",
                "沟通：积极倾听，确认对方说的话，说话目的是被理解而非赢得辩论",
            ],
            "example": "'我能理解你在这件事上的挫败感，我们都希望能找到好方案。让我们一起看看这个具体条款...'",
        },
        {
            "name": "关注利益，而非立场",
            "core": "立场是表面要求（'我要降价20%'），利益是背后真正需求（'我有现金压力'）",
            "techniques": [
                "问'为什么'：'为什么这对你重要？'",
                "问'为什么不'：'为什么不接受这个方案？'",
                "意识到每方都有多重利益，包括基本人类需求（安全、归属、认可、控制）",
            ],
            "example": "经典橙子案例：两个孩子争一个橙子。立场都是'我要橙子'，利益其实是一个要果肉做汁，一个要橙皮做蛋糕——可以双方都100%满足",
        },
        {
            "name": "创造互利的选项",
            "core": "扩大蛋糕，而不是分蛋糕。在决策前发明多种可能方案",
            "techniques": [
                "分离发明和决策：先头脑风暴所有可能，不评判",
                "扩大选项而非寻找单一答案",
                "寻找互利方案：识别共同利益、互补利益、不同优先级",
                "让对方决策容易：给对方提供有吸引力又容易'是'的选项",
            ],
            "barriers": ["过早评判", "寻找单一答案", "认为蛋糕固定", "认为'解决他们的问题是他们的问题'"],
        },
        {
            "name": "坚持使用客观标准",
            "core": "不凭意志强加结果，而是基于双方都接受的客观标准（市场价、专家意见、法律、先例）",
            "techniques": [
                "把每个议题作为联合寻找客观标准的练习",
                "理性辩论，但不向压力屈服——只屈服于原则",
                "问对方：'你这个数字的依据是什么？我们看看市场上同类项目...'",
            ],
            "example": "买房谈判：不说'我觉得80万合理'，而是'根据周边3套类似房产成交价均在75-82万，所以78万是合理的'",
        },
    ],
    "key_concepts": {
        "BATNA": (
            "Best Alternative To a Negotiated Agreement——谈判协议的最佳替代方案。"
            "你的BATNA越好，谈判力越强。永远要：①开发自己的BATNA ②了解对方的BATNA ③合理时削弱对方BATNA"
        ),
        "ZOPA": (
            "Zone of Possible Agreement——协议可能区域。"
            "你的底线和对方底线之间的重叠区域。无ZOPA则谈判注定失败"
        ),
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# 克里斯·沃斯 (Chris Voss) —— 《Never Split the Difference》
# 前FBI首席国际人质谈判专家
# ═══════════════════════════════════════════════════════════════════════════

VOSS_TACTICAL_EMPATHY = {
    "name": "克里斯·沃斯",
    "title": "战术性同理心 (Tactical Empathy / Never Split the Difference)",
    "credentials": "前FBI首席国际人质谈判专家 · 哈佛/MIT/西北大学谈判课讲师",
    "philosophy": (
        "谈判不是辩论，是发现。最好的谈判者认识到，每次互动都是一次基于人性的对话——"
        "对方需要被理解。理解对方的真实感受，比赢得辩论更有力量。"
    ),
    "core_principle": "战术同理心 | 黑色镜像 | 标签化情绪 | 校准问题 | 寻找'No'",
    "techniques": [
        {
            "name": "镜像反射 (Mirroring)",
            "rule": "重复对方话语的最后3个关键词，用上扬的语调，然后沉默",
            "why": "①让对方继续阐述，揭露更多信息 ②建立心理连接 ③争取思考时间 ④非对抗性引导对方修正",
            "example": "对方：'这个价格我们真的没办法接受了，公司预算已经卡死。' 你：'卡死了？'（停顿，看着对方）→ 对方往往会主动解释或修正",
            "warning": "音调要友好上扬，不要带质疑或讽刺",
        },
        {
            "name": "标签化情绪 (Labeling)",
            "rule": "用'看起来.../听起来.../似乎...'开头，准确命名对方的情绪",
            "why": "①让对方感觉被理解，降低防御 ②负面情绪一旦被命名，强度会下降 ③避免直接否定对方感受",
            "example": "'听起来这次合作对你来说有很大的内部压力' / '看起来你对上次的延期还有些介意'",
            "warning": "用陈述句而非问句。'你是不是很失望？'会引发否认；'看起来你有些失望'会引发确认",
        },
        {
            "name": "指控审查 (Accusation Audit)",
            "rule": "谈判开始前，列出对方可能对你的所有负面评价，并主动说出来",
            "why": "解除对方武装。当你说出对方心里想的负面话，他们会下意识地为你辩护",
            "example": "'你可能觉得我们这次报价太离谱了，可能觉得我们根本不了解你们的需求，甚至可能觉得我们在浪费你的时间。'",
            "warning": "要把负面预期说得比对方实际想的更夸张，对方会反而帮你说话",
        },
        {
            "name": "校准问题 (Calibrated Questions)",
            "rule": "用'如何/什么'开头的开放式问题，永远不用'为什么'（会引发防御）",
            "why": "让对方参与解决你的问题，给对方掌控感的错觉，同时实际由你引导方向",
            "examples": [
                "'我该如何做到这一点？'（让对方意识到自己要求的不可行性）",
                "'这对我们如何有利？'（让对方为自己的提议辩护）",
                "'你希望我怎么做？'（把球踢回对方）",
                "'这个问题的核心是什么？'（深挖真实需求）",
            ],
            "warning": "禁用'你能...吗'（是/否问题）和'为什么...'（带攻击性）",
        },
        {
            "name": "寻找'No'而非'Yes'",
            "rule": "提问让对方说'No'。'No'是真正承诺的开始",
            "why": "①'Yes'通常是敷衍 ②'No'让对方有掌控感 ③'No'后对方更愿意理性对话",
            "examples": [
                "'你反对这个方向吗？'（比'你同意吗？'更好）",
                "'我是不是来错了时间？'（比'你现在方便吗？'更好）",
                "'你已经放弃这个项目了吗？'（戏剧性反问，激发对方说'当然没有'）",
            ],
        },
        {
            "name": "'就是这样'魔法时刻",
            "rule": "持续标签化和总结，直到对方说出'就是这样！'（That's right）",
            "why": "意味着对方完全感觉被理解。这是真正达成认知一致的标志，是突破点",
            "warning": "区分'你说得对'（敷衍打发）vs '就是这样'（真正认同）",
        },
        {
            "name": "7-38-55沟通法则",
            "rule": "谈判中：7%靠词语 + 38%靠语调 + 55%靠肢体语言",
            "why": "言语易撒谎，语调和身体语言难以伪装。要：①控制自己的语调（深夜DJ嗓） ②观察对方非语言信号",
            "tips": [
                "深夜DJ嗓：低沉、缓慢、温和——传递理性与控制",
                "积极语调：表达兴趣和友好，但要少用以免显得不真诚",
                "断言语调：少用，会引发对抗",
            ],
        },
        {
            "name": "锚定情绪而非数字",
            "rule": "不要先给数字。先用情绪锚定对方的预期（'这个项目难得离谱'）",
            "why": "等对方先开价。当不得不先开时，先设定情绪锚点，让对方期望被压低，再给数字",
            "example": "'我必须告诉你，这个时间线对我们来说几乎不可能，资源都被锁住了……不过，如果非要做，价格大概在X万'",
        },
        {
            "name": "三的法则",
            "rule": "让对方在同一件事上确认三次。第一次可能撒谎，第二次开始让步，第三次说出真相",
            "techniques": [
                "第1次：直接问 → 对方答A",
                "第2次：用校准问题：'我们该如何做到这一点呢？'",
                "第3次：用标签：'看起来你对这个方案还是有些保留'",
            ],
        },
        {
            "name": "古怪数字策略",
            "rule": "永远开非整数（如187,650而非200,000）",
            "why": "①显得经过精密计算，难以反驳 ②隐含'每个数字都有依据，没法随便砍'",
        },
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# 赫伯·科恩 (Herb Cohen) —— 《你可以谈判任何事》
# 美国白宫顾问、人质危机谈判专家
# ═══════════════════════════════════════════════════════════════════════════

COHEN_NEGOTIATE_ANYTHING = {
    "name": "赫伯·科恩",
    "title": "万事可谈判 (You Can Negotiate Anything)",
    "credentials": "白宫人质危机谈判顾问 · 卡特/里根政府国际谈判顾问",
    "philosophy": (
        "谈判是关于满足需求的游戏，渗透在生活每个角落。"
        "三大要素决定结果：权力 (Power)、时间 (Time)、信息 (Information)。"
    ),
    "core_principle": "权力 · 时间 · 信息 三角",
    "three_elements": [
        {
            "name": "权力 (Power)",
            "core": "权力是感知。对方认为你有权力，你就有权力",
            "sources": [
                "竞争之力：让对方知道你有其他选择",
                "合法之力：依据法律、合同、规则",
                "冒险之力：愿意冒险离开谈判桌",
                "承诺之力：能够调动资源（团队、资金）",
                "专业之力：在该领域的专业知识",
                "知晓需求：知道对方真正需要什么",
                "投资之力：让对方投入越多，越难放弃",
                "奖惩之力：能给对方带来正面/负面结果",
                "认同之力：建立的关系和信任",
                "道德之力：道德高地",
            ],
            "rule": "永远不要展示你需要这笔交易。需要感=零权力",
        },
        {
            "name": "时间 (Time)",
            "core": "在谈判最后10%的时间内，会发生80%的让步。耐心是利器",
            "principles": [
                "Deadline效应：截止日期往往是协商的，不是绝对的",
                "对方的Deadline比你的Deadline更重要——掌握后即获得巨大优势",
                "不要轻易透露你的Deadline",
                "重要决策不要在压力下做出",
                "如果对方表现紧迫，问自己：他为什么那么急？",
            ],
            "example": "苏联谈判风格：故意拖延到最后一刻，让对方在Deadline压力下让步",
        },
        {
            "name": "信息 (Information)",
            "core": "信息越多，权力越大。但大多数人在谈判前准备不足",
            "rules": [
                "谈判前准备时间应是谈判时间的5倍以上",
                "了解对方：动机、约束、Deadline、上次类似交易的细节",
                "了解市场：可比成交、行业标准、对方的替代方案",
                "了解决策者：真正的拍板人是谁？他在乎什么？",
                "不要急于谈判——'我需要了解更多'是绝对正当的理由",
            ],
            "tip": "信息收集的最佳时机不是在谈判桌上，而是在谈判桌外（茶歇、饭局、共同朋友）",
        },
    ],
    "two_styles": {
        "苏联式谈判": {
            "characteristics": ["极端初始立场", "权威有限', '情绪化策略", "把让步视为软弱", "不顾Deadline压力", "把谈判视为零和"],
            "应对": "保持镇定，问校准问题，准备多个选项，永远展示有BATNA，必要时'走出去'冷却",
        },
        "双赢式谈判": {
            "characteristics": ["关注双方需求", "建立信任", "信息共享", "创造选项", "长期关系导向"],
            "适用": "持续合作关系、内部协商、家庭谈判",
        },
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# 史都华·戴蒙德 (Stuart Diamond) —— 《沃顿商学院最受欢迎的谈判课》
# 沃顿商学院教授、普利策奖记者
# ═══════════════════════════════════════════════════════════════════════════

DIAMOND_GETTING_MORE = {
    "name": "史都华·戴蒙德",
    "title": "Getting More (沃顿谈判课)",
    "credentials": "沃顿商学院谈判教授 · 普利策奖记者 · 谷歌/微软等500强谈判顾问",
    "philosophy": (
        "目标比过程重要。注重对方的情感和感知，而非权力或逻辑。"
        "渐进步骤优于宏大方案。"
    ),
    "core_principle": "目标导向 | 关注对方 | 情感至上 | 因情境而变 | 等价交换",
    "twelve_strategies": [
        {"name": "目标至上", "desc": "永远聚焦你想要的——而非展示权力或证明对错"},
        {"name": "关注对方", "desc": "了解对方的图像（他们的视角、需求、约束）"},
        {"name": "进行情感投入", "desc": "情感投入比逻辑分析更重要。对方越情绪化，越要谨慎"},
        {"name": "因情境而变", "desc": "不存在万能策略。每次谈判都不同"},
        {"name": "循序渐进易达成", "desc": "小步前进，建立信任，比一步到位的大方案更易成功"},
        {"name": "交换评价不等的东西", "desc": "你不在乎而对方在乎的东西，是免费筹码"},
        {"name": "弄清对方标准", "desc": "用对方自己的标准/承诺，让他们接受你的方案"},
        {"name": "开诚布公并积极行事", "desc": "操纵和欺骗短期或可奏效，长期必败"},
        {"name": "始终沟通", "desc": "无沟通即失败的开始。即使破裂，也要保持渠道"},
        {"name": "找出真正问题，化为机遇", "desc": "对方真正在乎的问题，往往是隐藏的"},
        {"name": "接受差异", "desc": "差异是创造价值的机会，而非障碍"},
        {"name": "做好准备—列出清单并演练", "desc": "准备清单是高手与新手的分水岭"},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# G. Richard Shell —— 《Bargaining for Advantage》
# 沃顿商学院谈判中心主任
# ═══════════════════════════════════════════════════════════════════════════

SHELL_FIVE_STYLES = {
    "name": "G. Richard Shell",
    "title": "五种谈判风格 (Bargaining for Advantage)",
    "credentials": "沃顿商学院法律研究与商业道德教授 · 高管谈判工作坊创始人",
    "philosophy": "了解自己的谈判风格，才能扬长避短。不同情境需要不同风格。",
    "core_principle": "风格自知 | 情境匹配 | 准备充分 | 信息驱动",
    "styles": [
        {
            "name": "竞争型 (Competing)",
            "trait": "高自我主张，低合作意愿",
            "metaphor": "鲨鱼",
            "好处": "在分配性谈判（零和）中表现出色，单次交易，时间紧迫场景",
            "风险": "破坏长期关系，错失整合机会",
            "适合场景": "买二手货、一次性供应商谈判、对方不愿合作时",
        },
        {
            "name": "回避型 (Avoiding)",
            "trait": "低自我主张，低合作意愿",
            "metaphor": "乌龟",
            "好处": "节省时间精力，避免无意义冲突",
            "风险": "错过创造价值的机会，被视为软弱",
            "适合场景": "议题不重要、关系不值得维护、信息不足时",
        },
        {
            "name": "妥协型 (Compromising)",
            "trait": "中等自我主张，中等合作意愿",
            "metaphor": "狐狸",
            "好处": "快速达成协议，公平感强",
            "风险": "可能错过双赢方案，留下两边都不满意",
            "适合场景": "时间紧、双方地位对等、议题相对简单",
        },
        {
            "name": "迁就型 (Accommodating)",
            "trait": "低自我主张，高合作意愿",
            "metaphor": "泰迪熊",
            "好处": "建立长期关系，积累情感账户",
            "风险": "被强硬对手反复利用",
            "适合场景": "对方议题对你不重要而对他很重要、需要建立信誉时",
        },
        {
            "name": "合作型 (Collaborating)",
            "trait": "高自我主张，高合作意愿",
            "metaphor": "猫头鹰",
            "好处": "创造最大整体价值，建立长期关系",
            "风险": "耗时长，需要双方都愿意合作",
            "适合场景": "复杂议题、长期合作关系、有创造价值空间时",
        },
    ],
    "shell_six_step": [
        "1. 评估你的风格与情境",
        "2. 设定目标与期望（要写下来！）",
        "3. 研究权威标准与规范",
        "4. 研究对方利益与情境",
        "5. 提供让步与达成共识",
        "6. 信息交换与协议",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# 综合实战练习场景 - 应用大师理论的情景训练
# ═══════════════════════════════════════════════════════════════════════════

MASTER_DRILLS = [
    {
        "scenario": "薪资谈判 - HR给你开出23K，比预期低5K",
        "master": "罗杰·道森",
        "best_tactic": "大吃一惊 + 永远不接受第一次报价",
        "wrong_responses": [
            ("23K…我可以接受。", "❌ 立刻接受，对方会怀疑给低了或后悔给高了"),
            ("23K太低了！至少要28K！", "⚠️ 直接对抗，缺乏技巧"),
        ],
        "best_response": (
            "（明显的吃惊，停顿3秒）'23K？'（再停顿）"
            "'说实话，这数字比我预期低了不少。能告诉我这个数字是基于什么考虑的？'"
            "→ 综合运用 Flinch + Vise + 校准问题"
        ),
    },
    {
        "scenario": "供应商坚称'我们最低价就是50万，没有任何空间'",
        "master": "克里斯·沃斯",
        "best_tactic": "镜像 + 标签 + 校准问题",
        "best_response": (
            "Step1 镜像：'没有任何空间？'（上扬语调，沉默）\n"
            "Step2 等对方解释...\n"
            "Step3 标签：'听起来你们这次的成本压力确实很大。'\n"
            "Step4 校准问题：'我们怎么样才能让这件事可行？'\n"
            "→ 把'报价'压力转化为'共同解决问题'"
        ),
    },
    {
        "scenario": "客户立场强硬：'我就是只愿出80万，不行就算了'",
        "master": "费雪 & 尤里",
        "best_tactic": "立场→利益转换",
        "best_response": (
            "不要争论80万本身。问：'我理解80万是您的预算。"
            "我想了解的是——您选择我们的产品，是希望解决什么核心问题？"
            "如果通过调整功能组合，能更好地解决您的问题，您觉得我们值得再聊聊吗？'\n"
            "→ 把对话从'价格立场'拉到'真正需求'"
        ),
    },
    {
        "scenario": "对方说'今天必须签，否则就找别家'（虚假Deadline）",
        "master": "赫伯·科恩",
        "best_tactic": "测试Deadline + 时间元素",
        "best_response": (
            "保持镇定：'我理解时间对你很重要。但我们这边走完审批至少需要3天，"
            "如果这真的是硬截止时间，那我们可能不是合适的合作方。"
            "您能否多给3天，让我们认真对待这件事？'\n"
            "→ 大多数Deadline是可协商的。先测试真假，再让对方付出'延期'成本"
        ),
    },
    {
        "scenario": "复杂商业合作，对方要价远超预算但项目极有价值",
        "master": "史都华·戴蒙德",
        "best_tactic": "交换评价不等的东西",
        "best_response": (
            "列出双方在乎程度不同的'筹码'：\n"
            "  你在乎价格 vs 对方在乎案例曝光权\n"
            "  你在乎付款周期 vs 对方在乎排他性\n"
            "  你在乎质保 vs 对方在乎你的转介绍承诺\n"
            "用对方在乎但你不那么在乎的，换你在乎而对方不那么在乎的。\n"
            "→ 创造价值而非分割价值"
        ),
    },
]


ALL_MASTERS = {
    "1": DAWSON_GAMBITS,
    "2": FISHER_URY_PRINCIPLED,
    "3": VOSS_TACTICAL_EMPATHY,
    "4": COHEN_NEGOTIATE_ANYTHING,
    "5": DIAMOND_GETTING_MORE,
    "6": SHELL_FIVE_STYLES,
}

# ========================================================================
# scenarios.py
# ========================================================================





@dataclass
class ScenarioResult:
    player_score: float
    opponent_score: float
    outcome_label: str
    feedback: str
    key_learning: str
    decisions: List[Dict] = field(default_factory=list)


class PrisonersDilemma:
    """囚徒困境 - Cooperation vs. Defection across multiple rounds."""

    NAME = "囚徒困境"
    DOMAIN = "经典博弈"
    DIFFICULTY = "⭐⭐"
    DESCRIPTION = (
        "您与商业伙伴同时被监管部门约谈。若双方保持沉默（合作），"
        "各损失较少；若您举报对方（背叛），您获得豁免；但若双方互相举报，损失最大。"
    )
    THEORY = "纳什均衡 | 重复博弈 | 针锋相对策略 | 互惠利他主义"

    PAYOFFS = {
        ("合作", "合作"): (3, 3),
        ("合作", "背叛"): (0, 5),
        ("背叛", "合作"): (5, 0),
        ("背叛", "背叛"): (1, 1),
    }

    def run(self, opponent: Opponent, rounds: int = 5) -> ScenarioResult:
        player_total = 0
        opp_total = 0
        player_history: List[str] = []
        opp_history: List[str] = []
        decisions = []

        ui = UI()

        ui.show_scenario_header(self.NAME, self.DOMAIN, self.DIFFICULTY, self.DESCRIPTION)
        ui.show_theory_box(self.THEORY)
        ui.show_payoff_matrix(self.PAYOFFS)

        for r in range(1, rounds + 1):
            ui.show_round_header(r, rounds)
            hint = opponent.get_psychological_hint()
            ui.show_hint(hint)

            player_choice = ui.get_choice(
                f"第{r}轮选择",
                ["合作（保持沉默）", "背叛（举报对方）"],
                ["合作", "背叛"],
            )
            opp_choice = opponent.decide_prisoners_dilemma(player_history)

            p_score, o_score = self.PAYOFFS[(player_choice, opp_choice)]
            player_total += p_score
            opp_total += o_score
            player_history.append(player_choice)
            opp_history.append(opp_choice)

            reaction, tell = opponent.react_to_player_action(player_choice, {})
            ui.show_round_result(
                player_choice, opp_choice, p_score, o_score,
                reaction, tell, opponent.name
            )

            decisions.append({
                "round": r, "player": player_choice, "opponent": opp_choice,
                "player_score": p_score, "opponent_score": o_score,
            })

        # Evaluate performance
        coop_rate = player_history.count("合作") / rounds
        mutual_coop = sum(
            1 for p, o in zip(player_history, opp_history)
            if p == "合作" and o == "合作"
        )

        if player_total >= opp_total and mutual_coop >= rounds // 2:
            label, fb = "双赢策略师", "您成功实现了高度合作，最大化了整体收益！"
        elif player_total > opp_total:
            label, fb = "战略优胜", "您的竞争意识强，但注意长期合作可能带来更高总收益。"
        elif player_total < opp_total * 0.6:
            label, fb = "策略待提升", "您被对手主导了博弈，建议学习针锋相对（Tit-for-Tat）策略。"
        else:
            label, fb = "均衡博弈者", "结果均衡，尝试通过合作信号引导对手进入更高收益状态。"

        key = (
            f"在{rounds}轮博弈中，合作率{coop_rate:.0%}。"
            "最优长期策略：以善意合作开局，镜像对方行为，偶发宽恕以避免永久报复螺旋。"
        )

        return ScenarioResult(player_total, opp_total, label, fb, key, decisions)


class UltimatumGame:
    """最后通牒博弈 - Fairness and power dynamics."""

    NAME = "最后通牒博弈"
    DOMAIN = "公平与权力"
    DIFFICULTY = "⭐⭐"
    DESCRIPTION = (
        "您是提议方，需要决定如何分配100万元资金。"
        "对方可以接受或拒绝——如果拒绝，双方均分文不得。"
        "在多轮中，双方角色交替。"
    )
    THEORY = "公平博弈 | 框架效应 | 最后通牒 | 讨价还价力"

    def run(self, opponent: Opponent, rounds: int = 4) -> ScenarioResult:
        ui = UI()

        ui.show_scenario_header(self.NAME, self.DOMAIN, self.DIFFICULTY, self.DESCRIPTION)
        ui.show_theory_box(self.THEORY)

        player_total = 0
        opp_total = 0
        decisions = []
        TOTAL = 100

        for r in range(1, rounds + 1):
            ui.show_round_header(r, rounds)
            is_proposer = (r % 2 == 1)

            if is_proposer:
                ui.print_info(f"本轮您是【提议方】，分配{TOTAL}万元")
                hint = opponent.get_psychological_hint()
                ui.show_hint(hint)

                offer = ui.get_number_input(
                    f"您给对方分配多少万元？(0-{TOTAL})",
                    0, TOTAL
                )
                my_share = TOTAL - offer
                accepted = opponent.decide_ultimatum_response(offer, TOTAL)
                reaction, tell = opponent.react_to_player_action(
                    "high_offer" if offer >= 40 else "low_offer",
                    {"offer": offer, "total": TOTAL}
                )
                ui.show_ultimatum_result(
                    is_proposer=True, offer=offer, my_share=my_share,
                    accepted=accepted, reaction=reaction, tell=tell,
                    opp_name=opponent.name
                )
                if accepted:
                    player_total += my_share
                    opp_total += offer
                decisions.append({
                    "round": r, "role": "提议方",
                    "offer": offer, "accepted": accepted,
                    "player_gained": my_share if accepted else 0,
                })
            else:
                # Opponent proposes
                opp_demand = random.randint(45, 75)
                their_offer = TOTAL - opp_demand
                ui.print_info(f"本轮对手【{opponent.name}】是提议方")
                ui.print_info(f"对手提议：给您 {their_offer}万元，他们保留 {opp_demand}万元")

                accept = ui.get_choice(
                    "您是否接受？",
                    [f"接受（获得{their_offer}万）", "拒绝（双方都得0）"],
                    ["接受", "拒绝"],
                )
                is_unfair = their_offer < 30
                opponent.react_to_player_action(
                    accept, {"unfair_offer": is_unfair}
                )
                if accept == "接受":
                    player_total += their_offer
                    opp_total += opp_demand
                    ui.print_success(f"您接受了！获得 {their_offer}万元。")
                else:
                    ui.print_warning("您拒绝了！双方均得0万元。")
                decisions.append({
                    "round": r, "role": "响应方",
                    "their_offer": their_offer, "accepted": accept == "接受",
                    "player_gained": their_offer if accept == "接受" else 0,
                })

        max_possible = rounds * TOTAL / 2
        performance = player_total / max(max_possible, 1)

        if performance >= 0.65:
            label = "博弈高手"
            fb = "您的出价策略和响应判断非常出色，最大化了实际收益！"
        elif performance >= 0.4:
            label = "均衡博弈者"
            fb = "表现均衡，但仍有提升空间——出价稍低或拒绝对方低价的时机可以优化。"
        else:
            label = "待优化"
            fb = "提示：理性上应接受任何正值offer；作为提议方，40-50%的分配通常最优。"

        key = (
            "最后通牒博弈揭示：人类不只最大化收益，还追求公平。"
            "实践建议：作为提议方给35-45%；作为响应方，接受20%+的offer（单次博弈）。"
        )

        return ScenarioResult(player_total, opp_total, label, fb, key, decisions)


class TrustGame:
    """信任博弈 - Trust, reciprocity, and reputation."""

    NAME = "信任博弈"
    DOMAIN = "信任与互惠"
    DIFFICULTY = "⭐⭐⭐"
    DESCRIPTION = (
        "您有100积分。您可以选择发送部分积分给对方——发送额将乘以3倍到达对方。"
        "对方决定返还多少给您。这个过程体现信任与互惠的博弈本质。"
    )
    THEORY = "信任博弈 | 互惠性 | 声誉效应 | 社会资本"

    def run(self, opponent: Opponent, rounds: int = 3) -> ScenarioResult:
        ui = UI()

        ui.show_scenario_header(self.NAME, self.DOMAIN, self.DIFFICULTY, self.DESCRIPTION)
        ui.show_theory_box(self.THEORY)

        player_total = 0
        opp_total = 0
        decisions = []
        START = 100
        MULTIPLIER = 3

        for r in range(1, rounds + 1):
            ui.show_round_header(r, rounds)
            player_pool = START
            hint = opponent.get_psychological_hint()
            ui.show_hint(hint)

            ui.print_info(f"您有 {player_pool}积分。发送额将×{MULTIPLIER}到达对方。")
            send = ui.get_number_input("您选择发送多少积分？(0-100)", 0, player_pool)
            received_by_opp = send * MULTIPLIER
            ui.print_info(f"对方收到 {received_by_opp}积分...")

            # Opponent's return decision based on personality and trust
            base_return_rate = {
                PersonalityType.RATIONAL: 0.35,
                PersonalityType.EMOTIONAL: 0.55,
                PersonalityType.AGGRESSIVE: 0.10,
                PersonalityType.COOPERATIVE: 0.60,
                PersonalityType.MANIPULATOR: 0.45 if r <= 1 else 0.15,
                PersonalityType.RISK_AVERSE: 0.40,
            }.get(opponent.personality, 0.35)

            trust_bonus = opponent.state.trust_level * 0.2
            return_rate = min(0.9, base_return_rate + trust_bonus)
            returned = int(received_by_opp * return_rate)

            player_result = (player_pool - send) + returned
            opp_result = received_by_opp - returned

            player_total += player_result - START  # Net gain/loss
            opp_total += opp_result

            reaction, tell = opponent.react_to_player_action(
                "合作" if send > 30 else "背叛",
                {"send": send, "risk_level": send / player_pool}
            )
            ui.show_trust_result(
                send=send, received_by_opp=received_by_opp,
                returned=returned, player_result=player_result,
                reaction=reaction, tell=tell, opp_name=opponent.name,
                return_rate=return_rate
            )

            decisions.append({
                "round": r, "sent": send,
                "multiplied": received_by_opp, "returned": returned,
                "net_gain": player_result - START,
            })

        avg_send = sum(d["sent"] for d in decisions) / len(decisions) / START
        avg_return = sum(d["returned"] for d in decisions) / max(
            sum(d["multiplied"] for d in decisions), 1)

        if avg_send > 0.5 and avg_return > 0.4:
            label, fb = "信任大师", "您建立了高信任循环，实现了最优社会收益！"
        elif avg_send < 0.2:
            label, fb = "零信任策略", "过度保守：不发送虽然安全，但错失了高倍回报机会。"
        else:
            label, fb = "审慎信任者", "策略合理，建议逐步提高初始发送量测试对方回报意愿。"

        key = (
            f"平均发送率{avg_send:.0%}，平均获得回报率{avg_return:.0%}。"
            "信任博弈的精髓：没有信任就没有合作收益，但盲目信任容易被背叛。"
            "理性信任策略：小额试探→根据回报调整→建立声誉锁定循环。"
        )

        return ScenarioResult(player_total, opp_total, label, fb, key, decisions)


class BargainingGame:
    """讨价还价博弈 - Multi-round negotiation with deadline pressure."""

    NAME = "商业谈判博弈"
    DOMAIN = "商业谈判"
    DIFFICULTY = "⭐⭐⭐⭐"
    DESCRIPTION = (
        "您正在就一项商业合同进行谈判。您的心理底价为60万，对手的底价为70万。"
        "双方都不知道对方底价。谈判有轮次限制，超时双方谈判破裂。"
    )
    THEORY = "讨价还价理论 | BATNA | 锚定效应 | 时间压力 | 让步策略"

    def run(self, opponent: Opponent, max_rounds: int = 6) -> ScenarioResult:
        ui = UI()

        ui.show_scenario_header(self.NAME, self.DOMAIN, self.DIFFICULTY, self.DESCRIPTION)
        ui.show_theory_box(self.THEORY)

        PLAYER_RESERVE = 60   # Minimum player is willing to accept
        OPP_RESERVE = 70      # Minimum opponent will accept (player doesn't know)
        ZOPA = (OPP_RESERVE, 100)  # Zone of Possible Agreement (unknown to player)

        decisions = []
        deal_price = None
        opp_offer = None
        player_total = 0
        opp_total = 0

        ui.print_info(f"您的底价（保密）：{PLAYER_RESERVE}万 | 谈判轮次上限：{max_rounds}轮")
        ui.print_info("提示：对方底价未知，尝试通过出价和反应来推断。")

        for r in range(1, max_rounds + 1):
            ui.show_round_header(r, max_rounds)
            urgency_note = ""
            if r >= max_rounds - 1:
                urgency_note = "【⚠️ 最后机会！谈判即将到期！】"
                ui.print_warning(urgency_note)

            hint = opponent.get_psychological_hint()
            ui.show_hint(hint)

            # Player makes offer (how much they ask for)
            player_ask = ui.get_number_input(
                f"您的出价（您要求获得多少万元？底价{PLAYER_RESERVE}万）",
                PLAYER_RESERVE, 200
            )

            opp_offer = opponent.make_bargaining_offer(
                r, max_rounds, OPP_RESERVE, player_ask
            )

            reaction, tell = opponent.react_to_player_action(
                "高报价" if player_ask > 120 else "低报价",
                {"risk_level": 0.5}
            )

            ui.show_bargaining_round(
                r, player_ask, opp_offer, reaction, tell, opponent.name
            )

            decisions.append({
                "round": r, "player_ask": player_ask, "opp_offer": opp_offer
            })

            # Check if deal is possible
            if player_ask <= opp_offer:
                deal_price = (player_ask + opp_offer) // 2
                break
            elif abs(player_ask - opp_offer) <= 5:
                ui.print_info("差距已很小，继续谈判...")
            else:
                gap = player_ask - opp_offer
                ui.print_warning(f"当前差距：{gap}万，继续谈判...")

        if deal_price:
            player_total = deal_price - PLAYER_RESERVE
            opp_total = deal_price - OPP_RESERVE
            label = "成功达成协议"
            fb = f"在第{len(decisions)}轮达成协议：{deal_price}万元。"
            if deal_price <= 75:
                fb += " 优秀！您争取到了接近对方底线的价格。"
            elif deal_price <= 85:
                fb += " 良好的谈判结果，双方都在合理范围内。"
            else:
                fb += " 协议达成，但价格偏高——下次可以更强硬地坚守低出价。"
        else:
            label = "谈判破裂"
            fb = f"未能在{max_rounds}轮内达成协议。"
            if decisions:
                last_gap = abs(decisions[-1]["player_ask"] - decisions[-1].get("opp_offer", 0))
                if last_gap <= 10:
                    fb += f" 最后差距仅{last_gap}万，临门一脚的让步可能促成协议。"
                else:
                    fb += " 双方立场差距过大，需要更大的让步幅度。"

        key = (
            "谈判要点：①首次出价要高（锚定效应）②有条件让步③掌握BATNA④"
            "时间压力下适当加速让步⑤关注对方反应推断底价。"
        )

        return ScenarioResult(player_total, opp_total, label, fb, key, decisions)


class CrisisNegotiation:
    """危机谈判 - High-stakes narrative crisis scenarios."""

    NAME = "危机谈判"
    DOMAIN = "危机处理"
    DIFFICULTY = "⭐⭐⭐⭐⭐"
    DESCRIPTION = (
        "紧急情况：一名不满员工在公司大楼内威胁要公开泄露机密数据。"
        "您作为谈判代表，需要通过正确的沟通策略化解危机，"
        "保护公司利益同时尊重对方诉求。"
    )
    THEORY = "危机谈判 | 积极倾听 | 需求层次 | 去激化技术 | 情感调节"

    STAGES = [
        {
            "situation": "对方情绪极度激动，扬言10分钟内发布数据",
            "question": "您的第一句话是什么？",
            "options": [
                ("我理解您现在很愤怒，我想先听听您的诉求。", "共情回应", 20, "积极倾听：共情打开沟通渠道"),
                ("泄露数据是违法行为，将面临严重法律后果！", "威胁", -15, "错误！威胁只会激化对方"),
                ("请冷静！我们可以谈，但不是这种方式。", "要求冷静", 5, "部分有效，但'冷静'指令常适得其反"),
                ("您需要什么？公司愿意考虑合理要求。", "直接谈条件", 10, "有效，但过早谈条件可能显得软弱"),
            ],
        },
        {
            "situation": "对方透露真实诉求：被不公正解雇，要求恢复职务或赔偿",
            "question": "如何回应诉求？",
            "options": [
                ("我听到了，这听起来确实不公平。能告诉我更多吗？", "深度倾听", 20, "完美！扩展理解，建立信任"),
                ("恢复职务不可能，但赔偿可以讨论。", "直接谈判", 8, "可以，但过快否定可能关闭谈判"),
                ("我会把您的诉求转达给CEO，他有决定权。", "转移责任", -5, "危机中'转移'会让对方感觉被敷衍"),
                ("公司做了彻查，解雇程序完全合规。", "辩护立场", -20, "错误！此刻辩护是火上浇油"),
            ],
        },
        {
            "situation": "对方开始动摇，但还有顾虑：'上次HR欺骗了我'",
            "question": "如何重建信任？",
            "options": [
                ("我理解您对HR失去信任。这次我以个人名义承诺，过程完全透明。", "个人承诺", 25, "建立个人信任锚点，高效！"),
                ("HR那次确实处理不当，我代表公司道歉。", "道歉", 15, "有效道歉，但需小心法律含义"),
                ("您可以带律师来，全程录音录像。", "提供保证机制", 20, "给予可核实保证，降低对方风险感"),
                ("过去的事不重要，现在我们专注解决方案。", "回避过去", -10, "错误！无视过去创伤会破坏信任"),
            ],
        },
        {
            "situation": "接近解决，对方要求书面保证15分钟内送达",
            "question": "如何处理截止时间压力？",
            "options": [
                ("我现在就起草，10分钟内给您。但需要您同时停止倒计时。", "互惠承诺", 25, "互换承诺创造共同利益"),
                ("15分钟太短，我需要至少30分钟走流程。", "要求更多时间", 5, "诚实，但可能重新激化紧张"),
                ("好，15分钟。（同时暗中报警）", "欺骗策略", -30, "危机谈判绝对禁止欺骗！"),
                ("我来负责，文件10分钟到，您的诉求我个人担保推进。", "个人担保", 20, "有效的个人信任+时间管理"),
            ],
        },
    ]

    def run(self, opponent: Opponent, *args) -> ScenarioResult:
        ui = UI()

        ui.show_scenario_header(self.NAME, self.DOMAIN, self.DIFFICULTY, self.DESCRIPTION)
        ui.show_theory_box(self.THEORY)

        total_score = 0
        decisions = []
        max_score = sum(max(o[2] for o in s["options"]) for s in self.STAGES)

        for i, stage in enumerate(self.STAGES, 1):
            ui.show_crisis_stage(i, len(self.STAGES), stage["situation"])
            hint = opponent.get_psychological_hint()
            ui.show_hint(hint)

            options_display = [o[0] for o in stage["options"]]
            labels = [o[1] for o in stage["options"]]
            choice_idx = ui.get_choice_index(
                stage["question"],
                [f"[{labels[j]}] {options_display[j]}" for j in range(len(options_display))]
            )

            chosen = stage["options"][choice_idx]
            score = chosen[2]
            explanation = chosen[3]
            total_score += max(0, score)

            ui.show_crisis_feedback(
                chosen[0], chosen[1], score, explanation,
                positive=(score > 0)
            )

            decisions.append({
                "stage": i, "choice": chosen[0],
                "tactic": chosen[1], "score": score
            })

        performance_pct = total_score / max_score if max_score > 0 else 0

        if performance_pct >= 0.8:
            label = "危机谈判专家"
            fb = "卓越表现！您的选择完美体现了共情、信任建立和利益导向原则。"
        elif performance_pct >= 0.6:
            label = "合格谈判者"
            fb = "总体表现良好，建议深入学习积极倾听和情感共鸣技术。"
        elif performance_pct >= 0.4:
            label = "谈判新手"
            fb = "有改进空间。危机谈判核心：先处理情绪，再处理事情。"
        else:
            label = "危机应对不足"
            fb = "关键错误：使用了威胁、回避或欺骗策略。危机谈判需要更多共情和信任建立。"

        key = (
            "危机谈判五原则：①共情先于说服②积极倾听胜过演讲"
            "③承认对方感受④给予可核实承诺⑤绝不欺骗。"
        )

        return ScenarioResult(
            total_score, max_score - total_score, label, fb, key, decisions
        )


class PublicGoodsGame:
    """公共品博弈 - Collective action and free-rider problem."""

    NAME = "公共品博弈"
    DOMAIN = "集体行动"
    DIFFICULTY = "⭐⭐⭐"
    DESCRIPTION = (
        "4人团队共同投资一个项目。每人有100积分，可选择贡献0-100积分到公共池。"
        "公共池总额×2后平均分配给所有成员（无论是否贡献）。"
        "这模拟了集体行动中的搭便车问题。"
    )
    THEORY = "公共品博弈 | 搭便车问题 | 集体行动困境 | 惩罚机制 | 社会规范"

    def run(self, opponent: Opponent, rounds: int = 4) -> ScenarioResult:
        ui = UI()

        ui.show_scenario_header(self.NAME, self.DOMAIN, self.DIFFICULTY, self.DESCRIPTION)
        ui.show_theory_box(self.THEORY)

        ENDOWMENT = 100
        MULTIPLIER = 2.0
        N_PLAYERS = 4  # 1 player + 3 AI

        player_cumulative = 0
        decisions = []

        # Generate 3 AI teammates
        ai_types = random.sample([
            PersonalityType.COOPERATIVE,
            PersonalityType.RATIONAL,
            PersonalityType.AGGRESSIVE,
        ], 3)
        ai_opponents = [get_opponent(t) for t in ai_types]

        for r in range(1, rounds + 1):
            ui.show_round_header(r, rounds)
            hint = "提示：若所有人都贡献50，每人净收益50积分；若只有你贡献，你净亏损。"
            ui.show_hint(hint)

            player_contrib = ui.get_number_input(
                f"您愿意贡献多少积分到公共池？(0-{ENDOWMENT}，个人保留{ENDOWMENT}-X)",
                0, ENDOWMENT
            )

            # AI contributions
            ai_contribs = []
            for ai in ai_opponents:
                base = {
                    PersonalityType.COOPERATIVE: 60,
                    PersonalityType.RATIONAL: 30,
                    PersonalityType.AGGRESSIVE: 10,
                }.get(ai.personality, 35)
                noise = random.randint(-15, 15)
                contrib = max(0, min(ENDOWMENT, base + noise))
                ai_contribs.append(contrib)

            total_pool = player_contrib + sum(ai_contribs)
            total_return = total_pool * MULTIPLIER
            each_return = total_return / N_PLAYERS

            player_round = (ENDOWMENT - player_contrib) + each_return
            player_net = player_round - ENDOWMENT
            player_cumulative += player_net

            ui.show_public_goods_result(
                player_contrib, ai_contribs, ai_opponents,
                total_pool, each_return, player_round, player_net
            )

            decisions.append({
                "round": r,
                "player_contrib": player_contrib,
                "ai_contribs": ai_contribs,
                "total_pool": total_pool,
                "each_return": each_return,
                "player_net": player_net,
            })

        avg_contrib = sum(d["player_contrib"] for d in decisions) / rounds
        contrib_rate = avg_contrib / ENDOWMENT

        if contrib_rate >= 0.5 and player_cumulative > 0:
            label = "集体主义者"
            fb = "您的高贡献促进了集体收益！这是社会最优策略。"
        elif contrib_rate <= 0.2:
            label = "搭便车者"
            fb = "您采用了个人最优策略（低贡献），但如果人人如此，总收益崩溃。"
        else:
            label = "条件合作者"
            fb = "您的贡献策略较为均衡。真实实验中，惩罚机制是维持高合作的关键。"

        key = (
            f"平均贡献率{contrib_rate:.0%}。公共品博弈揭示：个人理性≠集体理性。"
            "现实解决方案：透明公示贡献额、社会惩罚搭便车者、建立声誉机制。"
        )

        return ScenarioResult(player_cumulative, 0, label, fb, key, decisions)


class CoalitionGame:
    """联盟博弈 - Alliance formation and political negotiation."""

    NAME = "联盟谈判"
    DOMAIN = "政治/组织博弈"
    DIFFICULTY = "⭐⭐⭐⭐"
    DESCRIPTION = (
        "董事会投票：需要3票（共5票）通过一项影响重大的战略决策。"
        "您掌握1票，需要通过谈判拉拢其他董事。每位董事有不同的利益诉求。"
    )
    THEORY = "联盟博弈 | 夏普利值 | 议价能力 | 关键票 | 多方谈判"

    DIRECTORS = [
        {"name": "财务总监 王明", "votes": 1, "need": "保证财务稳健，不削减预算",
         "price": 30, "personality": "理性分析型", "bribe_accept": 45},
        {"name": "技术副总 李华", "votes": 1, "need": "增加研发投入",
         "price": 25, "personality": "合作共赢型", "bribe_accept": 35},
        {"name": "销售总监 张强", "votes": 1, "need": "扩大销售提成",
         "price": 40, "personality": "强硬鹰派型", "bribe_accept": 55},
        {"name": "独立董事 赵静", "votes": 1, "need": "确保合规和透明度",
         "price": 20, "personality": "风险规避型", "bribe_accept": 30},
    ]

    def run(self, opponent: Opponent, *args) -> ScenarioResult:
        ui = UI()

        ui.show_scenario_header(self.NAME, self.DOMAIN, self.DIFFICULTY, self.DESCRIPTION)
        ui.show_theory_box(self.THEORY)

        BUDGET = 100  # Concession budget
        votes_secured = 1  # Player's own vote
        remaining_budget = BUDGET
        decisions = []
        secured_allies = []

        ui.print_info(f"您的谈判资源：{BUDGET}单位 | 目标：争取至少2位董事支持（共需3票）")
        ui.show_directors_table(self.DIRECTORS)

        for director in self.DIRECTORS:
            if votes_secured >= 3:
                ui.print_success(f"已获得足够票数，跳过后续谈判！")
                break

            ui.show_coalition_target(director)
            hint = f"心理提示：{director['personality']}需要{director['need']}，建议资源投入：{director['price']}单位"
            ui.show_hint(hint)

            action = ui.get_choice(
                f"对 {director['name']} 的策略",
                [
                    f"满足核心诉求（承诺{director['need']}，成本~{director['price']}单位）",
                    f"部分妥协（小幅让步，节省资源）",
                    "诉诸共同利益（战略愿景说服）",
                    "跳过，不与此人谈判",
                ],
                ["full_concede", "partial", "vision", "skip"]
            )

            if action == "full_concede":
                cost = director["price"]
                success = remaining_budget >= cost
                if success:
                    remaining_budget -= cost
                    votes_secured += 1
                    secured_allies.append(director["name"])
                    ui.print_success(f"成功！{director['name']} 同意支持。（消耗{cost}资源，剩余{remaining_budget}）")
                else:
                    ui.print_error(f"资源不足！需要{cost}单位，您只剩{remaining_budget}单位。")
                decisions.append({"target": director["name"], "action": "满足诉求",
                                  "success": success, "cost": cost if success else 0})

            elif action == "partial":
                cost = director["price"] // 2
                accept_chance = 0.4
                success = random.random() < accept_chance and remaining_budget >= cost
                if success:
                    remaining_budget -= cost
                    votes_secured += 1
                    secured_allies.append(director["name"])
                    ui.print_success(f"对方勉强接受！消耗{cost}资源。")
                else:
                    ui.print_warning(f"{director['name']} 拒绝了部分让步，认为诚意不足。")
                decisions.append({"target": director["name"], "action": "部分妥协",
                                  "success": success, "cost": cost if success else 0})

            elif action == "vision":
                success_chance = {
                    "合作共赢型": 0.7, "理性分析型": 0.35,
                    "强硬鹰派型": 0.15, "风险规避型": 0.45
                }.get(director["personality"], 0.4)
                success = random.random() < success_chance
                if success:
                    votes_secured += 1
                    secured_allies.append(director["name"])
                    ui.print_success(f"{director['name']} 被您的愿景打动，零成本支持！")
                else:
                    ui.print_warning(f"{director['name']} 不为愿景所动，需要具体承诺。")
                decisions.append({"target": director["name"], "action": "战略说服",
                                  "success": success, "cost": 0})
            else:
                ui.print_info(f"跳过 {director['name']}")
                decisions.append({"target": director["name"], "action": "跳过",
                                  "success": False, "cost": 0})

        won = votes_secured >= 3
        efficiency = 1.0 - (BUDGET - remaining_budget) / BUDGET if won else 0

        if won and efficiency >= 0.5:
            label = "联盟大师"
            fb = f"以最低成本（{BUDGET - remaining_budget}资源）完成联盟！高效率谈判。"
        elif won:
            label = "联盟达成"
            fb = f"成功获得{votes_secured}票！但成本较高，下次尝试战略说服节省资源。"
        else:
            label = "联盟失败"
            fb = f"仅获得{votes_secured}票，未达到3票门槛。"
            if remaining_budget > 40:
                fb += " 您保守了过多资源，应该更积极投入关键联盟。"
            else:
                fb += " 资源分配策略需优化，优先攻克成本最低的关键票。"

        key = (
            "联盟博弈要点：①识别关键票（价格最低的决定性票）"
            "②夏普利值原则：每票的议价价值取决于其对联盟的边际贡献"
            "③战略说服（零成本）优先于资源让步。"
        )

        return ScenarioResult(
            votes_secured * 20, 0, label, fb, key, decisions
        )


SCENARIO_REGISTRY = {
    "1": (PrisonersDilemma, "囚徒困境", "⭐⭐", "经典博弈"),
    "2": (UltimatumGame, "最后通牒博弈", "⭐⭐", "公平与权力"),
    "3": (TrustGame, "信任博弈", "⭐⭐⭐", "信任与互惠"),
    "4": (BargainingGame, "商业谈判博弈", "⭐⭐⭐⭐", "商业谈判"),
    "5": (CrisisNegotiation, "危机谈判", "⭐⭐⭐⭐⭐", "危机处理"),
    "6": (PublicGoodsGame, "公共品博弈", "⭐⭐⭐", "集体行动"),
    "7": (CoalitionGame, "联盟谈判", "⭐⭐⭐⭐", "政治/组织博弈"),
}

# ========================================================================
# ui.py
# ========================================================================




console = Console()


class UI:
    def __init__(self):
        self.c = console

    # ── Basic output ──────────────────────────────────────────────────────────

    def print_info(self, msg: str):
        self.c.print(f"  [cyan]{msg}[/cyan]")

    def print_success(self, msg: str):
        self.c.print(f"  [bold green]✓ {msg}[/bold green]")

    def print_warning(self, msg: str):
        self.c.print(f"  [bold yellow]⚠ {msg}[/bold yellow]")

    def print_error(self, msg: str):
        self.c.print(f"  [bold red]✗ {msg}[/bold red]")

    def divider(self, title: str = ""):
        self.c.print(Rule(title, style="dim"))

    def pause(self, seconds: float = 0.8):
        time.sleep(seconds)

    def wait_enter(self, msg: str = "按 [Enter] 继续..."):
        self.c.print(f"\n  [dim]{msg}[/dim]")
        input()

    # ── Welcome & Title ───────────────────────────────────────────────────────

    def show_welcome(self):
        self.c.clear()
        title = Text()
        title.append("全谱系博弈实战演练系统\n", style="bold cyan")
        title.append("Full-Spectrum Game Theory Training System", style="dim cyan")
        self.c.print(Panel(
            Align.center(title),
            border_style="bold blue",
            padding=(1, 4),
        ))
        self.c.print()
        features = Table(show_header=False, box=box.SIMPLE, padding=(0, 2))
        features.add_column("icon", style="cyan", width=3)
        features.add_column("feature", style="white")
        for icon, feat in [
            ("⚔", "7大博弈场景  —  从囚徒困境到危机谈判"),
            ("🧠", "6种AI对手  —  各具独特心理特征"),
            ("🎓", "6位谈判大师  —  道森/费雪/沃斯/科恩等"),
            ("🔍", "实时心理分析  —  识别自身行为模式"),
            ("📚", "10大策略卡 + 大师战术  —  实战技术全集"),
            ("📊", "战绩追踪  —  可视化成长进度"),
        ]:
            features.add_row(icon, feat)
        self.c.print(Align.center(features))
        self.c.print()

    def show_main_menu(self, player_name: str, rank: str, sessions: int) -> str:
        self.c.print(Rule(f"[bold cyan]主菜单[/bold cyan]", style="blue"))
        status = Table(show_header=False, box=None, padding=(0, 1))
        status.add_column(width=20)
        status.add_column()
        status.add_row("[dim]玩家[/dim]", f"[bold white]{player_name}[/bold white]")
        status.add_row("[dim]段位[/dim]", f"[yellow]{rank}[/yellow]")
        status.add_row("[dim]总场次[/dim]", f"[green]{sessions}[/green]")
        self.c.print(status)
        self.c.print()

        menu_items = [
            ("1", "⚔  开始博弈训练", "选择场景与对手进行实战"),
            ("2", "📖  策略知识库", "学习博弈理论与谈判技术"),
            ("3", "🧠  心理档案分析", "查看您的心理画像与盲点"),
            ("4", "📊  战绩与进度", "查看历史战绩和成长分析"),
            ("5", "🔧  快速训练模式", "随机场景+随机对手快速练习"),
            ("0", "🚪  退出系统", ""),
        ]

        table = Table(box=box.ROUNDED, border_style="blue", show_header=False, padding=(0, 2))
        table.add_column("键", style="bold cyan", width=4)
        table.add_column("功能", style="white", width=20)
        table.add_column("说明", style="dim", width=30)
        for key, name, desc in menu_items:
            table.add_row(key, name, desc)
        self.c.print(table)
        self.c.print()

        choice = Prompt.ask("  [bold cyan]请选择[/bold cyan]",
                            choices=["0", "1", "2", "3", "4", "5"],
                            default="1")
        return choice

    # ── Scenario display ──────────────────────────────────────────────────────

    def show_scenario_selection(self, registry: dict) -> str:
        self.c.print(Rule("[bold cyan]选择博弈场景[/bold cyan]", style="blue"))
        table = Table(box=box.ROUNDED, border_style="blue", padding=(0, 1))
        table.add_column("编号", style="bold cyan", width=6)
        table.add_column("场景名称", style="white", width=18)
        table.add_column("难度", width=8)
        table.add_column("领域", style="dim", width=12)
        for key, (_, name, diff, domain) in registry.items():
            table.add_row(key, name, diff, domain)
        self.c.print(table)
        self.c.print()
        choices = list(registry.keys())
        return Prompt.ask("  [bold cyan]请选择场景编号[/bold cyan]", choices=choices)

    def show_opponent_selection(self) -> str:
        self.c.print(Rule("[bold cyan]选择对手类型[/bold cyan]", style="blue"))
        table = Table(box=box.ROUNDED, border_style="blue", padding=(0, 1))
        table.add_column("编号", style="bold cyan", width=6)
        table.add_column("对手类型", style="white", width=16)
        table.add_column("核心特征", style="dim")
        mapping = {}
        for i, (ptype, profile) in enumerate(PERSONALITY_PROFILES.items(), 1):
            table.add_row(str(i), ptype.value, "  ".join(profile["traits"][:2]))
            mapping[str(i)] = ptype
        table.add_row("0", "随机对手", "随机分配一位对手")
        self.c.print(table)
        self.c.print()
        choice = Prompt.ask("  [bold cyan]请选择[/bold cyan]",
                            choices=["0"] + [str(i) for i in range(1, len(mapping) + 1)])
        return choice, mapping

    def show_scenario_header(self, name: str, domain: str, diff: str, desc: str):
        self.c.clear()
        self.c.print(Panel(
            f"[bold cyan]{name}[/bold cyan]  [yellow]{diff}[/yellow]  [dim]{domain}[/dim]\n\n"
            f"[white]{desc}[/white]",
            border_style="blue",
            title="[bold]场景说明[/bold]",
            padding=(1, 2),
        ))

    def show_theory_box(self, theory: str):
        self.c.print(Panel(
            f"[dim cyan]相关理论：[/dim cyan][yellow]{theory}[/yellow]",
            border_style="dim",
            padding=(0, 1),
        ))
        self.c.print()

    def show_payoff_matrix(self, payoffs: dict):
        table = Table(title="收益矩阵", box=box.SIMPLE_HEAD, border_style="dim")
        table.add_column("我 \\ 对手", style="cyan", width=12)
        table.add_column("对手合作", justify="center", width=12)
        table.add_column("对手背叛", justify="center", width=12)
        for my_action in ["合作", "背叛"]:
            cc = payoffs.get((my_action, "合作"), (0, 0))
            cd = payoffs.get((my_action, "背叛"), (0, 0))
            table.add_row(
                f"我{my_action}",
                f"[green]我:{cc[0]} 他:{cc[1]}[/green]",
                f"[red]我:{cd[0]} 他:{cd[1]}[/red]",
            )
        self.c.print(table)
        self.c.print()

    # ── Round display ─────────────────────────────────────────────────────────

    def show_round_header(self, round_n: int, total: int):
        self.c.print()
        self.c.print(Rule(f"[cyan]第 {round_n} / {total} 轮[/cyan]", style="dim"))

    def show_hint(self, hint: str):
        if hint:
            self.c.print(f"  [dim yellow]💡 {hint}[/dim yellow]")

    def show_round_result(self, player: str, opp: str, p_score: int, o_score: int,
                          reaction: str, tell: str, opp_name: str):
        self.c.print()
        result_table = Table(box=box.SIMPLE, show_header=True, padding=(0, 2))
        result_table.add_column("角色", style="cyan", width=12)
        result_table.add_column("选择", width=8)
        result_table.add_column("得分", width=8)
        result_table.add_row("您", player,
                             f"[{'green' if p_score >= 3 else 'red'}]{p_score}[/]")
        result_table.add_row(opp_name, opp,
                             f"[{'green' if o_score >= 3 else 'red'}]{o_score}[/]")
        self.c.print(result_table)
        self.c.print(Panel(
            f"[italic]{reaction}[/italic]\n[dim]（心理观察：{tell}）[/dim]",
            title=f"[dim]{opp_name} 的反应[/dim]",
            border_style="dim",
            padding=(0, 1),
        ))

    # ── Specific scenario displays ────────────────────────────────────────────

    def show_ultimatum_result(self, is_proposer: bool, offer: int, my_share: int,
                              accepted: bool, reaction: str, tell: str, opp_name: str):
        self.c.print()
        status = "[bold green]接受✓[/bold green]" if accepted else "[bold red]拒绝✗[/bold red]"
        self.c.print(Panel(
            f"您给对方：[cyan]{offer}万[/cyan]  |  您保留：[cyan]{my_share}万[/cyan]\n"
            f"对方决定：{status}\n\n"
            f"[italic]{reaction}[/italic]\n[dim]（{tell}）[/dim]",
            title=f"[dim]{opp_name} 的回应[/dim]",
            border_style="blue" if accepted else "red",
            padding=(0, 1),
        ))

    def show_trust_result(self, send: int, received_by_opp: int, returned: int,
                          player_result: int, reaction: str, tell: str,
                          opp_name: str, return_rate: float):
        color = "green" if player_result >= 100 else "red"
        net = player_result - 100
        self.c.print(Panel(
            f"您发送：[cyan]{send}积分[/cyan] → 对方收到：[cyan]{received_by_opp}积分[/cyan] (×3)\n"
            f"对方返还：[cyan]{returned}积分[/cyan] (回报率{return_rate:.0%})\n"
            f"您本轮结余：[{color}]{player_result}积分[/{color}]  "
            f"（净{'赚' if net>=0 else '亏'}[{color}]{abs(net)}[/{color}]）\n\n"
            f"[italic]{reaction}[/italic]\n[dim]（{tell}）[/dim]",
            title=f"[dim]{opp_name} 的回应[/dim]",
            border_style="blue",
            padding=(0, 1),
        ))

    def show_bargaining_round(self, round_n: int, player_ask: int, opp_offer: int,
                              reaction: str, tell: str, opp_name: str):
        gap = player_ask - opp_offer
        gap_color = "red" if gap > 20 else "yellow" if gap > 5 else "green"
        self.c.print(Panel(
            f"您的要价：[cyan]{player_ask}万[/cyan]  |  "
            f"{opp_name}出价：[cyan]{opp_offer}万[/cyan]  |  "
            f"差距：[{gap_color}]{gap}万[/{gap_color}]\n\n"
            f"[italic]{reaction}[/italic]\n[dim]（{tell}）[/dim]",
            title=f"[dim]第{round_n}轮报价[/dim]",
            border_style="yellow",
            padding=(0, 1),
        ))

    def show_public_goods_result(self, player_contrib: int, ai_contribs: List[int],
                                 ai_opponents, total_pool: int,
                                 each_return: float, player_round: float, net: float):
        table = Table(box=box.SIMPLE, show_header=True, padding=(0, 2))
        table.add_column("成员", style="cyan", width=16)
        table.add_column("贡献", justify="right", width=8)
        table.add_row("您", f"[white]{player_contrib}[/white]")
        for ai, contrib in zip(ai_opponents, ai_contribs):
            table.add_row(ai.name, str(contrib))
        table.add_row("[bold]公共池总额[/bold]", f"[bold yellow]{total_pool}[/bold yellow]")
        table.add_row("[bold]每人获得[/bold]", f"[bold green]{each_return:.1f}[/bold green]")
        self.c.print(table)
        net_color = "green" if net >= 0 else "red"
        self.c.print(f"  您本轮结算：[{net_color}]{'+' if net>0 else ''}{net:.1f}积分[/{net_color}]")

    def show_crisis_stage(self, stage_n: int, total: int, situation: str):
        self.c.print()
        self.c.print(Panel(
            f"[bold red]紧急情况[/bold red]  阶段 {stage_n}/{total}\n\n"
            f"[white]{situation}[/white]",
            border_style="red",
            padding=(0, 1),
        ))

    def show_crisis_feedback(self, choice: str, tactic: str, score: int,
                             explanation: str, positive: bool):
        color = "green" if positive else "red"
        icon = "✓" if positive else "✗"
        score_str = f"+{score}" if score > 0 else str(score)
        self.c.print(Panel(
            f"[{color}]{icon} 策略：{tactic}  ({score_str}分)[/{color}]\n\n"
            f"[dim]{explanation}[/dim]",
            border_style=color,
            padding=(0, 1),
        ))

    def show_directors_table(self, directors: List[dict]):
        table = Table(box=box.ROUNDED, border_style="blue", padding=(0, 1))
        table.add_column("董事", style="cyan", width=16)
        table.add_column("诉求", style="white", width=22)
        table.add_column("类型", style="dim", width=12)
        table.add_column("参考成本", justify="right", width=8)
        for d in directors:
            table.add_row(d["name"], d["need"], d["personality"], str(d["price"]))
        self.c.print(table)
        self.c.print()

    def show_coalition_target(self, director: dict):
        self.c.print(Panel(
            f"[bold cyan]{director['name']}[/bold cyan]  [{director['personality']}]\n"
            f"核心诉求：[yellow]{director['need']}[/yellow]",
            border_style="dim",
            padding=(0, 1),
        ))

    # ── Input methods ─────────────────────────────────────────────────────────

    def get_choice(self, prompt: str, options: List[str], values: List[str]) -> str:
        self.c.print(f"\n  [bold cyan]{prompt}[/bold cyan]")
        for i, (opt, val) in enumerate(zip(options, values), 1):
            self.c.print(f"    [cyan]{i}.[/cyan] {opt}")
        self.c.print()
        choices = [str(i) for i in range(1, len(options) + 1)]
        raw = Prompt.ask("  [bold cyan]输入编号[/bold cyan]", choices=choices)
        return values[int(raw) - 1]

    def get_choice_index(self, prompt: str, options: List[str]) -> int:
        self.c.print(f"\n  [bold cyan]{prompt}[/bold cyan]")
        for i, opt in enumerate(options, 1):
            self.c.print(f"    [cyan]{i}.[/cyan] {opt}")
        self.c.print()
        choices = [str(i) for i in range(1, len(options) + 1)]
        raw = Prompt.ask("  [bold cyan]输入编号[/bold cyan]", choices=choices)
        return int(raw) - 1

    def get_number_input(self, prompt: str, min_val: int, max_val: int) -> int:
        self.c.print(f"\n  [bold cyan]{prompt}[/bold cyan]")
        while True:
            try:
                val = IntPrompt.ask(f"  [cyan]输入 {min_val}-{max_val}[/cyan]")
                if min_val <= val <= max_val:
                    return val
                self.print_warning(f"请输入 {min_val} 到 {max_val} 之间的数字")
            except (ValueError, KeyboardInterrupt):
                self.print_warning("无效输入，请重试")

    def get_player_name(self) -> str:
        self.c.print()
        name = Prompt.ask("  [bold cyan]请输入您的代号（昵称）[/bold cyan]",
                          default="训练者")
        return name.strip() or "训练者"

    # ── Results display ───────────────────────────────────────────────────────

    def show_scenario_result(self, result, scenario_name: str, opp_name: str):
        self.c.print()
        self.c.print(Rule("[bold cyan]本局总结[/bold cyan]", style="blue"))

        score_color = "green" if result.player_score >= result.opponent_score else "yellow"
        self.c.print(Panel(
            f"[bold yellow]{result.outcome_label}[/bold yellow]\n\n"
            f"您的得分：[{score_color}]{result.player_score:.1f}[/{score_color}]  |  "
            f"对手得分：[dim]{result.opponent_score:.1f}[/dim]\n\n"
            f"[white]{result.feedback}[/white]",
            title=f"[bold]{scenario_name} 对阵 {opp_name}[/bold]",
            border_style="yellow",
            padding=(1, 2),
        ))
        self.c.print(Panel(
            f"[dim cyan]📚 关键学习：[/dim cyan]\n[white]{result.key_learning}[/white]",
            border_style="dim",
            padding=(0, 1),
        ))

    def show_psychology_report(self, report: dict):
        self.c.print(Rule("[bold cyan]心理档案分析[/bold cyan]", style="blue"))
        ptype = report["profile_type"]
        pdata = report["profile_data"]

        # Profile type
        self.c.print(Panel(
            f"[bold {pdata['style']}]{ptype}[/bold {pdata['style']}]\n\n"
            f"[white]{pdata['description']}[/white]\n\n"
            f"[green]优势：[/green]{', '.join(pdata['strengths'])}\n"
            f"[yellow]注意：[/yellow]{', '.join(pdata['weaknesses'][:1])}\n"
            f"[cyan]建议：[/cyan]{pdata['advice']}",
            title="[bold]您的心理类型[/bold]",
            border_style="blue",
            padding=(1, 2),
        ))

        # Dimension bars
        dims_table = Table(title="心理维度分析", box=box.SIMPLE, padding=(0, 1))
        dims_table.add_column("维度", style="cyan", width=12)
        dims_table.add_column("分布图", width=25)
        dims_table.add_column("数值", justify="right", width=6)
        for dim, val in report["dimensions"].items():
            bar = generate_progress_bar(val, 1.0, 20)
            color = "green" if val >= 0.6 else "yellow" if val >= 0.35 else "red"
            dims_table.add_row(dim, f"[{color}]{bar}[/{color}]", f"{val:.2f}")
        self.c.print(dims_table)

        # Insights
        self.c.print()
        for insight in report["insights"]:
            color = {"warning": "yellow", "info": "blue", "success": "green"}.get(
                insight["type"], "white")
            self.c.print(Panel(
                f"[white]{insight['body']}[/white]\n[dim]{insight['score_impact']}[/dim]",
                title=f"[{color}]{insight['title']}[/{color}]",
                border_style=color,
                padding=(0, 1),
            ))

        # Blind spots
        self.c.print()
        blind_spots = report["blind_spots"]
        bs_text = "\n".join(f"• {b}" for b in blind_spots)
        self.c.print(Panel(
            bs_text,
            title="[yellow]⚠ 心理盲点[/yellow]",
            border_style="yellow",
            padding=(0, 1),
        ))

    def show_strategy_library(self, cards: list, techniques: list, defenses: list):
        self.c.print(Rule("[bold cyan]策略知识库[/bold cyan]", style="blue"))
        menu = [
            ("1", "博弈与谈判策略卡"),
            ("2", "沟通技术手册"),
            ("3", "心理防御手册"),
            ("4", "🎓 谈判大师理论库（道森/费雪/沃斯等）"),
            ("5", "💡 大师实战演练（情景应用）"),
            ("0", "返回主菜单"),
        ]
        table = Table(box=box.SIMPLE, show_header=False)
        table.add_column("键", style="cyan", width=4)
        table.add_column("内容")
        for k, v in menu:
            table.add_row(k, v)
        self.c.print(table)
        choice = Prompt.ask("  选择", choices=["0", "1", "2", "3", "4", "5"])

        if choice == "1":
            self._show_strategy_cards(cards)
        elif choice == "2":
            self._show_techniques(techniques)
        elif choice == "3":
            self._show_defenses(defenses)
        elif choice == "4":
            self._show_master_library()
        elif choice == "5":
            self._show_master_drills()

    def _show_master_library(self):
        self.c.print(Rule("[bold cyan]🎓 谈判大师理论库[/bold cyan]", style="blue"))
        table = Table(box=box.ROUNDED, border_style="blue", padding=(0, 1))
        table.add_column("编号", style="bold cyan", width=6)
        table.add_column("大师", style="white", width=14)
        table.add_column("代表作", style="yellow", width=30)
        table.add_column("核心思想", style="dim")
        for k, m in ALL_MASTERS.items():
            table.add_row(k, m["name"], m["title"], m["core_principle"])
        table.add_row("0", "返回上级", "", "")
        self.c.print(table)
        choice = Prompt.ask("  [bold cyan]选择大师[/bold cyan]",
                            choices=["0"] + list(ALL_MASTERS.keys()))
        if choice == "0":
            return
        self._show_single_master(ALL_MASTERS[choice])

    def _show_single_master(self, master: dict):
        self.c.clear()
        self.c.print(Panel(
            f"[bold cyan]{master['name']}[/bold cyan]\n"
            f"[yellow]{master['title']}[/yellow]\n\n"
            f"[dim]{master['credentials']}[/dim]\n\n"
            f"[italic white]\"{master['philosophy']}\"[/italic white]\n\n"
            f"[bold cyan]核心原则：[/bold cyan][white]{master['core_principle']}[/white]",
            border_style="blue", padding=(1, 2),
            title="[bold]大师档案[/bold]",
        ))

        # Roger Dawson - gambits structure
        if "gambits" in master:
            for stage_name, gambits in master["gambits"].items():
                self.c.print()
                self.c.print(Rule(f"[bold yellow]{stage_name}[/bold yellow]", style="dim"))
                for g in gambits:
                    body = (
                        f"[bold yellow]法则：[/bold yellow][white]{g['rule']}[/white]\n"
                        f"[green]为什么有效：[/green][dim]{g['why']}[/dim]\n"
                        f"[red]注意：[/red][dim]{g['warning']}[/dim]\n"
                        f"[magenta]实例：[/magenta][italic]{g['example']}[/italic]"
                    )
                    if "counter" in g:
                        body += f"\n[cyan]破解：[/cyan][dim]{g['counter']}[/dim]"
                    self.c.print(Panel(
                        body,
                        title=f"[bold]⚔ {g['name']}[/bold]",
                        border_style="yellow", padding=(0, 1),
                    ))

        # Fisher & Ury - four principles
        if "four_principles" in master:
            for p in master["four_principles"]:
                self.c.print()
                techs = "\n".join(f"  • {t}" for t in p.get("techniques", []))
                body = (
                    f"[white]{p['core']}[/white]\n\n"
                    f"[cyan]技巧：[/cyan]\n{techs}\n\n"
                    f"[magenta]实例：[/magenta][italic dim]{p.get('example', '')}[/italic dim]"
                )
                if "barriers" in p:
                    body += f"\n[red]障碍：[/red][dim]{' · '.join(p['barriers'])}[/dim]"
                self.c.print(Panel(
                    body, title=f"[bold green]原则：{p['name']}[/bold green]",
                    border_style="green", padding=(0, 1),
                ))
            if "key_concepts" in master:
                self.c.print()
                for name, desc in master["key_concepts"].items():
                    self.c.print(Panel(
                        f"[white]{desc}[/white]",
                        title=f"[bold]{name}[/bold]",
                        border_style="cyan", padding=(0, 1),
                    ))

        # Chris Voss - techniques
        if "techniques" in master:
            for t in master["techniques"]:
                self.c.print()
                body = (
                    f"[bold yellow]法则：[/bold yellow][white]{t['rule']}[/white]\n"
                    f"[green]为什么有效：[/green][dim]{t.get('why', '')}[/dim]\n"
                )
                if "example" in t:
                    body += f"[magenta]实例：[/magenta][italic]{t['example']}[/italic]\n"
                if "examples" in t:
                    ex = "\n".join(f"  • {e}" for e in t["examples"])
                    body += f"[magenta]实例：[/magenta]\n{ex}\n"
                if "tips" in t:
                    tps = "\n".join(f"  • {tp}" for tp in t["tips"])
                    body += f"[cyan]要点：[/cyan]\n{tps}\n"
                if "techniques" in t:
                    sub = "\n".join(f"  • {s}" for s in t["techniques"])
                    body += f"[cyan]步骤：[/cyan]\n{sub}\n"
                if "warning" in t:
                    body += f"[red]注意：[/red][dim]{t['warning']}[/dim]"
                self.c.print(Panel(
                    body.rstrip(),
                    title=f"[bold cyan]🧠 {t['name']}[/bold cyan]",
                    border_style="cyan", padding=(0, 1),
                ))

        # Herb Cohen - three elements + two styles
        if "three_elements" in master:
            for elem in master["three_elements"]:
                self.c.print()
                lines = []
                if "sources" in elem:
                    lines = elem["sources"]
                elif "principles" in elem:
                    lines = elem["principles"]
                elif "rules" in elem:
                    lines = elem["rules"]
                body_lines = "\n".join(f"  • {l}" for l in lines)
                body = (
                    f"[white]{elem['core']}[/white]\n\n"
                    f"[cyan]要点：[/cyan]\n{body_lines}"
                )
                if "rule" in elem:
                    body += f"\n\n[yellow]法则：[/yellow][white]{elem['rule']}[/white]"
                if "tip" in elem:
                    body += f"\n[magenta]提示：[/magenta][dim]{elem['tip']}[/dim]"
                if "example" in elem:
                    body += f"\n[magenta]实例：[/magenta][italic dim]{elem['example']}[/italic dim]"
                self.c.print(Panel(
                    body, title=f"[bold]🔑 {elem['name']}[/bold]",
                    border_style="magenta", padding=(0, 1),
                ))
            if "two_styles" in master:
                self.c.print()
                for sname, sdata in master["two_styles"].items():
                    chars = " · ".join(sdata["characteristics"])
                    extra = sdata.get("应对", sdata.get("适用", ""))
                    extra_label = "应对" if "应对" in sdata else "适用"
                    self.c.print(Panel(
                        f"[dim]{chars}[/dim]\n\n[cyan]{extra_label}：[/cyan]{extra}",
                        title=f"[bold]{sname}[/bold]",
                        border_style="yellow", padding=(0, 1),
                    ))

        # Stuart Diamond - 12 strategies
        if "twelve_strategies" in master:
            self.c.print()
            t = Table(title="12条核心策略", box=box.ROUNDED, border_style="blue")
            t.add_column("#", style="cyan", width=4)
            t.add_column("策略", style="bold yellow", width=18)
            t.add_column("说明", style="white")
            for i, s in enumerate(master["twelve_strategies"], 1):
                t.add_row(str(i), s["name"], s["desc"])
            self.c.print(t)

        # Shell - five styles + six steps
        if "styles" in master:
            self.c.print()
            t = Table(title="五种谈判风格", box=box.ROUNDED, border_style="blue")
            t.add_column("风格", style="bold cyan", width=18)
            t.add_column("象征", style="yellow", width=8)
            t.add_column("特征", style="dim", width=22)
            t.add_column("适合场景", style="green")
            for s in master["styles"]:
                t.add_row(s["name"], s["metaphor"], s["trait"], s["适合场景"])
            self.c.print(t)
            for s in master["styles"]:
                self.c.print(Panel(
                    f"[green]优势：[/green]{s['好处']}\n"
                    f"[red]风险：[/red]{s['风险']}",
                    title=f"[bold]{s['metaphor']} {s['name']}[/bold]",
                    border_style="cyan", padding=(0, 1),
                ))
            if "shell_six_step" in master:
                self.c.print()
                steps = "\n".join(f"  {step}" for step in master["shell_six_step"])
                self.c.print(Panel(
                    steps, title="[bold]Shell 六步谈判流程[/bold]",
                    border_style="green", padding=(0, 1),
                ))

    def _show_master_drills(self):
        self.c.print(Rule("[bold cyan]💡 大师实战演练[/bold cyan]", style="blue"))
        self.c.print("  [dim]每个情景对应一位大师的招牌战术。先思考你会怎么回应，再看专家答案。[/dim]\n")

        for i, drill in enumerate(MASTER_DRILLS, 1):
            self.c.print(Panel(
                f"[bold red]情景 {i}：[/bold red][white]{drill['scenario']}[/white]",
                border_style="red", padding=(0, 1),
            ))
            self.c.print(f"  [dim]💭 请先在心中构思你会怎么回应...[/dim]")
            self.wait_enter("按 [Enter] 查看大师答案...")

            self.c.print(Panel(
                f"[bold yellow]推荐大师：[/bold yellow][cyan]{drill['master']}[/cyan]\n"
                f"[bold yellow]核心战术：[/bold yellow][green]{drill['best_tactic']}[/green]\n\n"
                f"[bold]✓ 最佳回应：[/bold]\n[white]{drill['best_response']}[/white]",
                title="[bold green]✓ 大师方案[/bold green]",
                border_style="green", padding=(1, 2),
            ))
            if "wrong_responses" in drill:
                for resp, why in drill["wrong_responses"]:
                    self.c.print(Panel(
                        f"[dim italic]\"{resp}\"[/dim italic]\n[red]{why}[/red]",
                        title="[red]✗ 常见错误[/red]",
                        border_style="red", padding=(0, 1),
                    ))
            self.c.print()

    def _show_strategy_cards(self, cards: list):
        self.c.print(Rule("[cyan]策略卡列表[/cyan]", style="dim"))
        for card in cards:
            self.c.print(Panel(
                f"[yellow]核心：[/yellow][white]{card['core']}[/white]\n"
                f"[cyan]适用：[/cyan][dim]{card['when_to_use']}[/dim]\n"
                f"[green]优点：[/green]{' | '.join(card['pros'][:2])}\n"
                f"[red]注意：[/red]{card['cons'][0]}\n"
                f"[magenta]进阶：[/magenta][dim]{card['advanced']}[/dim]\n\n"
                f"[dim italic]实例：{card['example'][:80]}...[/dim italic]"
                if len(card['example']) > 80 else
                f"[yellow]核心：[/yellow][white]{card['core']}[/white]\n"
                f"[cyan]适用：[/cyan][dim]{card['when_to_use']}[/dim]\n"
                f"[green]优点：[/green]{' | '.join(card['pros'][:2])}\n"
                f"[red]注意：[/red]{card['cons'][0]}\n"
                f"[magenta]进阶：[/magenta][dim]{card['advanced']}[/dim]\n\n"
                f"[dim italic]实例：{card['example']}[/dim italic]",
                title=f"[bold cyan]{card['id']}  {card['name']}[/bold cyan]  "
                      f"[dim]{card['category']}[/dim]",
                border_style="blue",
                padding=(0, 1),
            ))

    def _show_techniques(self, techniques: list):
        self.c.print(Rule("[cyan]沟通技术[/cyan]", style="dim"))
        for t in techniques:
            self.c.print(Panel(
                f"[white]{t['desc']}[/white]\n[cyan]法则：[/cyan][dim]{t['rule']}[/dim]",
                title=f"[bold]{t['name']}[/bold]",
                border_style="cyan",
                padding=(0, 1),
            ))

    def _show_defenses(self, defenses: list):
        self.c.print(Rule("[cyan]心理防御手册[/cyan]", style="dim"))
        for d in defenses:
            self.c.print(Panel(
                f"[yellow]应对：[/yellow][white]{d['defense']}[/white]",
                title=f"[red]攻势：{d['attack']}[/red]",
                border_style="yellow",
                padding=(0, 1),
            ))

    def show_performance_dashboard(self, player, profile_type: str):
        self.c.print(Rule("[bold cyan]战绩与成长分析[/bold cyan]", style="blue"))

        rank = get_rank(player.total_sessions, player.get_avg_score())

        # Header stats
        stats = Table(box=box.ROUNDED, border_style="blue", padding=(0, 2))
        stats.add_column("指标", style="cyan", width=14)
        stats.add_column("数值", style="bold white", width=12)
        stats.add_row("段位", rank)
        stats.add_row("总场次", str(player.total_sessions))
        stats.add_row("平均得分", f"{player.get_avg_score():.1f}")
        stats.add_row("心理类型", profile_type)
        stats.add_row("最多练习", player.get_favorite_scenario())
        self.c.print(stats)

        # Mastery
        mastery = get_scenario_mastery(player)
        if mastery:
            self.c.print()
            mt = Table(title="场景掌握度", box=box.SIMPLE, padding=(0, 1))
            mt.add_column("场景", style="cyan", width=16)
            mt.add_column("掌握度", width=8)
            mt.add_column("次数", justify="right", width=6)
            for sc, level in mastery.items():
                color = {"精通": "green", "熟练": "yellow", "了解": "blue"}.get(level, "dim")
                mt.add_row(sc, f"[{color}]{level}[/{color}]",
                           str(player.scenario_counts.get(sc, 0)))
            self.c.print(mt)

        # Recent sessions
        if player.sessions:
            self.c.print()
            rt = Table(title="最近训练记录", box=box.SIMPLE, padding=(0, 1))
            rt.add_column("时间", style="dim", width=14)
            rt.add_column("场景", style="cyan", width=16)
            rt.add_column("对手", width=12)
            rt.add_column("结果", width=10)
            rt.add_column("得分", justify="right", width=8)
            for session in player.sessions[-6:]:
                score = session.get("player_score", 0)
                opp_score = session.get("opponent_score", 0)
                result_color = "green" if score >= opp_score else "red"
                result = "胜" if score > opp_score else "败" if score < opp_score else "平"
                rt.add_row(
                    session.get("timestamp", "")[:10],
                    session.get("scenario", ""),
                    session.get("opponent_type", ""),
                    f"[{result_color}]{result}[/{result_color}]",
                    f"{score:.0f}",
                )
            self.c.print(rt)

# ========================================================================
# main.py
# ========================================================================






def run_scenario(ui: UI, player: PlayerData, analyzer: PsychologicalAnalyzer):
    """Main scenario training loop."""
    # Select scenario
    scenario_key = ui.show_scenario_selection(SCENARIO_REGISTRY)
    ScenarioClass, name, diff, domain = SCENARIO_REGISTRY[scenario_key]

    # Select opponent
    choice, mapping = ui.show_opponent_selection()
    if choice == "0":
        opponent = random_opponent()
    else:
        opponent = get_opponent(mapping[choice])

    # Show opponent profile before battle
    profile = PERSONALITY_PROFILES[opponent.personality]
    ui.c.print()
    console.print(f"  [bold]对手：[cyan]{opponent.name}[/cyan][/bold]  [dim]{opponent.personality.value}[/dim]")
    console.print(f"  [dim]{profile['description']}[/dim]")
    console.print(f"  [yellow]弱点：[/yellow][dim]{profile['weakness']}[/dim]")
    console.print(f"  [cyan]心理告示：[/cyan][dim]{' | '.join(profile['tells'])}[/dim]")
    ui.wait_enter()

    # Run scenario
    scenario = ScenarioClass()
    result = scenario.run(opponent)

    # Display result
    ui.show_scenario_result(result, name, opponent.name)

    # Record to analytics
    analyzer.record_decision(
        scenario=name,
        action="complete",
        context={"risk_level": 0.5},
        outcome=result.outcome_label,
        score_delta=result.player_score - result.opponent_score,
    )

    record = SessionRecord(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
        scenario=name,
        opponent_type=opponent.personality.value,
        player_score=result.player_score,
        opponent_score=result.opponent_score,
        outcome=result.outcome_label,
        rounds=len(result.decisions),
    )
    player.add_session(record)
    save_player(player)

    # Show opponent-specific tips
    tips = analyzer.get_negotiation_tips_for_opponent(opponent.personality.value)
    console.print()
    console.print(Panel(
        "\n".join(f"• {t}" for t in tips),
        title=f"[cyan]应对 {opponent.personality.value} 的专项技巧[/cyan]",
        border_style="cyan",
        padding=(0, 1),
    ))
    ui.wait_enter()


def run_quick_training(ui: UI, player: PlayerData, analyzer: PsychologicalAnalyzer):
    """Quick training with random scenario and opponent."""
    scenario_key = random.choice(list(SCENARIO_REGISTRY.keys()))
    ScenarioClass, name, diff, domain = SCENARIO_REGISTRY[scenario_key]
    opponent = random_opponent()

    console.print(f"\n  [bold cyan]快速训练模式[/bold cyan]")
    console.print(f"  场景：[yellow]{name}[/yellow]  |  对手：[yellow]{opponent.name}[/yellow]")
    ui.wait_enter("按 [Enter] 开始...")

    scenario = ScenarioClass()
    result = scenario.run(opponent)
    ui.show_scenario_result(result, name, opponent.name)

    analyzer.record_decision(
        scenario=name, action="complete",
        context={"risk_level": 0.5},
        outcome=result.outcome_label,
        score_delta=result.player_score - result.opponent_score,
    )
    record = SessionRecord(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
        scenario=name,
        opponent_type=opponent.personality.value,
        player_score=result.player_score,
        opponent_score=result.opponent_score,
        outcome=result.outcome_label,
        rounds=len(result.decisions),
    )
    player.add_session(record)
    save_player(player)
    ui.wait_enter()


def main():
    ui = UI()

    # Welcome screen
    ui.show_welcome()
    player_name = ui.get_player_name()

    # Load or create player
    player = load_player(player_name)
    analyzer = PsychologicalAnalyzer()

    console.print(f"\n  [green]欢迎回来，[bold]{player_name}[/bold]！[/green]" if
                  player.total_sessions > 0 else
                  f"\n  [green]欢迎加入训练系统，[bold]{player_name}[/bold]！[/green]")
    ui.pause(0.5)

    # Main loop
    while True:
        try:
            rank = get_rank(player.total_sessions, player.get_avg_score())
            choice = ui.show_main_menu(player_name, rank, player.total_sessions)

            if choice == "0":
                console.print("\n  [dim]感谢训练！愿您在谈判和博弈中所向披靡。[/dim]\n")
                sys.exit(0)

            elif choice == "1":
                run_scenario(ui, player, analyzer)

            elif choice == "2":
                ui.show_strategy_library(
                    STRATEGY_CARDS,
                    COMMUNICATION_TECHNIQUES,
                    PSYCHOLOGICAL_DEFENSE_TACTICS,
                )
                ui.wait_enter()

            elif choice == "3":
                if analyzer.profile.cooperation_rate == 0.0 and len(analyzer.records) == 0:
                    console.print(
                        "\n  [yellow]您还没有足够的训练数据。请先完成至少2场博弈训练，"
                        "心理档案将更加准确。[/yellow]"
                    )
                    ui.wait_enter()
                else:
                    report = analyzer.get_full_report()
                    ui.show_psychology_report(report)
                    ui.wait_enter()

            elif choice == "4":
                profile_type = analyzer.get_profile_type()
                ui.show_performance_dashboard(player, profile_type)
                ui.wait_enter()

            elif choice == "5":
                run_quick_training(ui, player, analyzer)

        except KeyboardInterrupt:
            console.print("\n\n  [dim]训练已中断。[/dim]\n")
            sys.exit(0)
        except Exception as e:
            console.print(f"\n  [red]发生错误：{e}[/red]")
            console.print("  [dim]请按 Enter 返回主菜单...[/dim]")
            input()


if __name__ == "__main__":
    main()
