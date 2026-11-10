/**
 * Underwater Flappy Adventure - Main Game Engine
 * Built with HTML5 Canvas & TypeScript
 */

import { GameStatus, Fish, Pipe, Bubble, ScoreRecord } from './types.js';
import { SoundManager } from './audio.js';
import { AdManager } from './adManager.js';

interface LevelTheme {
  name: string;
  bgStops: [string, string, string, string];
  waveColor: string;
  pipeStops: [string, string, string, string];
  pipeStroke: string;
  tickColor: string;
  floorBg: string;
  floorRim: string;
  weedColor: string;
  accentColor: string;
  ambientMode: 'sunbeams' | 'biolum' | 'embers';
}

const LEVEL_ART_ASSETS = [
  { maxLevel: 5, file: 'Submarine.png' },
  { maxLevel: 10, file: 'level 6 to 10 submarine.png' },
  { maxLevel: 15, file: '11 to 15' },
  { maxLevel: 20, file: '16 to 20' },
  { maxLevel: 25, file: '21 to 25' },
  { maxLevel: 30, file: '26 to 30' },
  { maxLevel: 50, file: '31 to 50' },
  { maxLevel: 70, file: '51 to 71' },
  { maxLevel: 100, file: '71 to 100' }
] as const;

const LEVEL_THEMES: readonly LevelTheme[] = [
  {
    name: 'SUNLIT SHALLOWS',
    bgStops: ['#0277bd', '#01579b', '#002f6c', '#001433'],
    waveColor: 'rgba(255, 255, 255, 0.14)',
    pipeStops: ['#c5cbd3', '#eef2f7', '#8b96a5', '#616c7a'],
    pipeStroke: '#39424e',
    tickColor: '#d946ef',
    floorBg: '#091526',
    floorRim: '#1e3a5f',
    weedColor: '#064e3b',
    accentColor: '#7ee7ff',
    ambientMode: 'sunbeams'
  },
  {
    name: 'TURQUOISE REEF',
    bgStops: ['#0d9488', '#0f766e', '#115e59', '#042f2e'],
    waveColor: 'rgba(153, 246, 228, 0.18)',
    pipeStops: ['#e7c697', '#fef3c7', '#b48a5a', '#785630'],
    pipeStroke: '#452b14',
    tickColor: '#fb7185',
    floorBg: '#062624',
    floorRim: '#14b8a6',
    weedColor: '#f97316',
    accentColor: '#5eead4',
    ambientMode: 'sunbeams'
  },
  {
    name: 'TWILIGHT TRENCH',
    bgStops: ['#4f46e5', '#3730a3', '#1e1b4b', '#09071a'],
    waveColor: 'rgba(196, 181, 253, 0.16)',
    pipeStops: ['#a5b4fc', '#e0e7ff', '#6366f1', '#312e81'],
    pipeStroke: '#1e1b4b',
    tickColor: '#fbbf24',
    floorBg: '#0d0921',
    floorRim: '#6366f1',
    weedColor: '#a855f7',
    accentColor: '#c4b5fd',
    ambientMode: 'biolum'
  },
  {
    name: 'ABYSSAL GLOW',
    bgStops: ['#0f172a', '#0c1b33', '#061224', '#020617'],
    waveColor: 'rgba(56, 189, 248, 0.18)',
    pipeStops: ['#64748b', '#cbd5e1', '#334155', '#0f172a'],
    pipeStroke: '#020617',
    tickColor: '#22d3ee',
    floorBg: '#020617',
    floorRim: '#0891b2',
    weedColor: '#22d3ee',
    accentColor: '#38bdf8',
    ambientMode: 'biolum'
  },
  {
    name: 'VOLCANIC VENT',
    bgStops: ['#7f1d1d', '#4c1d3d', '#240f26', '#09080f'],
    waveColor: 'rgba(251, 146, 60, 0.18)',
    pipeStops: ['#9a7b6e', '#fed7aa', '#7c2d12', '#431407'],
    pipeStroke: '#1c0a05',
    tickColor: '#fb923c',
    floorBg: '#120709',
    floorRim: '#ea580c',
    weedColor: '#f43f5e',
    accentColor: '#fdba74',
    ambientMode: 'embers'
  }
];

