"""
Flask REST API and Static File Server for Underwater Flappy Game.
Serves frontend assets and provides leaderboard API endpoints.
"""

from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import HOST, PORT, DEBUG
import scores

# Configure application and frontend static root
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
CORS(app)  # Enable cross-origin requests for local development flexibility


@app.route("/")
def serve_index():
    """Serve the main game interface."""
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    """Serve static CSS, JS, and asset files."""
    return send_from_directory(app.static_folder, path)


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "online",
        "service": "Underwater Flappy Game API",
        "version": "1.1.0"
    })


@app.route("/api/scores", methods=["GET"])
def get_leaderboard():
    """Get top 10 scores (supports ?limit=N&period=all|today)."""
    limit = request.args.get("limit", default=10, type=int)
    limit = max(1, min(limit, 10))
    period = request.args.get("period", default="all", type=str).lower()
    if period not in ("all", "today"):
        period = "all"

    top_scores = scores.get_top_scores(limit=limit, period=period)
    return jsonify({
        "success": True,
        "period": period,
        "count": len(top_scores),
        "scores": top_scores
    })


@app.route("/api/scores", methods=["POST"])
def submit_score():
    """
    Submit a new score.
    Expected JSON payload: { "name": string, "score": int, "skin"?: string }
    """
    data = request.get_json(silent=True) or {}
    player_name = data.get("name", "Player")
    score_val = data.get("score")
    skin = data.get("skin", "MANTA")

    if score_val is None or isinstance(score_val, bool) or not isinstance(score_val, (int, float)):
        return jsonify({
            "success": False,
            "error": "Valid integer score is required."
        }), 400

    clean_name = (str(player_name) or "Anonymous").strip()[:15] or "Anonymous"
    submitted_score = max(0, min(int(score_val), 999999))
    existing_scores = scores.load_scores()
    prev_best = next(
        (int(s.get("score", 0)) for s in existing_scores if s.get("name", "").lower() == clean_name.lower()),
        None
    )

    new_record = scores.add_score(player_name=clean_name, score=submitted_score, skin=str(skin))
    updated_top = scores.get_top_scores(limit=10)
    is_new_record = submitted_score > 0 and (prev_best is None or submitted_score > prev_best)

    rank = None
    if is_new_record:
        for idx, entry in enumerate(updated_top):
            if entry.get("name", "").lower() == clean_name.lower() and int(entry.get("score", 0)) == submitted_score:
                rank = idx + 1
                break

    return jsonify({
        "success": True,
        "message": "Score processed.",
        "record": new_record,
        "is_new_record": is_new_record and rank is not None,
        "rank": rank
    }), 201


if __name__ == "__main__":
    print(f"🚀 Starting Underwater Flappy Server on http://{HOST}:{PORT}")
    print(f"📂 Serving frontend from: {FRONTEND_DIR}")
    app.run(host=HOST, port=PORT, debug=DEBUG)
