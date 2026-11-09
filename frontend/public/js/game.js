/**
 * Underwater Flappy Adventure - Main Game Engine
 * Built with HTML5 Canvas & TypeScript (Compiled ES Module)
 * Fully Optimized for Mobile & High-DPI (Retina) Displays
 */

import { SoundManager } from './audio.js';

export class FlappyGame {
  canvas;
  ctx;
  sound;

  // Logical Game Dimensions (Resolution-independent)
  logicalWidth = 400;
  logicalHeight = 600;
  dpr = 1;

  // Game States
  state = 'READY';
  score = 0;
  bestScore = 0;
  frameCount = 0;
  shakeTimer = 0;
  currentSkin = 'MANTA';

  // Game Entities
  fish;
  pipes = [];
  bubbles = [];
  swimParticles = [];

  // DOM Elements
  readyOverlay;
  gameOverOverlay;
  finalScoreEl;
  bestScoreEl;
  resetBtn;
  playAgainBtn;
  soundBtn;
  leaderboardList;
  howItWorksBtn;
  closeModalBtn;
  infoModal;
  playerNameInput;
  saveNameBtn;
  mobileLeaderboardBtn;
  closeLeaderboardBtn;
  leaderboardPanel;

  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundManager();

    // Cache UI elements
    this.readyOverlay = document.getElementById('readyOverlay');
    this.gameOverOverlay = document.getElementById('gameOverOverlay');
    this.finalScoreEl = document.getElementById('finalScore');
    this.bestScoreEl = document.getElementById('bestScore');
    this.resetBtn = document.getElementById('resetBtn');
    this.playAgainBtn = document.getElementById('playAgainBtn');
    this.soundBtn = document.getElementById('soundToggleBtn');
    this.leaderboardList = document.getElementById('leaderboardList');
    this.howItWorksBtn = document.getElementById('howItWorksBtn');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.infoModal = document.getElementById('infoModal');
    this.playerNameInput = document.getElementById('playerNameInput');
    this.saveNameBtn = document.getElementById('saveNameBtn');
    this.mobileLeaderboardBtn = document.getElementById('mobileLeaderboardBtn');
    this.closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
    this.leaderboardPanel = document.getElementById('leaderboardPanel');

    // Load saved preferences
    this.loadPreferences();

    // High-DPI Retina Setup
    this.setupCanvasDPR();
    window.addEventListener('resize', () => this.setupCanvasDPR());

    this.initEntities();
    this.initBackgroundBubbles();
    this.bindEvents();
    this.fetchLeaderboard();