export class FlappyGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sound: SoundManager;
  private adManager: AdManager;

  // Game States
  private state: GameStatus = 'READY';
  private score: number = 0;
  private bestScore: number = 0;
  private hasRevivedThisRun: boolean = false;
  private invulnTimer: number = 0;
  private revivePending: boolean = false;
  private levelUpBannerTimer: number = 0;
  private levelUpText: string = '';
  private readonly obstaclesPerLevel = 10;

  private get level(): number {
    return Math.floor(this.score / this.obstaclesPerLevel) + 1;
  }

  private getLevelTheme(): LevelTheme {
    return LEVEL_THEMES[(this.level - 1) % LEVEL_THEMES.length];
  }

  /** Noticeable speed & difficulty progression per level while keeping pipe spacing fair. */
  private getLevelTuning() {
    const lvl = this.level - 1;
    const pipeSpeed = Math.min(4.5, 2.0 + lvl * 0.35);
    return {
      gravity: Math.min(0.38, 0.24 + lvl * 0.015),
      swimForce: -Math.min(6.7, 5.6 + lvl * 0.12),
      gap: Math.max(118, 182 - lvl * 7),
      pipeSpeed,
      spawnInterval: Math.max(64, Math.round(252 / pipeSpeed))
    };
  }
  private frameCount: number = 0;
  private swimPhase: number = 0;
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
  private reviveBtn: HTMLButtonElement | null;
  private reviveStatusEl: HTMLElement | null;
  private soundBtn: HTMLElement;
  private gameLevelChip: HTMLElement | null;
  private leaderboardList: HTMLElement | null;
  private howItWorksBtn: HTMLElement | null;
  private closeModalBtn: HTMLElement | null;
  private infoModal: HTMLElement | null;
  private playerNameInput: HTMLInputElement | null;
  private saveNameBtn: HTMLElement | null;
  private homeScreen: HTMLElement;
  private tutorialScreen: HTMLElement;
  private gameScreen: HTMLElement;
  private legalScreen: HTMLElement;
  private characterScreen: HTMLElement;
  private readyScreen: HTMLElement;
  private selectedSkin: Fish['skin'] = 'MANTA';
  private readonly legalVersion = '2026-11-v1';
  private mantaSprite: HTMLImageElement;
  private mantaSpriteReady: boolean = false;
  private levelArtImages: HTMLImageElement[] = [];

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.sound = new SoundManager();
    this.adManager = new AdManager();

    this.mantaSprite = new Image();
    this.mantaSprite.onload = () => {
      this.mantaSpriteReady = true;
    };
    this.mantaSprite.src = 'assets/manta-ray.png';

    // Preload the artwork stored in frontend/assets; each image is used for its level range.
    this.levelArtImages = LEVEL_ART_ASSETS.map(({ file }) => {
      const image = new Image();
      image.src = `assets/${encodeURIComponent(file).replace(/%20/g, '%20')}.png`;
      return image;
    });

    // Cache UI elements
    this.readyOverlay = document.getElementById('readyOverlay')!;
    this.gameOverOverlay = document.getElementById('gameOverOverlay')!;
    this.finalScoreEl = document.getElementById('finalScore')!;
    this.bestScoreEl = document.getElementById('bestScore')!;
    this.resetBtn = document.getElementById('resetBtn')!;
    this.playAgainBtn = document.getElementById('playAgainBtn')!;
    this.reviveBtn = document.getElementById('reviveBtn') as HTMLButtonElement | null;
    this.reviveStatusEl = document.getElementById('reviveStatus');
    this.soundBtn = document.getElementById('soundToggleBtn')!;
    this.gameLevelChip = document.getElementById('gameLevelChip');
    this.leaderboardList = document.getElementById('leaderboardList');
    this.howItWorksBtn = document.getElementById('howItWorksBtn');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.infoModal = document.getElementById('infoModal');
    this.playerNameInput = document.getElementById('playerNameInput') as HTMLInputElement | null;
    this.saveNameBtn = document.getElementById('saveNameBtn');
    this.homeScreen = document.getElementById('homeScreen')!;
    this.tutorialScreen = document.getElementById('tutorialScreen')!;
    this.gameScreen = document.getElementById('gameScreen')!;
    this.legalScreen = document.getElementById('legalScreen')!;
    this.characterScreen = document.getElementById('characterScreen')!;
    this.readyScreen = document.getElementById('readyScreen')!;
    document.getElementById('startGameBtn')?.addEventListener('click', () => {
      const accepted = localStorage.getItem('subsea_legal_acceptance') === this.legalVersion;
      this.showScreen(accepted ? 'character' : 'legal');
    });
    document.getElementById('acceptLegalBtn')?.addEventListener('click', () => {
      const privacy = document.getElementById('privacyAccept') as HTMLInputElement;
      const terms = document.getElementById('termsAccept') as HTMLInputElement;
      if (!privacy.checked || !terms.checked) return;
      localStorage.setItem('subsea_legal_acceptance', this.legalVersion);
      this.showScreen('character');
    });
    const updateLegalButton = () => {
      const privacy = document.getElementById('privacyAccept') as HTMLInputElement;
      const terms = document.getElementById('termsAccept') as HTMLInputElement;
      const button = document.getElementById('acceptLegalBtn') as HTMLButtonElement;
      button.disabled = !(privacy.checked && terms.checked);
    };
    document.getElementById('privacyAccept')?.addEventListener('change', updateLegalButton);
    document.getElementById('termsAccept')?.addEventListener('change', updateLegalButton);
    const savedSkin = localStorage.getItem('subsea_selected_skin');
    if (savedSkin === 'MANTA' || savedSkin === 'SUBMARINE' || savedSkin === 'SHARK') {
      this.selectedSkin = savedSkin;
    }
    const syncSelectedSkinUI = () => {
      document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach((item) => {
        item.classList.toggle('selected', item.dataset.character === this.selectedSkin);
      });
      const readyCharacter = document.getElementById('readyCharacter');
      if (readyCharacter) {
        readyCharacter.textContent = this.selectedSkin === 'MANTA' ? '🐟' : this.selectedSkin === 'SUBMARINE' ? '🚤' : '🦈';
      }
    };
    syncSelectedSkinUI();

    document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach((button) => {
      button.addEventListener('click', () => {
        const skin = button.dataset.character;
        if (skin === 'MANTA' || skin === 'SUBMARINE' || skin === 'SHARK') {
          this.selectedSkin = skin;
          localStorage.setItem('subsea_selected_skin', skin);
          if (this.fish) this.fish.skin = skin;
          syncSelectedSkinUI();
        }
      });
    });
    document.getElementById('characterNextBtn')?.addEventListener('click', () => this.showScreen('tutorial'));
    document.getElementById('characterBackBtn')?.addEventListener('click', () => this.showScreen('home'));
    document.getElementById('tutorialPlayBtn')?.addEventListener('click', () => this.showScreen('ready'));
    document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showScreen('character'));
    document.getElementById('launchGameBtn')?.addEventListener('click', () => this.startGame());
    document.getElementById('readyBackBtn')?.addEventListener('click', () => this.showScreen('character'));
    document.getElementById('homeFromGameOverBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showScreen('home');
    });

    this.loadBestScore();
    this.initEntities();
    this.initBackgroundBubbles();
    this.bindEvents();
    this.fetchLeaderboard();

    // Start loop
    requestAnimationFrame((t) => this.loop(t));
  }

  private showScreen(screen: 'home' | 'legal' | 'character' | 'tutorial' | 'ready' | 'game'): void {
    this.homeScreen.classList.toggle('hidden', screen !== 'home');
    this.legalScreen.classList.toggle('hidden', screen !== 'legal');
    this.characterScreen.classList.toggle('hidden', screen !== 'character');
    this.tutorialScreen.classList.toggle('hidden', screen !== 'tutorial');
    this.readyScreen.classList.toggle('hidden', screen !== 'ready');
    this.gameScreen.classList.toggle('hidden', screen !== 'game');
    if (screen !== 'game') {
      this.adManager.setGameplayActive(false);
    }
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
      gravity: this.getLevelTuning().gravity,
      swimForce: this.getLevelTuning().swimForce,
      rotation: 0,
      finAngle: 0,
      skin: this.selectedSkin
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

    // Full play area click & touch (ignoring visible interactive buttons/inputs)
    const playArea = this.canvas.parentElement || this.canvas;
    playArea.addEventListener('pointerdown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, input, label, a')) return;
      handleAction(e);
    });

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

    // Revive button (Rewarded Ad — max once per run)
    if (this.reviveBtn) {
      this.reviveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (this.state !== 'GAMEOVER' || this.hasRevivedThisRun || this.revivePending) return;
        this.revivePending = true;
        this.reviveBtn!.disabled = true;
        if (this.reviveStatusEl) {
          this.reviveStatusEl.textContent = 'Loading rewarded ad...';
          this.reviveStatusEl.classList.remove('hidden');
        }

        const rewarded = await this.adManager.showRewardedForRevive();
        this.revivePending = false;

        if (rewarded && this.state === 'GAMEOVER' && !this.hasRevivedThisRun) {
          this.revivePlayer();
        } else {
          if (this.reviveBtn) this.reviveBtn.disabled = false;
          if (this.reviveStatusEl) {
            this.reviveStatusEl.textContent = 'Watch full ad to earn your revive!';
            this.reviveStatusEl.classList.remove('hidden');
          }
        }
      });
    }

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
      this.adManager.setGameplayActive(true);
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
    const gap = this.getLevelTuning().gap;
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

    // Update ambient bubbles (rise faster & stream sideways as level increases)
    const speedMult = 1 + (this.level - 1) * 0.16;
    const currentDrift = Math.max(0, (this.level - 1) * 0.35);
    for (const b of this.bubbles) {
      b.y -= b.speed * speedMult;
      b.baseX -= currentDrift;
      if (b.baseX < -15) b.baseX += this.canvas.width + 30;
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
      this.swimPhase += 0.16;
      this.fish.finAngle = Math.sin(this.swimPhase) * 0.3;
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
    if (this.invulnTimer > 0) this.invulnTimer--;
    if (this.levelUpBannerTimer > 0) this.levelUpBannerTimer--;

    // Apply gravity
    this.fish.velocity += this.fish.gravity;
    this.fish.y += this.fish.velocity;

    // Rotation based on velocity; fin beat accelerates seamlessly per level
    const targetAngle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.fish.velocity * 0.08));
    this.fish.rotation += (targetAngle - this.fish.rotation) * 0.2;
    this.swimPhase += 0.24 + Math.min(0.24, (this.level - 1) * 0.045);
    this.fish.finAngle = Math.sin(this.swimPhase) * 0.44;

    // Spawn pipes periodically
    const tuning = this.getLevelTuning();
    if (this.frameCount % tuning.spawnInterval === 0) {
      this.spawnPipe();
    }

    // Update and check pipes
    const pipeSpeed = tuning.pipeSpeed;
    const groundLevel = this.canvas.height - 65;

    // Check boundary collisions
    if (this.fish.y - this.fish.radius <= 0) {
      this.fish.y = this.fish.radius;
      this.fish.velocity = 0;
    }

    if (this.fish.y + this.fish.radius >= groundLevel) {
      if (this.invulnTimer > 0) {
        // Bubble shield protects against seabed while invulnerable
        this.fish.y = groundLevel - this.fish.radius - 4;
        this.fish.velocity = this.fish.swimForce * 0.7;
      } else {
        this.triggerGameOver();
        return;
      }
    }

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= pipeSpeed;

      // Score passing
      if (!p.passed && p.x + p.width < this.fish.x) {
        p.passed = true;
        const prevLevel = this.level;
        this.score++;
        const nextTuning = this.getLevelTuning();
        this.fish.gravity = nextTuning.gravity;
        this.fish.swimForce = nextTuning.swimForce;
        this.sound.playScore();

        if (this.level > prevLevel) {
          const theme = this.getLevelTheme();
          this.levelUpBannerTimer = 115;
          this.levelUpText = `LEVEL ${this.level} · ${theme.name}`;
          if (this.gameLevelChip) this.gameLevelChip.textContent = `LEVEL ${this.level}`;
          for (let k = 0; k < 14; k++) {
            this.swimParticles.push({
              x: this.fish.x + (Math.random() - 0.5) * 32,
              y: this.fish.y + (Math.random() - 0.5) * 28,
              r: Math.random() * 4 + 2,
              alpha: 0.95,
              vy: -(Math.random() * 1.6 + 0.6)
            });
          }
        }

        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          localStorage.setItem('flappy_best_score', this.bestScore.toString());
        }
      }

      // Check collision (skipped during 2.5s revive bubble shield)
      if (this.invulnTimer === 0 && this.checkPipeCollision(p)) {
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
    this.adManager.setGameplayActive(false);
    this.sound.playHit();
    setTimeout(() => this.sound.playGameOver(), 150);

    // Update overlay UI
    this.finalScoreEl.textContent = this.score.toString();
    this.bestScoreEl.textContent = this.bestScore.toString();
    if (this.reviveStatusEl) {
      this.reviveStatusEl.classList.add('hidden');
      this.reviveStatusEl.textContent = '';
    }
    if (this.reviveBtn) {
      const canRevive = !this.hasRevivedThisRun && this.adManager.isReviveAvailable();
      this.reviveBtn.classList.toggle('hidden', !canRevive);
      this.reviveBtn.disabled = false;
    }

    this.gameOverOverlay.classList.remove('hidden');

    // Show frequency-capped Interstitial Ad after Game Over transition
    void this.adManager.handleGameOver();

    // Submit score to backend
    this.submitScoreToBackend(this.score);
  }

  /** Continue same run after verified Rewarded Ad completion (once per run, 2.5s shield). */
  private revivePlayer(): void {
    if (this.hasRevivedThisRun) return;
    this.hasRevivedThisRun = true;
    this.invulnTimer = 150; // 2.5 seconds at 60 FPS
    this.shakeTimer = 0;

    // Restore player at safe vertical center and clear immediate overlapping pipes
    this.fish.y = this.canvas.height * 0.45;
    this.fish.velocity = 0;
    this.fish.rotation = 0;
    this.pipes = this.pipes.filter((p) => p.x + p.width < this.fish.x - 40 || p.x > this.fish.x + 80);

    this.gameOverOverlay.classList.add('hidden');
    this.state = 'PLAYING';
    this.adManager.setGameplayActive(true);
    this.swim();
  }

  /** Reset game to initial ready state */
  public resetGame(): void {
    this.state = 'READY';
    this.score = 0;
    this.shakeTimer = 0;
    this.hasRevivedThisRun = false;
    this.invulnTimer = 0;
    this.revivePending = false;
    this.levelUpBannerTimer = 0;
    this.levelUpText = '';
    if (this.gameLevelChip) this.gameLevelChip.textContent = 'LEVEL 1';
    this.adManager.setGameplayActive(false);
    this.initEntities();
    this.readyOverlay.classList.remove('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.fetchLeaderboard();
  }

  /** Render loop */
  private draw(): void {
    const ctx = this.ctx;
    const theme = this.getLevelTheme();
    ctx.save();

    // Camera shake effect on crash
    if (this.shakeTimer > 0) {
      const dx = (Math.random() - 0.5) * 8;
      const dy = (Math.random() - 0.5) * 8;
      ctx.translate(dx, dy);
    }

    // 1. Level-themed ocean background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bgGrad.addColorStop(0, theme.bgStops[0]);
    bgGrad.addColorStop(0.3, theme.bgStops[1]);
    bgGrad.addColorStop(0.7, theme.bgStops[2]);
    bgGrad.addColorStop(1, theme.bgStops[3]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Level artwork changes every 5 gates (then follows the larger ranges supplied).
    const artIndex = LEVEL_ART_ASSETS.findIndex(({ maxLevel }) => this.level <= maxLevel);
    const art = this.levelArtImages[artIndex < 0 ? this.levelArtImages.length - 1 : artIndex];
    if (art?.complete && art.naturalWidth > 0) {
      const scale = Math.max(this.canvas.width / art.naturalWidth, this.canvas.height / art.naturalHeight);
      const drawWidth = art.naturalWidth * scale;
      const drawHeight = art.naturalHeight * scale;
      ctx.drawImage(art, (this.canvas.width - drawWidth) / 2, (this.canvas.height - drawHeight) / 2, drawWidth, drawHeight);
      ctx.fillStyle = 'rgba(0, 12, 28, 0.16)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 2. Dynamic theme light rays / bioluminescent spores / current streaks
    this.drawAmbientThemeEffects(theme);

    // 3. Wavy water surface highlights
    this.drawSurfaceWaves(theme);

    // 4. Ambient bubbles
    this.drawBubbles();

    // 5. Pipes (Obstacles)
    this.drawPipes(theme);

    // 6. Swim bubbles
    this.drawSwimParticles();

    // 7. Player (Swimmer/Creature)
    this.drawFish();

    // 8. Seabed & seaweed foreground
    this.drawSeabed(theme);

    // 9. In-game score & level-up celebration
    if (this.state === 'PLAYING') {
      this.drawScoreHeader(theme);
      if (this.levelUpBannerTimer > 0) {
        this.drawLevelUpBanner(theme);
      }
    }

    ctx.restore();
  }

  /** Draw level-specific background animations (sunbeams, bioluminescence, volcanic embers & current streaks) */
  private drawAmbientThemeEffects(theme: LevelTheme): void {
    const ctx = this.ctx;
    ctx.save();

    if (theme.ambientMode === 'sunbeams') {
      const raySpeed = 0.015 + (this.level - 1) * 0.004;
      for (let i = 0; i < 4; i++) {
        const sway = Math.sin(this.frameCount * raySpeed + i * 1.6) * 28;
        const baseX = 55 + i * 95 + sway;
        const rayGrad = ctx.createLinearGradient(baseX, 0, baseX - 40, this.canvas.height * 0.72);
        rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(baseX - 18, 0);
        ctx.lineTo(baseX + 26, 0);
        ctx.lineTo(baseX - 14, this.canvas.height * 0.72);
        ctx.lineTo(baseX - 78, this.canvas.height * 0.72);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const glowColor = theme.ambientMode === 'embers' ? '251, 146, 60' : '56, 189, 248';
      const speedY = theme.ambientMode === 'embers' ? 1.5 : 0.9;
      for (let i = 0; i < 14; i++) {
        const seedX = (i * 73 + 29) % this.canvas.width;
        const yPos = this.canvas.height - ((this.frameCount * speedY + i * 47) % (this.canvas.height - 40));
        const xPos = (seedX + Math.sin(this.frameCount * 0.04 + i) * 18 + this.canvas.width) % this.canvas.width;
        const pulse = 0.35 + 0.45 * Math.sin(this.frameCount * 0.08 + i * 1.3);
        const r = 2 + (i % 3);
        ctx.fillStyle = `rgba(${glowColor}, ${pulse})`;
        ctx.beginPath();
        ctx.arc(xPos, yPos, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Underwater current speed streaks from Level 2+
    if (this.level >= 2) {
      const streakCount = Math.min(10, 3 + this.level);
      const streakSpeed = this.getLevelTuning().pipeSpeed * 1.45;
      ctx.strokeStyle = theme.waveColor;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < streakCount; i++) {
        const len = 28 + (i % 4) * 14;
        const y = 70 + ((i * 83) % (this.canvas.height - 160));
        const x = this.canvas.width - ((this.frameCount * streakSpeed + i * 97) % (this.canvas.width + len + 40));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /** Draw decorative ocean surface ripples */
  private drawSurfaceWaves(theme: LevelTheme): void {
    const ctx = this.ctx;
    const rippleSpeed = 2 + (this.level - 1) * 0.6;
    ctx.fillStyle = theme.waveColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= this.canvas.width; x += 20) {
      const y = 8 + Math.sin((x + this.frameCount * rippleSpeed) * 0.05) * 4;
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

  /** Draw Obstacle Pipes styled with the active level theme. */
  private drawPipes(theme: LevelTheme): void {
    const ctx = this.ctx;
    const lipHeight = 24;
    const lipExtend = 5;

    for (const p of this.pipes) {
      // --- Top Pipe ---
      const topGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
      topGrad.addColorStop(0, theme.pipeStops[0]);
      topGrad.addColorStop(0.35, theme.pipeStops[1]);
      topGrad.addColorStop(0.8, theme.pipeStops[2]);
      topGrad.addColorStop(1, theme.pipeStops[3]);

      // Top stem
      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x, 0, p.width, p.topHeight - lipHeight);
      ctx.strokeStyle = theme.pipeStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, 0, p.width, p.topHeight - lipHeight);

      // Top pipe collar / lip
      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x - lipExtend, p.topHeight - lipHeight, p.width + lipExtend * 2, lipHeight);
      ctx.strokeRect(p.x - lipExtend, p.topHeight - lipHeight, p.width + lipExtend * 2, lipHeight);

      // Measurement ticks on side
      this.drawPipeTicks(p.x + 4, 10, p.topHeight - lipHeight - 10, theme.tickColor);

      // --- Bottom Pipe ---
      const bottomHeight = this.canvas.height - p.bottomY;
      const btmGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
      btmGrad.addColorStop(0, theme.pipeStops[0]);
      btmGrad.addColorStop(0.35, theme.pipeStops[1]);
      btmGrad.addColorStop(0.8, theme.pipeStops[2]);
      btmGrad.addColorStop(1, theme.pipeStops[3]);

      // Bottom collar / lip
      ctx.fillStyle = btmGrad;
      ctx.strokeStyle = theme.pipeStroke;
      ctx.lineWidth = 2;
      ctx.fillRect(p.x - lipExtend, p.bottomY, p.width + lipExtend * 2, lipHeight);
      ctx.strokeRect(p.x - lipExtend, p.bottomY, p.width + lipExtend * 2, lipHeight);

      // Bottom stem
      ctx.fillStyle = btmGrad;
      ctx.fillRect(p.x, p.bottomY + lipHeight, p.width, bottomHeight - lipHeight);
      ctx.strokeRect(p.x, p.bottomY + lipHeight, p.width, bottomHeight - lipHeight);

      // Measurement ticks on bottom pipe
      this.drawPipeTicks(p.x + 4, p.bottomY + lipHeight + 6, bottomHeight - lipHeight - 12, theme.tickColor);
    }
  }

  /** Draw themed measurement tick markings on obstacle pipes */
  private drawPipeTicks(x: number, startY: number, length: number, color: string): void {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;

    const step = 14;
    const ticksCount = Math.floor(length / step);

    for (let i = 0; i < ticksCount; i++) {
      const y = startY + i * step;
      const tickLength = i % 2 === 0 ? 9 : 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + tickLength, y);
      ctx.stroke();
    }
  }

  /** Draw the active player glider skin with revive bubble shield */
  private drawFish(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.fish.x, this.fish.y);

    if (this.invulnTimer > 0) {
      const blinkingOut = this.invulnTimer < 35 && Math.floor(this.invulnTimer / 5) % 2 === 1;
      if (!blinkingOut) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 24 + Math.sin(this.frameCount * 0.2) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.rotate(this.fish.rotation);

    if (this.fish.skin === 'SUBMARINE') {
      this.drawSubmarineSkin(ctx);
    } else if (this.fish.skin === 'SHARK') {
      this.drawSharkSkin(ctx);
    } else {
      this.drawMantaSkin(ctx);
    }

    ctx.restore();
  }

  /** Draw realistic 3D Manta Ray sprite with smooth fin & tail swimming wave */
  private drawMantaSkin(ctx: CanvasRenderingContext2D): void {
    if (this.mantaSpriteReady && this.mantaSprite.naturalWidth > 0) {
      const srcW = this.mantaSprite.naturalWidth;
      const srcH = this.mantaSprite.naturalHeight;
      const drawW = 74;
      const drawH = (srcH / srcW) * drawW;

      // Anchor torso near the player's collision center (shifted slightly left so whip tail trails behind)
      const originX = -drawW * 0.56;
      const phase = this.swimPhase * 0.85 + this.fish.finAngle * 1.1;
      const wingFlex = 1 + Math.sin(phase) * 0.085;
      const originY = -drawH * 0.5 * wingFlex;

      const slices = 24;
      const sliceSrcW = srcW / slices;
      const sliceDstW = drawW / slices;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      for (let i = 0; i < slices; i++) {
        const u = i / (slices - 1); // 0 = whip tail & left wingtip, 1 = head & cephalic horns
        // Tail & outer wing flex gracefully while the head/eye stays anchored and sharp
        const flexWeight = Math.pow(Math.max(0, 1 - u * 1.18), 1.4);
        const waveY = Math.sin(phase - u * 4.4) * 3.6 * flexWeight;

        const sx = i * sliceSrcW;
        const sw = i === slices - 1 ? srcW - sx : sliceSrcW + 0.5;
        const dx = originX + i * sliceDstW;
        const dw = i === slices - 1 ? sliceDstW : sliceDstW + 0.6;

        ctx.drawImage(
          this.mantaSprite,
          sx,
          0,
          sw,
          srcH,
          dx,
          originY + waveY,
          dw,
          drawH * wingFlex
        );
      }

      ctx.restore();
      return;
    }

    // Immediate vector fallback before image decode completes
    const wingSpan = 16 + Math.sin(this.frameCount * 0.2) * 4;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.quadraticCurveTo(2, -wingSpan, -11, -wingSpan * 0.58);
    ctx.lineTo(-15, 0);
    ctx.lineTo(-11, wingSpan * 0.58);
    ctx.quadraticCurveTo(2, wingSpan, 16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this.drawSkinEye(ctx, 10, -3);
  }

  /** Draw Yellow-Orange Explorer Submarine skin with periscope & propeller */
  private drawSubmarineSkin(ctx: CanvasRenderingContext2D): void {
    // Spinning rear propeller
    ctx.save();
    ctx.translate(-20, 1);
    const bladeScale = Math.cos(this.frameCount * 0.55);
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-3, -2, 5, 4);
    ctx.beginPath();
    ctx.ellipse(-3, 0, 2.5, Math.max(2, Math.abs(bladeScale) * 9), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Conning tower & periscope on top
    ctx.fillStyle = '#ea580c';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-5, -16, 12, 7, 3);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(2, -16);
    ctx.lineTo(2, -21);
    ctx.lineTo(7, -21);
    ctx.stroke();

    // Main yellow-amber hull
    const hullGrad = ctx.createLinearGradient(0, -12, 0, 13);
    hullGrad.addColorStop(0, '#fde047');
    hullGrad.addColorStop(0.55, '#f59e0b');
    hullGrad.addColorStop(1, '#c2410c');
    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 1, 19, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red/teal racing stripe along hull
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.lineTo(16, 4);
    ctx.stroke();

    // Cyan cockpit porthole
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(6, -1, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(4.5, -2.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Draw Fearless Shark skin with tall dorsal fin, gill slits & teeth */
  private drawSharkSkin(ctx: CanvasRenderingContext2D): void {
    // Tall pointed dorsal fin
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-3, -10);
    ctx.quadraticCurveTo(-7, -21, -11, -20);
    ctx.lineTo(-10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Notched crescent shark tail
    ctx.save();
    ctx.translate(-16, 0);
    ctx.rotate(this.fish.finAngle);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Torpedo body
    const sharkGrad = ctx.createLinearGradient(0, -13, 0, 12);
    sharkGrad.addColorStop(0, '#64748b');
    sharkGrad.addColorStop(0.58, '#94a3b8');
    sharkGrad.addColorStop(0.62, '#f1f5f9');
    sharkGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = sharkGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(21, 1);
    ctx.quadraticCurveTo(10, -13, -16, -5);
    ctx.lineTo(-16, 5);
    ctx.quadraticCurveTo(8, 14, 21, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Side pectoral fin
    ctx.save();
    ctx.translate(-2, 5);
    ctx.rotate(-this.fish.finAngle * 1.2);
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-6, 9);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Three gill slits
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(1 + i * 2.5, -2);
      ctx.lineTo(i * 2.5, 4);
      ctx.stroke();
    }

    // Grin & tiny teeth
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(9, 5);
    ctx.quadraticCurveTo(14, 6, 18, 3);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(11, 5);
    ctx.lineTo(12.5, 3);
    ctx.lineTo(14, 5);
    ctx.lineTo(15.5, 3);
    ctx.lineTo(17, 4.5);
    ctx.fill();

    this.drawSkinEye(ctx, 11, -3.5);
  }

  /** Shared crisp cartoon eye for creature skins */
  private drawSkinEye(ctx: CanvasRenderingContext2D, ex: number, ey: number): void {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(ex + 1.3, ey, 2.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 0.8, ey - 1.2, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Draw themed ocean floor & speed-responsive seaweed */
  private drawSeabed(theme: LevelTheme): void {
    const ctx = this.ctx;
    const floorY = this.canvas.height - 65;
    const swaySpeed = 0.05 * (1 + (this.level - 1) * 0.18);

    // Ocean floor ground silhouette
    ctx.fillStyle = theme.floorBg;
    ctx.fillRect(0, floorY, this.canvas.width, 65);

    // Floor top edge rim
    ctx.fillStyle = theme.floorRim;
    ctx.fillRect(0, floorY, this.canvas.width, 6);

    // Coral / Seaweed swaying with current strength
    ctx.fillStyle = theme.weedColor;
    const weeds = [25, 75, 140, 210, 280, 345, 385];
    for (const wx of weeds) {
      const sway = Math.sin((this.frameCount + wx) * swaySpeed) * (6 + Math.min(5, this.level - 1));
      ctx.beginPath();
      ctx.moveTo(wx, floorY);
      ctx.quadraticCurveTo(wx + sway, floorY - 22, wx + sway * 1.5, floorY - 38);
      ctx.quadraticCurveTo(wx + sway * 0.8, floorY - 20, wx + 6, floorY);
      ctx.fill();
    }
  }

  /** Draw in-game score & level HUD */
  private drawScoreHeader(theme: LevelTheme): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(5, 20, 42, 0.78)';
    ctx.beginPath();
    ctx.roundRect(this.canvas.width / 2 - 86, 14, 172, 62, 12);
    ctx.fill();
    ctx.font = '800 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(`LEVEL ${this.level} · ${theme.name}`, this.canvas.width / 2, 32);
    ctx.font = '900 26px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.score.toString(), this.canvas.width / 2, 60);
    ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#c7e8ff';
    ctx.fillText(`${this.score % this.obstaclesPerLevel}/${this.obstaclesPerLevel} TO NEXT LEVEL`, this.canvas.width / 2, 88);
    ctx.restore();
  }

  /** Draw brief level-up celebration toast when advancing levels */
  private drawLevelUpBanner(theme: LevelTheme): void {
    const ctx = this.ctx;
    const progress = this.levelUpBannerTimer / 115;
    const alpha = Math.min(1, progress * 3, (1 - progress) * 4 + 0.35);
    const yOffset = (1 - Math.min(1, (1 - progress) * 5)) * -12;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(7, 22, 46, 0.9)';
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.canvas.width / 2 - 125, 102 + yOffset, 250, 42, 21);
    ctx.fill();
    ctx.stroke();

    ctx.font = '800 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(`⚡ ${this.levelUpText}`, this.canvas.width / 2, 122 + yOffset);
    ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SPEED BOOST ACTIVE!', this.canvas.width / 2, 136 + yOffset);
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
