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
        "version": "1.0.0"
    })


@app.route("/api/scores", methods=["GET"])
def get_leaderboard():
    """Get top 10 scores."""
    limit = request.args.get("limit", default=10, type=int)
    limit = max(1, min(limit, 50))
    top_scores = scores.get_top_scores(limit=limit)
    return jsonify({
        "success": True,
        "count": len(top_scores),
        "scores": top_scores
    })


@app.route("/api/scores", methods=["POST"])
def submit_score():
    """
    Submit a new score.
    Expected JSON payload: { "name": string, "score": int }
    """
    data = request.get_json(silent=True) or {}
    player_name = data.get("name", "Player")
    score_val = data.get("score")

    if score_val is None or not isinstance(score_val, (int, float)):
        return jsonify({
            "success": False,
            "error": "Valid integer score is required."
        }), 400

    new_record = scores.add_score(player_name=str(player_name), score=int(score_val))
    return jsonify({
        "success": True,
        "message": "Score saved successfully.",
        "record": new_record
    }), 201


if __name__ == "__main__":
    print(f"🚀 Starting Underwater Flappy Server on http://{HOST}:{PORT}")
    print(f"📂 Serving frontend from: {FRONTEND_DIR}")
    app.run(host=HOST, port=PORT, debug=DEBUG)

