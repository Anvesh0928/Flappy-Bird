"""
Quick Launcher for Underwater Flappy Adventure
Runs the Python backend and serves the HTML5/TypeScript/JavaScript game.
"""

import sys
import socket
import webbrowser
import threading
from pathlib import Path

# Add backend directory to path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app import app
from config import HOST, PORT


def get_local_ip() -> str:
    """Retrieve the computer's primary LAN IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def open_browser():
    """Open default browser to the game page after server starts."""
    webbrowser.open(f"http://localhost:{PORT}")


if __name__ == "__main__":
    local_ip = get_local_ip()

    print("=" * 64)
    print("   🌊 UNDERWATER FLAPPY ADVENTURE - FULL STACK SERVER 🌊")
    print("=" * 64)
    print(f" * Computer (Local):  http://localhost:{PORT}")
    print(f" * Phone / Mobile:    http://{local_ip}:{PORT}")
    print("=" * 64)
    print(" 📱 To play on your phone:")
    print(f"    1. Make sure your phone is on the SAME Wi-Fi network.")
    print(f"    2. Open your phone's browser (Safari/Chrome) and visit:")
    print(f"       👉 http://{local_ip}:{PORT}")
    print("=" * 64)

    # Launch browser on PC after a short delay
    threading.Timer(1.2, open_browser).start()

    # Start Flask server
    app.run(host=HOST, port=PORT, debug=False)
