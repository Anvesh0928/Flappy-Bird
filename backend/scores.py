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


def get_top_scores(limit: int = 10) -> List[Dict[str, Any]]:
    """Return top scores sorted descending."""
    scores = load_scores()
    scores.sort(key=lambda s: s.get("score", 0), reverse=True)
    return scores[:limit]


def add_score(player_name: str, score: int) -> Dict[str, Any]:
    """
    Validate, add a new score entry, sort, and persist.
    Returns the created entry.
    """
    clean_name = (player_name or "Anonymous").strip()[:15] or "Anonymous"
    valid_score = max(0, min(int(score), 999999))

    new_entry = {
        "name": clean_name,
        "score": valid_score,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

    scores = load_scores()
    scores.append(new_entry)
    scores.sort(key=lambda s: s.get("score", 0), reverse=True)
    # Keep top 50 records to prevent unbounded file growth
    scores = scores[:50]

    save_scores(scores)
    return new_entry

