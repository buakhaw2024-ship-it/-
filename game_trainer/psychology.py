#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Psychological Profiler - analyze player behavior patterns and generate insights"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
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
