"""
Score Service: Handles loading, saving, and querying high scores.
Persists data to backend/data/scores.json.
"""

import json
from datetime import datetime
from typing import List, Dict, Any
from config import SCORES_FILE

DEFAULT_SCORES: List[Dict[str, Any]] = [
    {"name": "Submariner", "score": 10, "date": "2026-11-09"},
    {"name": "AquaDiver", "score": 7, "date": "2026-11-09"},
    {"name": "Nautilus", "score": 5, "date": "2026-11-09"},
    {"name": "DeepSea", "score": 3, "date": "2026-11-09"},
    {"name": "Rookie", "score": 1, "date": "2026-11-09"}
]


def load_scores() -> List[Dict[str, Any]]:
    """Load scores from the JSON file, or initialize with defaults if missing."""
    if not SCORES_FILE.exists():
        save_scores(DEFAULT_SCORES)
        return DEFAULT_SCORES

    try:
        with open(SCORES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return DEFAULT_SCORES
    except (json.JSONDecodeError, OSError):
        return DEFAULT_SCORES


def save_scores(scores: List[Dict[str, Any]]) -> bool:
    """Save score list to the JSON file safely."""
    try:
        with open(SCORES_FILE, "w", encoding="utf-8") as f:
            json.dump(scores, f, indent=2)
        return True
    except OSError:
        return False


def _dedupe_best_scores(scores: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keep only each player's highest score (case-insensitive) sorted descending."""
    best_by_player: Dict[str, Dict[str, Any]] = {}
    for entry in scores:
        name = str(entry.get("name") or "Anonymous").strip()[:15] or "Anonymous"
        key = name.lower()
        score_val = max(0, min(int(entry.get("score", 0)), 999999))
        existing = best_by_player.get(key)
        if existing is None or score_val > existing["score"]:
            best_by_player[key] = {
                "name": name,
                "score": score_val,
                "date": entry.get("date", "")
            }

    unique_scores = list(best_by_player.values())
    unique_scores.sort(key=lambda s: s["score"], reverse=True)
    return unique_scores


def get_top_scores(limit: int = 10) -> List[Dict[str, Any]]:
    """Return top unique-player scores sorted descending."""
    return _dedupe_best_scores(load_scores())[:limit]


def add_score(player_name: str, score: int) -> Dict[str, Any]:
    """
    Validate and upsert a player's best score, keep one rank per player, and persist.
    Returns the player's current best record.
    """
    clean_name = (player_name or "Anonymous").strip()[:15] or "Anonymous"
    valid_score = max(0, min(int(score), 999999))
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    scores = _dedupe_best_scores(load_scores())
    key = clean_name.lower()
    existing = next((s for s in scores if s["name"].lower() == key), None)

    if existing is None:
        record = {"name": clean_name, "score": valid_score, "date": now_str}
        scores.append(record)
    elif valid_score > existing["score"]:
        existing["name"] = clean_name
        existing["score"] = valid_score
        existing["date"] = now_str
        record = existing
    else:
        record = existing

    scores.sort(key=lambda s: s["score"], reverse=True)
    # Keep top 50 unique players to prevent unbounded file growth
    scores = scores[:50]

    save_scores(scores)
    return record

