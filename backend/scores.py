"""
Score Service: Handles loading, saving, and querying high scores.
Persists top 10 unique-player records to backend/data/scores.json.
"""

import json
from datetime import datetime
from typing import List, Dict, Any
from config import SCORES_FILE

ALLOWED_SKINS = {"MANTA", "SUBMARINE", "SHARK", "ANGLER"}
MAX_LEADERBOARD_SIZE = 10

DEFAULT_SCORES: List[Dict[str, Any]] = [
    {"name": "Submariner", "score": 10, "skin": "SUBMARINE", "date": "2026-11-09"},
    {"name": "AquaDiver", "score": 7, "skin": "MANTA", "date": "2026-11-09"},
    {"name": "Nautilus", "score": 5, "skin": "SHARK", "date": "2026-11-09"},
    {"name": "DeepSea", "score": 3, "skin": "MANTA", "date": "2026-11-09"},
    {"name": "Rookie", "score": 1, "skin": "MANTA", "date": "2026-11-09"}
]


def _dedupe_best_per_player(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keep only the single highest score per player name (case-insensitive), sorted descending."""
    best_by_player: Dict[str, Dict[str, Any]] = {}
    for entry in entries:
        name = str(entry.get("name", "Anonymous")).strip()[:15] or "Anonymous"
        key = name.lower()
        score_val = int(entry.get("score", 0))
        raw_skin = str(entry.get("skin", "MANTA")).upper()
        skin_val = raw_skin if raw_skin in ALLOWED_SKINS else "MANTA"
        existing = best_by_player.get(key)
        if existing is None or score_val > int(existing.get("score", 0)):
            best_by_player[key] = {**entry, "name": name, "score": score_val, "skin": skin_val}

    result = list(best_by_player.values())
    result.sort(key=lambda s: s.get("score", 0), reverse=True)
    return result


def load_scores() -> List[Dict[str, Any]]:
    """Load scores from the JSON file, or initialize with defaults if missing."""
    if not SCORES_FILE.exists():
        save_scores(DEFAULT_SCORES)
        return list(DEFAULT_SCORES)

    try:
        with open(SCORES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return _dedupe_best_per_player(data)[:MAX_LEADERBOARD_SIZE]
            return list(DEFAULT_SCORES)
    except (json.JSONDecodeError, OSError):
        return list(DEFAULT_SCORES)


def save_scores(scores: List[Dict[str, Any]]) -> bool:
    """Save score list to the JSON file safely."""
    try:
        with open(SCORES_FILE, "w", encoding="utf-8") as f:
            json.dump(scores[:MAX_LEADERBOARD_SIZE], f, indent=2)
        return True
    except OSError:
        return False


def get_top_scores(limit: int = MAX_LEADERBOARD_SIZE, period: str = "all") -> List[Dict[str, Any]]:
    """Return top 10 unique-player scores sorted descending, optionally filtered by today's date."""
    scores = load_scores()
    if period == "today":
        today_prefix = datetime.now().strftime("%Y-%m-%d")
        scores = [s for s in scores if str(s.get("date", "")).startswith(today_prefix)]

    capped_limit = max(1, min(limit, MAX_LEADERBOARD_SIZE))
    return scores[:capped_limit]


def get_score_rank(score: int) -> int:
    """Calculate 1-based leaderboard rank for a given score."""
    scores = load_scores()
    higher_count = sum(1 for s in scores if s.get("score", 0) > score)
    return higher_count + 1


def add_score(player_name: str, score: int, skin: str = "MANTA") -> Dict[str, Any]:
    """
    Update player's personal best on the Top 10 leaderboard.
    Never creates duplicate entries for the same player; only updates if the new score is higher.
    """
    clean_name = (player_name or "Anonymous").strip()[:15] or "Anonymous"
    valid_score = max(0, min(int(score), 999999))
    clean_skin = skin.upper() if isinstance(skin, str) and skin.upper() in ALLOWED_SKINS else "MANTA"

    scores = load_scores()
    key = clean_name.lower()
    existing_idx = next((i for i, s in enumerate(scores) if s.get("name", "").lower() == key), None)

    new_entry = {
        "name": clean_name,
        "score": valid_score,
        "skin": clean_skin,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

    if existing_idx is not None:
        if valid_score > int(scores[existing_idx].get("score", 0)):
            scores[existing_idx] = new_entry
        else:
            # Keep player's existing higher record
            return scores[existing_idx]
    else:
        scores.append(new_entry)

    scores = _dedupe_best_per_player(scores)[:MAX_LEADERBOARD_SIZE]
    save_scores(scores)
    return new_entry
