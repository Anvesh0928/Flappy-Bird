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
        """Verify player names are trimmed and capped to 15 characters."""
        entry = scores.add_score("VeryLongPlayerNameExceedingLimit", 5)
        self.assertLessEqual(len(entry["name"]), 15)


if __name__ == "__main__":
    unittest.main()
