#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AI Opponent System - 6 distinct psychological personality types"""

import random
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
from enum import Enum


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
