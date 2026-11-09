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
        self.assertIn(b"Underwater Flappy", res.data)

    def test_score_sanitization(self):
        """Verify player names are trimmed and capped to 15 characters."""
        entry = scores.add_score("VeryLongPlayerNameExceedingLimit", 5)
        self.assertLessEqual(len(entry["name"]), 15)

if __name__ == "__main__":
    unittest.main()

