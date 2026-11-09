/**
 * Underwater Flappy Adventure - Main Game Engine
 * Built with HTML5 Canvas & TypeScript
 */

import { GameStatus, Fish, Pipe, Bubble, ScoreRecord } from './types.js';
import { SoundManager } from './audio.js';

export class FlappyGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sound: SoundManager;

  // Game States
  private state: GameStatus = 'READY';
  private score: number = 0;
  private bestScore: number = 0;
  private frameCount: number = 0;
  private shakeTimer: number = 0;

  // Game Entities
  private fish!: Fish;
  private pipes: Pipe[] = [];
  private bubbles: Bubble[] = [];
  private swimParticles: Array<{ x: number; y: number; r: number; alpha: number; vy: number }> = [];

  // DOM Elements
  private readyOverlay: HTMLElement;
  private gameOverOverlay: HTMLElement;
  private finalScoreEl: HTMLElement;
  private bestScoreEl: HTMLElement;
  private resetBtn: HTMLElement;
  private playAgainBtn: HTMLElement;
  private soundBtn: HTMLElement;
  private leaderboardList: HTMLElement | null;
  private howItWorksBtn: HTMLElement | null;
  private closeModalBtn: HTMLElement | null;
  private infoModal: HTMLElement | null;
  private playerNameInput: HTMLInputElement | null;
  private saveNameBtn: HTMLElement | null;
  private homeScreen: HTMLElement;
  private tutorialScreen: HTMLElement;
  private gameScreen: HTMLElement;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.sound = new SoundManager();

    // Cache UI elements
    this.readyOverlay = document.getElementById('readyOverlay')!;
    this.gameOverOverlay = document.getElementById('gameOverOverlay')!;
    this.finalScoreEl = document.getElementById('finalScore')!;
    this.bestScoreEl = document.getElementById('bestScore')!;
    this.resetBtn = document.getElementById('resetBtn')!;
    this.playAgainBtn = document.getElementById('playAgainBtn')!;
    this.soundBtn = document.getElementById('soundToggleBtn')!;
    this.leaderboardList = document.getElementById('leaderboardList');
    this.howItWorksBtn = document.getElementById('howItWorksBtn');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.infoModal = document.getElementById('infoModal');
    this.playerNameInput = document.getElementById('playerNameInput') as HTMLInputElement | null;
    this.saveNameBtn = document.getElementById('saveNameBtn');
    this.homeScreen = document.getElementById('homeScreen')!;
    this.tutorialScreen = document.getElementById('tutorialScreen')!;
    this.gameScreen = document.getElementById('gameScreen')!;
    document.getElementById('startGameBtn')?.addEventListener('click', () => this.startGame());
    document.getElementById('howToPlayBtn')?.addEventListener('click', () => this.showScreen('tutorial'));
    document.getElementById('tutorialPlayBtn')?.addEventListener('click', () => this.startGame());
    document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showScreen('home'));
    document.getElementById('homeFromGameOverBtn')?.addEventListener('click', () => this.showScreen('home'));

    this.loadBestScore();
    this.initEntities();
    this.initBackgroundBubbles();
    this.bindEvents();
    this.fetchLeaderboard();

    // Start loop
    requestAnimationFrame((t) => this.loop(t));
  }

  private showScreen(screen: 'home' | 'tutorial' | 'game'): void {
    this.homeScreen.classList.toggle('hidden', screen !== 'home');
    this.tutorialScreen.classList.toggle('hidden', screen !== 'tutorial');
    this.gameScreen.classList.toggle('hidden', screen !== 'game');
  }

  private startGame(): void {
    this.showScreen('game');
    this.resetGame();
  }

  /** Initialize or reset player fish */
  private initEntities(): void {
    this.fish = {
      x: 90,
      y: this.canvas.height / 2 - 20,
      radius: 14,
      width: 38,
      height: 28,
      velocity: 0,
      gravity: 0.28,
      swimForce: -6.2,
      rotation: 0,
      finAngle: 0,
      skin: 'MANTA'
    };
    this.pipes = [];
    this.swimParticles = [];
  }

  /** Generate ambient floating bubbles */
  private initBackgroundBubbles(): void {
    this.bubbles = [];
    for (let i = 0; i < 24; i++) {
      const baseX = Math.random() * this.canvas.width;
      this.bubbles.push({
        baseX: baseX,
        x: baseX,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 4 + 1.5,
        speed: Math.random() * 0.8 + 0.5,
        wobbleSpeed: Math.random() * 0.04 + 0.02,
        wobbleDistance: Math.random() * 12 + 4,
        alpha: Math.random() * 0.4 + 0.2
      });
    }
  }

  /** Bind Keyboard, Touch, Click and UI Button events */
  private bindEvents(): void {
    const handleAction = (e?: Event) => {
      if (e) {
        e.preventDefault();
      }
      this.onAction();
    };

    // Canvas click & touch
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
      this.startGame();
    });

    // Sound toggle
    this.soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const enabled = this.sound.toggle();
      this.soundBtn.textContent = enabled ? '🔊' : '🔇';
    });

    // Modal controls
    if (this.howItWorksBtn && this.infoModal) {
      this.howItWorksBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.infoModal!.classList.remove('hidden');
      });
    }

    if (this.closeModalBtn && this.infoModal) {
      this.closeModalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.infoModal!.classList.add('hidden');
      });
    }

    // Save player name
    if (this.saveNameBtn && this.playerNameInput) {
      this.saveNameBtn.addEventListener('click', () => {
        const val = this.playerNameInput!.value.trim();
        if (val) {
          localStorage.setItem('flappy_player_name', val);
          this.submitScoreToBackend(this.score);
        }
      });
    }
  }

  /** User input action (swim or start) */
  private onAction(): void {
    if (this.state === 'READY') {
      this.state = 'PLAYING';
      this.readyOverlay.classList.add('hidden');
      this.swim();
    } else if (this.state === 'PLAYING') {
      this.swim();
    }
  }

  /** Flap/swim up */
  private swim(): void {
    this.fish.velocity = this.fish.swimForce;
    this.sound.playSwim();

    // Spawn tiny swim bubbles behind fish
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
  private spawnPipe(): void {
    const minHeight = 50;
    const gap = 145;
    const groundHeight = 65;
    const maxTop = this.canvas.height - groundHeight - gap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxTop - minHeight + 1)) + minHeight;

    this.pipes.push({
      x: this.canvas.width + 10,
      topHeight: topHeight,
      bottomY: topHeight + gap,
      width: 58,
      gap: gap,
      passed: false
    });
  }

  /** Update physics and game logic */
  private update(): void {
    this.frameCount++;

    // Update ambient bubbles
    for (const b of this.bubbles) {
      b.y -= b.speed;
      b.x = b.baseX + Math.sin(this.frameCount * b.wobbleSpeed) * b.wobbleDistance;
      if (b.y < -10) {
        b.y = this.canvas.height + 10;
        b.baseX = Math.random() * this.canvas.width;
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
      this.fish.y = this.canvas.height / 2 - 20 + Math.sin(this.frameCount * 0.08) * 8;
      this.fish.rotation = 0;
      this.fish.finAngle = Math.sin(this.frameCount * 0.15) * 0.3;
      return;
    }

    if (this.state === 'GAMEOVER') {
      if (this.shakeTimer > 0) this.shakeTimer--;
      // Fish sinks to seabed on death
      if (this.fish.y < this.canvas.height - 65 - this.fish.height / 2) {
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
    const groundLevel = this.canvas.height - 65;

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
  private checkPipeCollision(p: Pipe): boolean {
    const fx = this.fish.x;
    const fy = this.fish.y;
    const r = this.fish.radius - 2; // slightly forgiving hitbox

    // Top pipe box: [p.x, 0, p.width, p.topHeight]
    if (fx + r > p.x && fx - r < p.x + p.width && fy - r < p.topHeight) {
      return true;
    }

    // Bottom pipe box: [p.x, p.bottomY, p.width, canvas.height - p.bottomY]
    if (fx + r > p.x && fx - r < p.x + p.width && fy + r > p.bottomY) {
      return true;
    }

    return false;
  }

  /** Trigger Game Over sequence */
  private triggerGameOver(): void {
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
  public resetGame(): void {
    this.state = 'READY';
    this.score = 0;
    this.shakeTimer = 0;
    this.initEntities();
    this.readyOverlay.classList.remove('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.fetchLeaderboard();
  }

  /** Render loop */
  private draw(): void {
    const ctx = this.ctx;
    ctx.save();

    // Camera shake effect on crash
    if (this.shakeTimer > 0) {
      const dx = (Math.random() - 0.5) * 8;
      const dy = (Math.random() - 0.5) * 8;
      ctx.translate(dx, dy);
    }

    // 1. Deep ocean background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bgGrad.addColorStop(0, '#0277bd'); // Light cyan blue at surface
    bgGrad.addColorStop(0.3, '#01579b');
    bgGrad.addColorStop(0.7, '#002f6c');
    bgGrad.addColorStop(1, '#001433'); // Dark ocean floor
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Wavy water surface highlights
    this.drawSurfaceWaves();

    // 3. Ambient bubbles
    this.drawBubbles();

    // 4. Pipes (Obstacles)
    this.drawPipes();

    // 5. Swim bubbles
    this.drawSwimParticles();

    // 6. Player (Swimmer/Creature)
    this.drawFish();

    // 7. Seabed & seaweed foreground
    this.drawSeabed();

    // 8. In-game score display (bold retro font at top)
    if (this.state === 'PLAYING') {
      this.drawScoreHeader();
    }

    ctx.restore();
  }

  /** Draw decorative ocean surface ripples */
  private drawSurfaceWaves(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= this.canvas.width; x += 20) {
      const y = 8 + Math.sin((x + this.frameCount * 2) * 0.05) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.canvas.width, 0);
    ctx.closePath();
    ctx.fill();
  }

  /** Draw ambient floating bubbles */
  private drawBubbles(): void {
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
  private drawSwimParticles(): void {
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
   * Styled precisely like the video reference:
   * Silver/metallic pipe cylinders with purple measurement ticks along the side!
   */
  private drawPipes(): void {
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

      // Purple graduation / measurement ticks on side (as seen in video!)
      this.drawPurpleTicks(p.x + 4, 10, p.topHeight - lipHeight - 10, true);

      // --- Bottom Pipe ---
      const bottomHeight = this.canvas.height - p.bottomY;
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

  /** Draw purple measurement tick markings matching the reference video */
  private drawPurpleTicks(x: number, startY: number, length: number, isTop: boolean): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#d946ef'; // Bright purple tick marks
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

  /** Draw Player Swimmer Creature (with fin animation & eye) */
  private drawFish(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.fish.x, this.fish.y);
    ctx.rotate(this.fish.rotation);

    // Body gradient (sleek black & golden-yellow accents inspired by the video avatar)
    const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 18);
    bodyGrad.addColorStop(0, '#475569');
    bodyGrad.addColorStop(0.5, '#1e293b');
    bodyGrad.addColorStop(1, '#0f172a');

    // Tail fin (flapping with finAngle)
    ctx.save();
    ctx.translate(-16, 0);
    ctx.rotate(this.fish.finAngle);
    ctx.fillStyle = '#f59e0b'; // Amber golden tail
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

    ctx.restore();
  }

  /** Draw ocean floor & animated seaweed */
  private drawSeabed(): void {
    const ctx = this.ctx;
    const floorY = this.canvas.height - 65;

    // Ocean floor ground silhouette
    ctx.fillStyle = '#091526';
    ctx.fillRect(0, floorY, this.canvas.width, 65);

    // Floor top edge rim
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, floorY, this.canvas.width, 6);

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
  private drawScoreHeader(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '900 42px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';

    // Black stroke outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(this.score.toString(), this.canvas.width / 2, 58);

    // Crisp white fill
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.score.toString(), this.canvas.width / 2, 58);
    ctx.restore();
  }

  /** Main RAF Loop */
  private loop(_time: number): void {
    this.update();
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Local storage best score sync */
  private loadBestScore(): void {
    const stored = localStorage.getItem('flappy_best_score');
    if (stored) {
      this.bestScore = parseInt(stored, 10) || 0;
    }
    const savedName = localStorage.getItem('flappy_player_name');
    if (savedName && this.playerNameInput) {
      this.playerNameInput.value = savedName;
    }
  }

  /** Submit score to Python Backend */
  private async submitScoreToBackend(score: number): Promise<void> {
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
  public async fetchLeaderboard(): Promise<void> {
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
  private renderLeaderboard(records: ScoreRecord[]): void {
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
      this.leaderboardList!.appendChild(li);
    });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Auto-initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new FlappyGame('gameCanvas');
});
