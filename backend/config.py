import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SCORES_FILE = DATA_DIR / "scores.json"

# Server configuration (0.0.0.0 allows phones and local devices on Wi-Fi to connect)
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 5000))
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)
 