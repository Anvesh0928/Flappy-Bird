"""
Unit Tests for Underwater Flappy Backend API.
Uses Python's built-in unittest framework (zero external test dependencies required).
"""

import unittest
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import app
import scores
from config import SCORES_FILE


class BackendApiTests(unittest.TestCase):
    original_scores = None

    @classmethod
    def setUpClass(cls):
        """Preserve original scores file content to keep tests clean and idempotent."""
        if SCORES_FILE.exists():
            try:
                cls.original_scores = SCORES_FILE.read_text(encoding="utf-8")
            except OSError:
                cls.original_scores = None

    @classmethod
    def tearDownClass(cls):
        """Restore original scores file content after test suite completes."""
        if cls.original_scores is not None:
            try:
                SCORES_FILE.write_text(cls.original_scores, encoding="utf-8")
            except OSError:
                pass

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

    def test_get_scores_today_filter(self):
        """Verify period=today query parameter works."""
        self.client.post("/api/scores", json={"name": "TodayTester", "score": 99, "skin": "SHARK"})
        res = self.client.get("/api/scores?period=today")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("period"), "today")
        self.assertTrue(any(s["name"] == "TodayTester" and s["skin"] == "SHARK" for s in data["scores"]))

    def test_post_valid_score(self):
        """Verify submitting a valid score adds it to the leaderboard with rank and skin."""
        payload = {"name": "TestDiver", "score": 42, "skin": "SUBMARINE"}
        res = self.client.post("/api/scores", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["record"]["name"], "TestDiver")
        self.assertEqual(data["record"]["score"], 42)
        self.assertEqual(data["record"]["skin"], "SUBMARINE")
        self.assertIsInstance(data.get("rank"), int)
        self.assertGreaterEqual(data["rank"], 1)

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
        self.assertIn(b"Underwater Flappy", res.data)

    def test_serve_mobile_assets(self):
        """Verify mobile PWA manifest and app icon are served."""
        manifest_res = self.client.get("/manifest.json")
        self.assertEqual(manifest_res.status_code, 200)
        self.assertIn(b"standalone", manifest_res.data)

        icon_res = self.client.get("/icon.svg")
        self.assertEqual(icon_res.status_code, 200)
        self.assertIn(b"<svg", icon_res.data)

    def test_score_sanitization(self):
        """Verify player names are trimmed and capped to 15 characters and invalid skin falls back."""
        entry = scores.add_score("VeryLongPlayerNameExceedingLimit", 5, skin="INVALID_SKIN")
        self.assertLessEqual(len(entry["name"]), 15)
        self.assertEqual(entry["skin"], "MANTA")

    def test_unique_player_and_top10(self):
        """Verify each player has only 1 best entry, lower runs get no rank, and leaderboard stays Top 10."""
        first_res = self.client.post("/api/scores", json={"name": "UniqueHero", "score": 500, "skin": "SHARK"}).get_json()
        self.assertTrue(first_res.get("is_new_record"))
        self.assertEqual(first_res.get("rank"), 1)

        # Lower score for same player (different case) must give NO rank and NOT duplicate
        low_res = self.client.post("/api/scores", json={"name": "uniquehero", "score": 15, "skin": "MANTA"}).get_json()
        self.assertFalse(low_res.get("is_new_record"))
        self.assertIsNone(low_res.get("rank"))

        res = self.client.get("/api/scores?limit=10")
        data = res.get_json()
        self.assertLessEqual(len(data["scores"]), 10)
        hero_entries = [s for s in data["scores"] if s["name"].lower() == "uniquehero"]
        self.assertEqual(len(hero_entries), 1)
        self.assertEqual(hero_entries[0]["score"], 500)

        # Higher score updates existing entry
        high_res = self.client.post("/api/scores", json={"name": "UniqueHero", "score": 700, "skin": "ANGLER"}).get_json()
        self.assertTrue(high_res.get("is_new_record"))
        self.assertEqual(high_res.get("rank"), 1)
        res2 = self.client.get("/api/scores?limit=10")
        data2 = res2.get_json()
        hero_entries2 = [s for s in data2["scores"] if s["name"].lower() == "uniquehero"]
        self.assertEqual(len(hero_entries2), 1)
        self.assertEqual(hero_entries2[0]["score"], 700)
        self.assertEqual(data2["scores"][0]["name"], "UniqueHero")


if __name__ == "__main__":
    unittest.main()
