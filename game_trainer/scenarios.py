#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Game Theory Scenarios - 8 distinct training scenarios across multiple domains"""

import random
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Callable
from enum import Enum

from opponents import Opponent, PersonalityType, get_opponent


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

        from ui import UI
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
        from ui import UI
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
        from ui import UI
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
        from ui import UI
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
        from ui import UI
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
        from ui import UI
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
        from ui import UI
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
