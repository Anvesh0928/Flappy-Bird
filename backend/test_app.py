"""
Unit Tests for Underwater Flappy Backend API.
Uses Python's built-in unittest framework (zero external test dependencies required).
"""

import unittest
import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import app
import scores

class BackendApiTests(unittest.TestCase):
    def setUp(self):
        """Create a test client before each test."""
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_health_check(self):
        """Verify the health check endpoint returns status online."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "online")
        self.assertIn("service", data)

    def test_get_scores(self):
        """Verify fetching scores returns a valid list."""
        res = self.client.get("/api/scores")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIsInstance(data.get("scores"), list)

    def test_post_valid_score(self):
        """Verify submitting a valid score adds it to the leaderboard."""
        payload = {"name": "TestDiver", "score": 42}
        res = self.client.post("/api/scores", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["record"]["name"], "TestDiver")
        self.assertEqual(data["record"]["score"], 42)

    def test_post_invalid_score_format(self):
        """Verify submitting a non-integer score returns HTTP 400."""
        payload = {"name": "Cheater", "score": "invalid_string"}
        res = self.client.post("/api/scores", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get("success"))

    def test_serve_index(self):
        """Verify root route serves the HTML index file."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Ocean Rush", res.data)

    def test_score_sanitization(self):
        """Verify player names are trimmed and capped to 15 characters."""
        entry = scores.add_score("VeryLongPlayerNameExceedingLimit", 5)
        self.assertLessEqual(len(entry["name"]), 15)

    def test_single_rank_per_player_updates_on_new_record(self):
        """Verify a player keeps only one leaderboard entry and moves up only on a higher score."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            orig_file = scores.SCORES_FILE
            scores.SCORES_FILE = Path(tmp) / "scores.json"
            try:
                scores.save_scores([
                    {"name": "Alpha", "score": 30, "date": "2026-11-11"},
                    {"name": "Beta", "score": 20, "date": "2026-11-11"},
                ])
                # Lower score for Beta should not duplicate or lower Beta's rank
                scores.add_score("beta", 8)
                top = scores.get_top_scores(10)
                self.assertEqual([s["name"] for s in top], ["Alpha", "Beta"])
                self.assertEqual(top[1]["score"], 20)

                # Breaking own record moves Beta to #1 without duplicating
                scores.add_score("Beta", 50)
                top = scores.get_top_scores(10)
                self.assertEqual([(s["name"], s["score"]) for s in top], [("Beta", 50), ("Alpha", 30)])
            finally:
                scores.SCORES_FILE = orig_file

if __name__ == "__main__":
    unittest.main()

