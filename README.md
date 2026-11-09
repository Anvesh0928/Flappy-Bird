# 🌊 Underwater Flappy Adventure

A high-performance, responsive underwater Flappy Bird style game built with **Python (Flask)** backend and **HTML5, CSS3, JavaScript, and TypeScript** frontend.

Inspired by the underwater Flappy Bird arcade mechanics from the reference video, featuring silver/metallic pipes with purple measurement tick markings, real-time score tracking, collision physics, Web Audio synthesizer, and a persistent live leaderboard API.

---

## 📁 Clean & Maintainable Project Structure

```text
.
├── backend/
│   ├── app.py              # Flask server: serves frontend & REST endpoints
│   ├── config.py           # Configuration: host, port, file paths
│   ├── scores.py           # Leaderboard manager (CRUD + JSON persistence)
│   ├── requirements.txt    # Python dependencies
│   └── data/
│       └── scores.json     # Thread-safe JSON leaderboard storage
│
├── frontend/
│   ├── src/                # TypeScript Source Code
│   │   ├── types.ts        # Game models, entities, and state interfaces
│   │   ├── audio.ts        # Procedural Web Audio sound generator (swim, hit, ding, gameover)
│   │   └── game.ts         # Canvas game engine (60 FPS loop, physics, collisions)
│   │
│   ├── public/             # Ready-to-Run Production Assets
│   │   ├── index.html      # Semantic HTML5 layout & overlays
│   │   ├── style.css       # Responsive underwater CSS theme
│   │   └── js/
│   │       └── game.js     # Clean, readable compiled JS (runs directly in any browser)
│   │
│   ├── package.json        # Frontend build scripts
│   └── tsconfig.json       # TypeScript compiler settings
│
├── run.py                  # Single-command launcher (starts backend & opens game)
└── README.md               # Documentation & maintenance guide
```

---

## 🚀 How to Run

### Option 1: Quick Start (Python Full-Stack)
Run the launcher from the project root:

```bash
python run.py
```

This starts the Python backend at `http://127.0.0.1:5000` and automatically opens the game in your default web browser!

---

### Option 2: Run Backend Directly
```bash
cd backend
python app.py
```

---

### Option 3: Standalone Frontend
You can also open `frontend/public/index.html` directly in any web browser. The game is fully functional standalone with local storage fallbacks if the Python backend is offline.

---

## 🛠️ TypeScript Development

The frontend includes fully typed source files in `frontend/src/`.

To recompile TypeScript after editing `src/`:
```bash
cd frontend
npm run build
```
Or for live watch mode during development:
```bash
npm run watch
```

---

## 🎮 Game Controls

| Control | Action |
| :--- | :--- |
| **Mouse Click / Tap** | Swim upward |
| **Spacebar / Up Arrow** | Swim upward |
| **Reset Button** | Restart the game at any time |
| **Sound Toggle (🔊/🔇)** | Enable or mute sound effects |

---

## 🌟 Key Features

1. **Faithful Visuals**:
   - Deep ocean blue parallax gradient background with rippling surface waves.
   - Ambient floating bubbles and bubble trails emitted when the player flaps/swims.
   - Distinctive **metallic pipes with purple measurement tick markings** (matching the reference video).
   - Animated swimmer creature with flapping fins and velocity-based rotation.

2. **Zero-Dependency Audio**:
   - Synthesized retro arcade audio using the native Web Audio API (no external `.mp3` or `.wav` dependencies to fail).

3. **Python REST API**:
   - `GET /api/scores`: Fetch top leaderboard scores.
   - `POST /api/scores`: Submit player name and high score to persistent JSON storage.
   - `GET /api/health`: Service health check.

4. **Human Maintainable**:
   - Minimal code, zero bloat, strict TypeScript types, and straightforward logic that any developer can easily understand and extend.



## Android application

A native Kotlin Android wrapper is available in `android/`. It packages the existing `frontend/public/` game files as local WebView assets, adds native UMP consent and a Google Mobile Ads Next-Gen test banner, and leaves the existing frontend/backend folders in place.

See [android/README.md](android/README.md) for build instructions, AdMob configuration, and current backend limitations.
