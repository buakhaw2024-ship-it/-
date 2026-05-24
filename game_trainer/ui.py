#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Terminal UI - Rich-based display components."""

from typing import List, Dict, Optional, Tuple
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.progress import Progress, BarColumn, TextColumn
from rich.prompt import Prompt, IntPrompt
from rich.columns import Columns
from rich import box
from rich.rule import Rule
from rich.align import Align
import time


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
            ("🔍", "实时心理分析  —  识别自身行为模式"),
            ("📚", "10大策略卡  —  实战谈判技术"),
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
        from opponents import PersonalityType, PERSONALITY_PROFILES
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
        from analytics import generate_progress_bar
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
            ("0", "返回主菜单"),
        ]
        table = Table(box=box.SIMPLE, show_header=False)
        table.add_column("键", style="cyan", width=4)
        table.add_column("内容")
        for k, v in menu:
            table.add_row(k, v)
        self.c.print(table)
        choice = Prompt.ask("  选择", choices=["0", "1", "2", "3"])

        if choice == "1":
            self._show_strategy_cards(cards)
        elif choice == "2":
            self._show_techniques(techniques)
        elif choice == "3":
            self._show_defenses(defenses)

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
        from analytics import get_rank, generate_progress_bar, get_scenario_mastery
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
