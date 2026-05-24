#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Performance Analytics - track progress and generate insights over time."""

import json
import os
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
from datetime import datetime


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


DATA_FILE = os.path.join(os.path.dirname(__file__), "player_data.json")


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
