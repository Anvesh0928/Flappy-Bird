"""
Quick Launcher for Underwater Flappy Adventure
Runs the Python backend and serves the HTML5/TypeScript/JavaScript game.
"""

import sys
import webbrowser
import threading
from pathlib import Path

# Add backend directory to path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app import app
from config import HOST, PORT

def open_browser():
    """Open default browser to the game page after server starts."""
    webbrowser.open(f"http://{HOST}:{PORT}")

if __name__ == "__main__":
    print("=" * 60)
    print("   🌊 UNDERWATER FLAPPY ADVENTURE - FULL STACK SERVER 🌊")
    print("=" * 60)
    print(f" * Backend: Python Flask API (scores & leaderboard)")
    print(f" * Frontend: HTML5 Canvas + CSS3 + TypeScript/JavaScript")
    print(f" * Serving at: http://{HOST}:{PORT}")
    print("=" * 60)

    # Launch browser after a short delay
    threading.Timer(1.2, open_browser).start()

    # Start Flask server
    app.run(host=HOST, port=PORT, debug=False)

