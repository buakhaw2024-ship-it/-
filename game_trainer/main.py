#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全谱系博弈实战演练系统
Full-Spectrum Game Theory & Negotiation Training System

Usage:
    python main.py
"""

import sys
import random
from datetime import datetime

from rich.prompt import Prompt

from ui import UI, console
from opponents import PersonalityType, get_opponent, random_opponent, PERSONALITY_PROFILES
from psychology import PsychologicalAnalyzer
from analytics import (
    PlayerData, SessionRecord,
    load_player, save_player, get_rank,
)
from scenarios import SCENARIO_REGISTRY
from strategies import STRATEGY_CARDS, COMMUNICATION_TECHNIQUES, PSYCHOLOGICAL_DEFENSE_TACTICS


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
    from rich.panel import Panel
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