    // Start 60 FPS loop
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Setup canvas internal buffer for crisp High-DPI (Retina) rendering */
  setupCanvasDPR() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.logicalWidth * this.dpr);
    this.canvas.height = Math.round(this.logicalHeight * this.dpr);
  }

  /** Load saved skin and high score */
  loadPreferences() {
    const stored = localStorage.getItem('flappy_best_score');
    if (stored) {
      this.bestScore = parseInt(stored, 10) || 0;
    }
    const savedName = localStorage.getItem('flappy_player_name');
    if (savedName && this.playerNameInput) {
      this.playerNameInput.value = savedName;
    }
    const savedSkin = localStorage.getItem('flappy_skin');
    if (savedSkin === 'MANTA' || savedSkin === 'SUBMARINE' || savedSkin === 'SHARK') {
      this.currentSkin = savedSkin;
    }
  }

  /** Initialize or reset player fish */
  initEntities() {
    this.fish = {
      x: 90,
      y: this.logicalHeight / 2 - 20,
      radius: 14,
      width: 38,
      height: 28,
      velocity: 0,
      gravity: 0.28,
      swimForce: -6.2,
      rotation: 0,
      finAngle: 0,
      skin: this.currentSkin
    };
    this.pipes = [];
    this.swimParticles = [];
  }

  /** Generate ambient floating bubbles */
  initBackgroundBubbles() {
    this.bubbles = [];
    for (let i = 0; i < 24; i++) {
      const baseX = Math.random() * this.logicalWidth;
      this.bubbles.push({
        baseX: baseX,
        x: baseX,
        y: Math.random() * this.logicalHeight,
        radius: Math.random() * 4 + 1.5,
        speed: Math.random() * 0.8 + 0.5,
        wobbleSpeed: Math.random() * 0.04 + 0.02,
        wobbleDistance: Math.random() * 12 + 4,
        alpha: Math.random() * 0.4 + 0.2
      });
    }
  }

  /** Bind Keyboard, Touch, Click and UI Button events */
  bindEvents() {
    // Unlock Web Audio on first user interaction
    const unlockAudioOnce = () => {
      this.sound.unlockAudio();
      window.removeEventListener('pointerdown', unlockAudioOnce);
      window.removeEventListener('keydown', unlockAudioOnce);
    };
    window.addEventListener('pointerdown', unlockAudioOnce, { passive: true });
    window.addEventListener('keydown', unlockAudioOnce, { passive: true });

    const handleAction = (e) => {
      if (e) {
        e.preventDefault();
      }
      this.onAction();
    };

    // Canvas click & touch (pointerdown handles both mouse & mobile touch)
    this.canvas.addEventListener('pointerdown', handleAction);

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (document.activeElement === this.playerNameInput) return;
        e.preventDefault();
        handleAction();
      }
    });

    // Reset button
    this.resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetGame();
    });

    // Play again button
    this.playAgainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetGame();
    });

    // Sound toggle
    this.soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const enabled = this.sound.toggle();
      this.soundBtn.textContent = enabled ? '🔊' : '🔇';
    });

    // Skin selector buttons
    const skinBtns = document.querySelectorAll('.skin-btn');
    skinBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skin = btn.dataset.skin;
        if (skin) {
          this.currentSkin = skin;
          this.fish.skin = skin;
          localStorage.setItem('flappy_skin', skin);
          this.updateSkinButtonsUI();
        }
      });
    });
    this.updateSkinButtonsUI();

    // Mobile Leaderboard Drawer toggle
    if (this.mobileLeaderboardBtn && this.leaderboardPanel) {
      this.mobileLeaderboardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.leaderboardPanel.classList.add('open');
        this.fetchLeaderboard();
      });
    }

    if (this.closeLeaderboardBtn && this.leaderboardPanel) {
      this.closeLeaderboardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.leaderboardPanel.classList.remove('open');
      });
    }

    // Close mobile leaderboard if tapping outside
    document.addEventListener('pointerdown', (e) => {
      if (
        this.leaderboardPanel &&
        this.leaderboardPanel.classList.contains('open') &&
        !this.leaderboardPanel.contains(e.target) &&
        e.target !== this.mobileLeaderboardBtn
      ) {
        this.leaderboardPanel.classList.remove('open');
      }
    });

    // Modal controls
    if (this.howItWorksBtn && this.infoModal) {
      this.howItWorksBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.infoModal.classList.remove('hidden');
      });
    }

    if (this.closeModalBtn && this.infoModal) {
      this.closeModalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.infoModal.classList.add('hidden');
      });
    }

    // Save player name
    if (this.saveNameBtn && this.playerNameInput) {
      const submitName = () => {
        const val = this.playerNameInput.value.trim();
        if (val) {
          localStorage.setItem('flappy_player_name', val);
          this.submitScoreToBackend(this.score);
          this.playerNameInput.blur(); // Hide mobile keyboard
          const originalText = this.saveNameBtn.textContent;
          this.saveNameBtn.textContent = 'Saved! ✓';
          this.saveNameBtn.style.background = '#10b981';
          setTimeout(() => {
            if (this.saveNameBtn) {
              this.saveNameBtn.textContent = originalText || 'Save';
              this.saveNameBtn.style.background = '';
            }
          }, 2000);
        }
      };

      this.saveNameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submitName();
      });

      this.playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitName();
        }
      });
    }
  }

  /** Update active visual styling on skin buttons */
  updateSkinButtonsUI() {
    const skinBtns = document.querySelectorAll('.skin-btn');
    skinBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.skin === this.currentSkin);
    });
  }

  /** User input action (swim or start) */
  onAction() {
    if (this.state === 'READY') {
      this.state = 'PLAYING';
      this.readyOverlay.classList.add('hidden');
      this.swim();
    } else if (this.state === 'PLAYING') {
      this.swim();
    }
  }

  /** Flap/swim up */
  swim() {
    this.fish.velocity = this.fish.swimForce;
    this.sound.playSwim();

    // Spawn tiny swim bubbles behind swimmer
    for (let i = 0; i < 4; i++) {
      this.swimParticles.push({
        x: this.fish.x - 14 + (Math.random() * 6 - 3),
        y: this.fish.y + 4 + (Math.random() * 6 - 3),
        r: Math.random() * 3.5 + 1.5,
        alpha: 0.7,
        vy: -(Math.random() * 1 + 0.5)
      });
    }
  }

  /** Spawn pipe obstacle with purple tick markings */
  spawnPipe() {
    const minHeight = 50;
    const gap = 145;
    const groundHeight = 65;
    const maxTop = this.logicalHeight - groundHeight - gap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxTop - minHeight + 1)) + minHeight;

    this.pipes.push({
      x: this.logicalWidth + 10,
      topHeight: topHeight,
      bottomY: topHeight + gap,
      width: 58,
      gap: gap,
      passed: false
    });
  }

  /** Update physics and game logic */
  update() {
    this.frameCount++;

    // Update ambient bubbles
    for (const b of this.bubbles) {
      b.y -= b.speed;
      b.x = b.baseX + Math.sin(this.frameCount * b.wobbleSpeed) * b.wobbleDistance;
      if (b.y < -10) {
        b.y = this.logicalHeight + 10;
        b.baseX = Math.random() * this.logicalWidth;
      }
    }

    // Update swim bubbles
    for (let i = this.swimParticles.length - 1; i >= 0; i--) {
      const p = this.swimParticles[i];
      p.y += p.vy;
      p.x -= 1.2;
      p.alpha -= 0.025;
      if (p.alpha <= 0) {
        this.swimParticles.splice(i, 1);
      }
    }

    // Gentle hovering in READY state
    if (this.state === 'READY') {
      this.fish.y = this.logicalHeight / 2 - 20 + Math.sin(this.frameCount * 0.08) * 8;
      this.fish.rotation = 0;
      this.fish.finAngle = Math.sin(this.frameCount * 0.15) * 0.3;
      return;
    }

    if (this.state === 'GAMEOVER') {
      if (this.shakeTimer > 0) this.shakeTimer--;
      // Fish sinks to seabed on death
      if (this.fish.y < this.logicalHeight - 65 - this.fish.height / 2) {
        this.fish.velocity += this.fish.gravity * 1.4;
        this.fish.y += this.fish.velocity;
        this.fish.rotation = Math.min(Math.PI / 2, this.fish.rotation + 0.1);
      }
      return;
    }

    // --- PLAYING STATE ---
    // Apply gravity
    this.fish.velocity += this.fish.gravity;
    this.fish.y += this.fish.velocity;

    // Rotation based on velocity
    const targetAngle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.fish.velocity * 0.08));
    this.fish.rotation += (targetAngle - this.fish.rotation) * 0.2;
    this.fish.finAngle = Math.sin(this.frameCount * 0.3) * 0.4;

    // Spawn pipes periodically
    if (this.frameCount % 95 === 0) {
      this.spawnPipe();
    }

    // Update and check pipes
    const pipeSpeed = 2.4;
    const groundLevel = this.logicalHeight - 65;

    // Check boundary collisions
    if (this.fish.y - this.fish.radius <= 0) {
      this.fish.y = this.fish.radius;
      this.fish.velocity = 0;
    }

    if (this.fish.y + this.fish.radius >= groundLevel) {
      this.triggerGameOver();
      return;
    }

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= pipeSpeed;

      // Score passing
      if (!p.passed && p.x + p.width < this.fish.x) {
        p.passed = true;
        this.score++;
        this.sound.playScore();
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          localStorage.setItem('flappy_best_score', this.bestScore.toString());
        }
      }

      // Check collision
      if (this.checkPipeCollision(p)) {
        this.triggerGameOver();
        return;
      }

      // Remove offscreen pipes
      if (p.x + p.width < -20) {
        this.pipes.splice(i, 1);
      }
    }
  }

  /** Circle to Rectangle collision detection */
  checkPipeCollision(p) {
    const fx = this.fish.x;
    const fy = this.fish.y;
    const r = this.fish.radius - 2; // slightly forgiving hitbox

    // Top pipe box: [p.x, 0, p.width, p.topHeight]
    if (fx + r > p.x && fx - r < p.x + p.width && fy - r < p.topHeight) {
      return true;
    }

    // Bottom pipe box: [p.x, p.bottomY, p.width, logicalHeight - p.bottomY]
    if (fx + r > p.x && fx - r < p.x + p.width && fy + r > p.bottomY) {
      return true;
    }

    return false;
  }

  /** Trigger Game Over sequence */
  triggerGameOver() {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    this.shakeTimer = 16;
    this.sound.playHit();
    setTimeout(() => this.sound.playGameOver(), 150);

    // Update overlay UI
    this.finalScoreEl.textContent = this.score.toString();
    this.bestScoreEl.textContent = this.bestScore.toString();
    this.gameOverOverlay.classList.remove('hidden');

    // Submit score to backend
    this.submitScoreToBackend(this.score);
  }

  /** Reset game to initial ready state */
  resetGame() {
    this.state = 'READY';
    this.score = 0;
    this.shakeTimer = 0;
    this.initEntities();
    this.readyOverlay.classList.remove('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.fetchLeaderboard();
  }

  /** Render loop */
  draw() {
    const ctx = this.ctx;
    ctx.save();

    // High-DPI subpixel scaling
    ctx.scale(this.dpr, this.dpr);

    // Camera shake effect on crash
    if (this.shakeTimer > 0) {
      const dx = (Math.random() - 0.5) * 8;
      const dy = (Math.random() - 0.5) * 8;
      ctx.translate(dx, dy);
    }

    // 1. Deep ocean background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
    bgGrad.addColorStop(0, '#0277bd');
    bgGrad.addColorStop(0.3, '#01579b');
    bgGrad.addColorStop(0.7, '#002f6c');
    bgGrad.addColorStop(1, '#001433');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

    // 2. Wavy water surface highlights
    this.drawSurfaceWaves();

    // 3. Ambient bubbles
    this.drawBubbles();

    // 4. Pipes (Obstacles)
    this.drawPipes();

    // 5. Swim bubbles
    this.drawSwimParticles();

    // 6. Player (Swimmer/Creature with Selected Skin)
    this.drawFish();

    // 7. Seabed & seaweed foreground
    this.drawSeabed();

    // 8. In-game score display
    if (this.state === 'PLAYING') {
      this.drawScoreHeader();
    }

    ctx.restore();
  }

  /** Draw decorative ocean surface ripples */
  drawSurfaceWaves() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= this.logicalWidth; x += 20) {
      const y = 8 + Math.sin((x + this.frameCount * 2) * 0.05) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.logicalWidth, 0);
    ctx.closePath();
    ctx.fill();
  }

  /** Draw ambient floating bubbles */
  drawBubbles() {
    const ctx = this.ctx;
    for (const b of this.bubbles) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
      ctx.strokeStyle = `rgba(255, 255, 255, ${b.alpha * 1.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bubble shine highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha * 1.8})`;
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Draw swim bubble particles */
  drawSwimParticles() {
    const ctx = this.ctx;
    for (const p of this.swimParticles) {
      ctx.save();
      ctx.fillStyle = `rgba(180, 230, 255, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Draw Obstacle Pipes.
   * Silver/metallic pipe cylinders with purple measurement ticks along the side!
   */
  drawPipes() {
    const ctx = this.ctx;
    const lipHeight = 24;
    const lipExtend = 5;

    for (const p of this.pipes) {
      // --- Top Pipe ---
      const topGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
      topGrad.addColorStop(0, '#c5cbd3');
      topGrad.addColorStop(0.35, '#eef2f7');
      topGrad.addColorStop(0.8, '#8b96a5');
      topGrad.addColorStop(1, '#616c7a');

      // Top stem
      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x, 0, p.width, p.topHeight - lipHeight);
      ctx.strokeStyle = '#39424e';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, 0, p.width, p.topHeight - lipHeight);

      // Top pipe collar / lip
      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x - lipExtend, p.topHeight - lipHeight, p.width + lipExtend * 2, lipHeight);
      ctx.strokeRect(p.x - lipExtend, p.topHeight - lipHeight, p.width + lipExtend * 2, lipHeight);

      // Purple graduation / measurement ticks on side
      this.drawPurpleTicks(p.x + 4, 10, p.topHeight - lipHeight - 10, true);

      // --- Bottom Pipe ---
      const bottomHeight = this.logicalHeight - p.bottomY;
      const btmGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
      btmGrad.addColorStop(0, '#c5cbd3');
      btmGrad.addColorStop(0.35, '#eef2f7');
      btmGrad.addColorStop(0.8, '#8b96a5');
      btmGrad.addColorStop(1, '#616c7a');

      // Bottom collar / lip
      ctx.fillStyle = btmGrad;
      ctx.fillRect(p.x - lipExtend, p.bottomY, p.width + lipExtend * 2, lipHeight);
      ctx.strokeRect(p.x - lipExtend, p.bottomY, p.width + lipExtend * 2, lipHeight);

      // Bottom stem
      ctx.fillStyle = btmGrad;
      ctx.fillRect(p.x, p.bottomY + lipHeight, p.width, bottomHeight - lipHeight);
      ctx.strokeRect(p.x, p.bottomY + lipHeight, p.width, bottomHeight - lipHeight);

      // Purple graduation ticks on bottom pipe
      this.drawPurpleTicks(p.x + 4, p.bottomY + lipHeight + 6, bottomHeight - lipHeight - 12, false);
    }
  }

  /** Draw purple measurement tick markings */
  drawPurpleTicks(x, startY, length, isTop) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 2.5;

    const step = 14;
    const ticksCount = Math.floor(length / step);

    for (let i = 0; i < ticksCount; i++) {
      const y = isTop ? startY + i * step : startY + i * step;
      const tickLength = i % 2 === 0 ? 9 : 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + tickLength, y);
      ctx.stroke();
    }
  }

  /** Draw Player Swimmer Creature based on selected skin */
  drawFish() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.fish.x, this.fish.y);
    ctx.rotate(this.fish.rotation);

    if (this.currentSkin === 'SUBMARINE') {
      this.drawSubmarineSkin(ctx);
    } else if (this.currentSkin === 'SHARK') {
      this.drawSharkSkin(ctx);
    } else {
      this.drawMantaSkin(ctx);
    }

    ctx.restore();
  }

  /** Manta Ray / Creature Skin (Default Video Reference) */
  drawMantaSkin(ctx) {
    const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 18);
    bodyGrad.addColorStop(0, '#475569');
    bodyGrad.addColorStop(0.5, '#1e293b');
    bodyGrad.addColorStop(1, '#0f172a');

    // Tail fin (flapping with finAngle)
    ctx.save();
    ctx.translate(-16, 0);
    ctx.rotate(this.fish.finAngle);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Main Body oval
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Side Fin (animated)
    ctx.save();
    ctx.translate(-2, 4);
    ctx.rotate(-this.fish.finAngle * 1.5);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(9.5, -4, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Specular eye shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9, -5.2, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Submarine Skin */
  drawSubmarineSkin(ctx) {
    // Rotating Propeller at back
    ctx.save();
    ctx.translate(-18, 0);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    const propH = Math.sin(this.frameCount * 0.4) * 10;
    ctx.ellipse(0, 0, 3, Math.max(2, Math.abs(propH)), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Periscope Tower on top
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-2, -18, 6, 8);
    ctx.fillRect(0, -20, 7, 4);
    ctx.fillStyle = '#ef4444'; // Red periscope light
    ctx.beginPath();
    ctx.arc(6, -18, 2, 0, Math.PI * 2);
    ctx.fill();

    // Submarine Oval Body
    const subGrad = ctx.createLinearGradient(0, -14, 0, 14);
    subGrad.addColorStop(0, '#fde047');
    subGrad.addColorStop(0.6, '#eab308');
    subGrad.addColorStop(1, '#a16207');

    ctx.fillStyle = subGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Round Glass Porthole Window
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(5, -1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Porthole glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(4, -2.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Shark Skin */
  drawSharkSkin(ctx) {
    // Dorsal Fin on top
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(2, -20);
    ctx.lineTo(9, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tail Fin
    ctx.save();
    ctx.translate(-16, 0);
    ctx.rotate(this.fish.finAngle);
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Shark Body
    const sharkGrad = ctx.createLinearGradient(0, -12, 0, 12);
    sharkGrad.addColorStop(0, '#0284c7');
    sharkGrad.addColorStop(0.5, '#0369a1');
    sharkGrad.addColorStop(0.7, '#e2e8f0'); // White underbelly
    sharkGrad.addColorStop(1, '#f8fafc');

    ctx.fillStyle = sharkGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Gill slits
    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = 1.2;
    for (let gx = -4; gx <= 2; gx += 3) {
      ctx.beginPath();
      ctx.arc(gx, 0, 4, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
    }

    // Shark Eye (fierce)
    ctx.fillStyle = '#082f49';
    ctx.beginPath();
    ctx.arc(10, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(9.5, -4.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Draw ocean floor & animated seaweed */
  drawSeabed() {
    const ctx = this.ctx;
    const floorY = this.logicalHeight - 65;

    // Ocean floor ground silhouette
    ctx.fillStyle = '#091526';
    ctx.fillRect(0, floorY, this.logicalWidth, 65);

    // Floor top edge rim
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, floorY, this.logicalWidth, 6);

    // Coral / Seaweed swaying gently
    ctx.fillStyle = '#064e3b';
    const weeds = [25, 75, 140, 210, 280, 345, 385];
    for (const wx of weeds) {
      const sway = Math.sin((this.frameCount + wx) * 0.05) * 6;
      ctx.beginPath();
      ctx.moveTo(wx, floorY);
      ctx.quadraticCurveTo(wx + sway, floorY - 22, wx + sway * 1.5, floorY - 38);
      ctx.quadraticCurveTo(wx + sway * 0.8, floorY - 20, wx + 6, floorY);
      ctx.fill();
    }
  }

  /** Draw in-game score at top center */
  drawScoreHeader() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '900 42px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';

    // Black stroke outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(this.score.toString(), this.logicalWidth / 2, 58);

    // Crisp white fill
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.score.toString(), this.logicalWidth / 2, 58);
    ctx.restore();
  }

  /** Main RAF Loop */
  loop(_time) {
    this.update();
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Submit score to Python Backend */
  async submitScoreToBackend(score) {
    try {
      const playerName = (this.playerNameInput ? this.playerNameInput.value.trim() : '') ||
                         localStorage.getItem('flappy_player_name') || 'Player';
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, score })
      });
      this.fetchLeaderboard();
    } catch {
      // Backend optional / offline fallback
    }
  }

  /** Fetch top scores from Python Backend */
  async fetchLeaderboard() {
    if (!this.leaderboardList) return;
    try {
      const res = await fetch('/api/scores?limit=5');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.scores)) {
        this.renderLeaderboard(data.scores);
      }
    } catch {
      // Offline fallback: keep existing
    }
  }

  /** Render top 5 leaderboard list */
  renderLeaderboard(records) {
    if (!this.leaderboardList) return;
    this.leaderboardList.innerHTML = '';
    records.slice(0, 5).forEach((rec, idx) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';
      li.innerHTML = `
        <span class="rank">#${idx + 1}</span>
        <span class="player-name">${this.escapeHtml(rec.name)}</span>
        <span class="player-score">${rec.score} pts</span>
      `;
      this.leaderboardList.appendChild(li);
    });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Auto-initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new FlappyGame('gameCanvas');
});
