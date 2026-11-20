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

const SUBMARINE_TIER_ASSETS = [
  'assets/sub-1-5.png',    // Level 1
  'assets/sub-6-10.png',   // Level 2
  'assets/sub-11-15.png',  // Level 3
  'assets/sub-16-20.png',  // Level 4
  'assets/sub-21-25.png',  // Level 5
  'assets/sub-26-30.png',  // Level 6
  'assets/sub-31-50.png',  // Level 7
  'assets/sub-51-71.png',  // Level 8
  'assets/sub-71-100.png'  // Level 9+
] as const;

const SHARK_TIER_ASSETS = [
  'assets/shark-lvl-2.png',  // Level 2
  'assets/shark-lvl-3.png',  // Level 3
  'assets/shark-lvl-4.png',  // Level 4
  'assets/shark-lvl-5.png',  // Level 5
  'assets/shark-lvl-6.png',  // Level 6
  'assets/shark-lvl-7.png',  // Level 7
  'assets/shark-lvl-8.png',  // Level 8
  'assets/shark-lvl-9.png',  // Level 9
  'assets/shark-lvl-10.png'  // Level 10+
] as const;

const MANTA_TIER_ASSETS = [
  'assets/manta-lvl-1.png',  // Level 1
  'assets/manta-lvl-2.png',  // Level 2
  'assets/manta-lvl-3.png',  // Level 3
  'assets/manta-lvl-4.png',  // Level 4
  'assets/manta-lvl-5.png',  // Level 5
  'assets/manta-lvl-6.png',  // Level 6
  'assets/manta-lvl-7.png'   // Level 7+
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
  private readonly viewW: number = 400;
  private readonly viewH: number = 600;
  private readonly renderScale: number;
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
  private evolutionFlashTimer: number = 0;
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
    const pipeSpeed = Math.min(6.2, 3.2 + lvl * 0.4);
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
  private firstLoginNameInput: HTMLInputElement | null;
  private homeDiverTag: HTMLElement | null;
  private nameInputHint: HTMLElement | null;
  private introSplash: HTMLElement | null;
  private homeScreen: HTMLElement;
  private playerNameScreen: HTMLElement;
  private tutorialScreen: HTMLElement;
  private gameScreen: HTMLElement;
  private legalScreen: HTMLElement;
  private characterScreen: HTMLElement;
  private readyScreen: HTMLElement;
  private leaderboardScreen: HTMLElement;
  private selectedSkin: Fish['skin'] = 'MANTA';
  private readonly legalVersion = '2026-11-v1';
  private mantaSprite: HTMLImageElement;
  private mantaSpriteReady: boolean = false;
  private mantaTierSprites: HTMLImageElement[] = [];
  private submarineTierSprites: HTMLImageElement[] = [];
  private sharkTierSprites: HTMLImageElement[] = [];

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    // Supersample backing canvas cleanly so 360px evolution sprites stay sharp on mobile & HD screens.
    this.renderScale = Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
    this.canvas.width = Math.round(this.viewW * this.renderScale);
    this.canvas.height = Math.round(this.viewH * this.renderScale);
    this.sound = new SoundManager();
    this.adManager = new AdManager();

    this.mantaSprite = new Image();
    this.mantaSprite.onload = () => {
      this.mantaSpriteReady = true;
    };
    this.mantaSprite.src = 'assets/manta-ray.png';

    const preload = (files: readonly string[]): HTMLImageElement[] =>
      files.map((file) => {
        const image = new Image();
        image.src = file;
        return image;
      });

    // Preload transparent Manta Ray, Submarine & Shark evolution sprites used per level tier.
    this.mantaTierSprites = preload(MANTA_TIER_ASSETS);
    this.submarineTierSprites = preload(SUBMARINE_TIER_ASSETS);
    this.sharkTierSprites = preload(SHARK_TIER_ASSETS);

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
    this.firstLoginNameInput = document.getElementById('firstLoginNameInput') as HTMLInputElement | null;
    this.homeDiverTag = document.getElementById('homeDiverTag');
    this.nameInputHint = document.getElementById('nameInputHint');
    this.introSplash = document.getElementById('introSplash');
    this.homeScreen = document.getElementById('homeScreen')!;
    this.playerNameScreen = document.getElementById('playerNameScreen')!;
    this.tutorialScreen = document.getElementById('tutorialScreen')!;
    this.gameScreen = document.getElementById('gameScreen')!;
    this.legalScreen = document.getElementById('legalScreen')!;
    this.characterScreen = document.getElementById('characterScreen')!;
    this.readyScreen = document.getElementById('readyScreen')!;
    this.leaderboardScreen = document.getElementById('leaderboardScreen')!;

    this.initIntroSplash();
    this.syncDiverBadge();

    const routeAfterLegal = () => {
      this.showScreen(this.getSavedPlayerName() ? 'character' : 'name');
    };

    document.getElementById('startGameBtn')?.addEventListener('click', () => {
      const accepted = localStorage.getItem('subsea_legal_acceptance') === this.legalVersion;
      if (!accepted) {
        this.showScreen('legal');
      } else {
        routeAfterLegal();
      }
    });
    document.getElementById('openLeaderboardBtn')?.addEventListener('click', () => {
      this.fetchLeaderboard();
      this.showScreen('leaderboard');
    });
    document.getElementById('leaderboardBackBtn')?.addEventListener('click', () => this.showScreen('home'));
    document.getElementById('acceptLegalBtn')?.addEventListener('click', () => {
      const privacy = document.getElementById('privacyAccept') as HTMLInputElement;
      const terms = document.getElementById('termsAccept') as HTMLInputElement;
      if (!privacy.checked || !terms.checked) return;
      localStorage.setItem('subsea_legal_acceptance', this.legalVersion);
      routeAfterLegal();
    });

    const commitFirstLoginName = () => {
      const raw = this.firstLoginNameInput?.value.trim().slice(0, 15) || '';
      if (!raw) {
        this.nameInputHint?.classList.remove('hidden');
        this.firstLoginNameInput?.focus();
        return;
      }
      this.nameInputHint?.classList.add('hidden');
      localStorage.setItem('flappy_player_name', raw);
      this.syncDiverBadge();
      this.showScreen('character');
    };
    document.getElementById('saveProfileNameBtn')?.addEventListener('click', commitFirstLoginName);
    this.firstLoginNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitFirstLoginName();
      }
    });
    document.getElementById('nameBackBtn')?.addEventListener('click', () => this.showScreen('home'));
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

    // Start pre-game BGM immediately on first user interaction
    this.sound.setBgmMode('menu');
    const unlockAudio = () => this.sound.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('visibilitychange', () => {
      this.sound.setPaused(document.hidden);
    });

    // Start loop
    requestAnimationFrame((t) => this.loop(t));
  }

  private initIntroSplash(): void {
    if (!this.introSplash) return;
    let closed = false;
    const dismiss = () => {
      if (closed || !this.introSplash) return;
      closed = true;
      this.sound.unlock();
      this.introSplash.classList.add('fade-out');
      window.setTimeout(() => {
        this.introSplash?.classList.add('hidden');
      }, 450);
    };
    this.introSplash.addEventListener('click', dismiss, { once: true });
    window.setTimeout(dismiss, 2400);
  }

  private getSavedPlayerName(): string {
    return (localStorage.getItem('flappy_player_name') || '').trim().slice(0, 15);
  }

  private syncDiverBadge(): void {
    const savedName = this.getSavedPlayerName();
    if (!this.homeDiverTag) return;
    if (savedName) {
      this.homeDiverTag.textContent = `🤿 Diver: ${savedName}`;
      this.homeDiverTag.classList.remove('hidden');
    } else {
      this.homeDiverTag.classList.add('hidden');
    }
  }

  private showScreen(screen: 'home' | 'legal' | 'name' | 'character' | 'tutorial' | 'ready' | 'leaderboard' | 'game'): void {
    this.homeScreen.classList.toggle('hidden', screen !== 'home');
    this.legalScreen.classList.toggle('hidden', screen !== 'legal');
    this.playerNameScreen.classList.toggle('hidden', screen !== 'name');
    this.characterScreen.classList.toggle('hidden', screen !== 'character');
    this.tutorialScreen.classList.toggle('hidden', screen !== 'tutorial');
    this.readyScreen.classList.toggle('hidden', screen !== 'ready');
    this.leaderboardScreen.classList.toggle('hidden', screen !== 'leaderboard');
    this.gameScreen.classList.toggle('hidden', screen !== 'game');
    if (screen === 'name') {
      this.nameInputHint?.classList.add('hidden');
      window.setTimeout(() => this.firstLoginNameInput?.focus(), 60);
    }
    if (screen !== 'game') {
      this.adManager.setGameplayActive(false);
      this.sound.setBgmMode('menu');
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
      y: this.viewH / 2 - 20,
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
      const baseX = Math.random() * this.viewW;
      this.bubbles.push({
        baseX: baseX,
        x: baseX,
        y: Math.random() * this.viewH,
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
        if (document.activeElement?.tagName === 'INPUT') return;
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

        this.sound.setPaused(true);
        const rewarded = await this.adManager.showRewardedForRevive();
        this.sound.setPaused(false);
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
  }

  /** User input action (swim or start) */
  private onAction(): void {
    this.sound.unlock();
    if (this.state === 'READY') {
      this.state = 'PLAYING';
      this.readyOverlay.classList.add('hidden');
      this.adManager.setGameplayActive(true);
      this.sound.setLevelIntensity(this.level);
      this.sound.setBgmMode('play');
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
    const maxTop = this.viewH - groundHeight - gap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxTop - minHeight + 1)) + minHeight;

    this.pipes.push({
      x: this.viewW + 10,
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
      if (b.baseX < -15) b.baseX += this.viewW + 30;
      b.x = b.baseX + Math.sin(this.frameCount * b.wobbleSpeed) * b.wobbleDistance;
      if (b.y < -10) {
        b.y = this.viewH + 10;
        b.baseX = Math.random() * this.viewW;
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
      this.fish.y = this.viewH / 2 - 20 + Math.sin(this.frameCount * 0.08) * 8;
      this.fish.rotation = 0;
      this.swimPhase += 0.16;
      this.fish.finAngle = Math.sin(this.swimPhase) * 0.3;
      return;
    }

    if (this.state === 'GAMEOVER') {
      if (this.shakeTimer > 0) this.shakeTimer--;
      // Fish sinks to seabed on death
      if (this.fish.y < this.viewH - 65 - this.fish.height / 2) {
        this.fish.velocity += this.fish.gravity * 1.4;
        this.fish.y += this.fish.velocity;
        this.fish.rotation = Math.min(Math.PI / 2, this.fish.rotation + 0.1);
      }
      return;
    }

    // --- PLAYING STATE ---
    if (this.invulnTimer > 0) this.invulnTimer--;
    if (this.levelUpBannerTimer > 0) this.levelUpBannerTimer--;
    if (this.evolutionFlashTimer > 0) this.evolutionFlashTimer--;

    // Apply gravity
    this.fish.velocity += this.fish.gravity;
    this.fish.y += this.fish.velocity;

    // Rotation based on velocity; fin beat accelerates seamlessly per level
    const targetAngle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.fish.velocity * 0.08));
    this.fish.rotation += (targetAngle - this.fish.rotation) * 0.2;
    this.swimPhase += 0.32 + Math.min(0.30, (this.level - 1) * 0.055);
    this.fish.finAngle = Math.sin(this.swimPhase) * 0.44;

    // Spawn pipes periodically
    const tuning = this.getLevelTuning();
    if (this.frameCount % tuning.spawnInterval === 0) {
      this.spawnPipe();
    }

    // Update and check pipes
    const pipeSpeed = tuning.pipeSpeed;
    const groundLevel = this.viewH - 65;

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
          this.evolutionFlashTimer = 45;
          if (this.gameLevelChip) this.gameLevelChip.textContent = `LEVEL ${this.level}`;
          this.sound.setLevelIntensity(this.level);
          this.sound.playLevelUp();
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
    this.sound.setBgmMode('menu');
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

    // Show frequency-capped Interstitial Ad after Game Over transition (pause BGM while ad displays)
    this.sound.setPaused(true);
    void this.adManager.handleGameOver().finally(() => this.sound.setPaused(false));

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
    this.fish.y = this.viewH * 0.45;
    this.fish.velocity = 0;
    this.fish.rotation = 0;
    this.pipes = this.pipes.filter((p) => p.x + p.width < this.fish.x - 40 || p.x > this.fish.x + 80);

    this.gameOverOverlay.classList.add('hidden');
    this.state = 'PLAYING';
    this.adManager.setGameplayActive(true);
    this.sound.setLevelIntensity(this.level);
    this.sound.setBgmMode('play');
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
    this.evolutionFlashTimer = 0;
    this.levelUpText = '';
    if (this.gameLevelChip) this.gameLevelChip.textContent = 'LEVEL 1';
    this.adManager.setGameplayActive(false);
    this.sound.setLevelIntensity(1);
    this.sound.setBgmMode('menu');
    this.initEntities();
    this.readyOverlay.classList.remove('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.fetchLeaderboard();
  }

  /** Render loop */
  private draw(): void {
    const ctx = this.ctx;
    const theme = this.getLevelTheme();
    ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
    ctx.save();

    // Camera shake effect on crash
    if (this.shakeTimer > 0) {
      const dx = (Math.random() - 0.5) * 8;
      const dy = (Math.random() - 0.5) * 8;
      ctx.translate(dx, dy);
    }

    // 1. Level-themed ocean background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.viewH);
    bgGrad.addColorStop(0, theme.bgStops[0]);
    bgGrad.addColorStop(0.3, theme.bgStops[1]);
    bgGrad.addColorStop(0.7, theme.bgStops[2]);
    bgGrad.addColorStop(1, theme.bgStops[3]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

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
        const rayGrad = ctx.createLinearGradient(baseX, 0, baseX - 40, this.viewH * 0.72);
        rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(baseX - 18, 0);
        ctx.lineTo(baseX + 26, 0);
        ctx.lineTo(baseX - 14, this.viewH * 0.72);
        ctx.lineTo(baseX - 78, this.viewH * 0.72);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const glowColor = theme.ambientMode === 'embers' ? '251, 146, 60' : '56, 189, 248';
      const speedY = theme.ambientMode === 'embers' ? 1.5 : 0.9;
      for (let i = 0; i < 14; i++) {
        const seedX = (i * 73 + 29) % this.viewW;
        const yPos = this.viewH - ((this.frameCount * speedY + i * 47) % (this.viewH - 40));
        const xPos = (seedX + Math.sin(this.frameCount * 0.04 + i) * 18 + this.viewW) % this.viewW;
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
        const y = 70 + ((i * 83) % (this.viewH - 160));
        const x = this.viewW - ((this.frameCount * streakSpeed + i * 97) % (this.viewW + len + 40));
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
    for (let x = 0; x <= this.viewW; x += 20) {
      const y = 8 + Math.sin((x + this.frameCount * rippleSpeed) * 0.05) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.viewW, 0);
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
      const bottomHeight = this.viewH - p.bottomY;
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

  /** Single-pass crisp HiDPI sprite renderer with smooth organic swim glide & ocean contrast. */
  private drawCrispCreatureSprite(
    ctx: CanvasRenderingContext2D,
    sprite: HTMLImageElement,
    drawW: number,
    anchorRatioX: number,
    flexAmpX: number,
    flexAmpY: number,
    wobbleAmp: number,
    rimColor: string
  ): void {
    const drawH = (sprite.naturalHeight / sprite.naturalWidth) * drawW;
    const phase = this.swimPhase * 0.9 + this.fish.finAngle * 0.85;
    const scaleX = 1 + Math.sin(phase) * flexAmpX;
    const scaleY = 1 - Math.sin(phase) * flexAmpY;
    const bobY = Math.sin(phase * 0.75) * 1.4;
    const pitchWobble = Math.sin(phase - 0.4) * wobbleAmp;

    ctx.save();
    ctx.rotate(pitchWobble);
    ctx.translate(0, bobY);
    ctx.scale(scaleX, scaleY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if ('filter' in ctx) {
      ctx.filter = 'brightness(1.16) contrast(1.12) saturate(1.16)';
    }
    ctx.shadowColor = rimColor;
    ctx.shadowBlur = 9;
    ctx.drawImage(sprite, -drawW * anchorRatioX, -drawH * 0.5, drawW, drawH);
    ctx.restore();
  }

  /** Shared golden-cyan evolution aura pulse rendered on glider tier upgrades. */
  private drawEvolutionFlash(ctx: CanvasRenderingContext2D): void {
    if (this.evolutionFlashTimer <= 0) return;
    const p = this.evolutionFlashTimer / 45;
    ctx.save();
    ctx.strokeStyle = `rgba(253, 224, 71, ${p})`;
    ctx.fillStyle = `rgba(56, 189, 248, ${p * 0.28})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + (1 - p) * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** Draw level-evolved Manta Ray sprite with crisp HD clarity & smooth wing-glide motion */
  private drawMantaSkin(ctx: CanvasRenderingContext2D): void {
    const tierIdx = Math.min(Math.max(0, this.level - 1), this.mantaTierSprites.length - 1);
    const tierSprite = this.mantaTierSprites[tierIdx];
    const sprite = tierSprite?.complete && tierSprite.naturalWidth > 0
      ? tierSprite
      : (this.mantaSpriteReady && this.mantaSprite.naturalWidth > 0 ? this.mantaSprite : null);

    if (sprite) {
      this.drawEvolutionFlash(ctx);
      this.drawCrispCreatureSprite(ctx, sprite, 104, 0.62, 0.025, 0.08, 0.045, 'rgba(125, 211, 252, 0.65)');
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

  /** Draw level-by-level evolved Submarine sprite with engine pulse & evolution aura */
  private drawSubmarineSkin(ctx: CanvasRenderingContext2D): void {
    const tierIdx = Math.min(Math.max(0, this.level - 1), this.submarineTierSprites.length - 1);
    const sprite = this.submarineTierSprites[tierIdx];
    if (sprite?.complete && sprite.naturalWidth > 0) {
      const drawW = tierIdx === 0 ? 64 : tierIdx === 1 ? 68 : 78;
      const drawH = (sprite.naturalHeight / sprite.naturalWidth) * drawW;
      const thrustPulse = 1 + Math.sin(this.swimPhase * 1.4) * 0.035;
      const bobY = Math.sin(this.swimPhase * 0.9) * 1.1;

      this.drawEvolutionFlash(ctx);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(thrustPulse, 1 / Math.sqrt(thrustPulse));
      ctx.drawImage(sprite, -drawW * 0.52, -drawH * 0.5 + bobY, drawW, drawH);
      ctx.restore();
      return;
    }

    // Immediate vector fallback before sprite decode completes
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

    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(6, -1, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /** Draw Fearless Shark (Level 1) & level-evolved armored Shark sprites (Level 2+) */
  private drawSharkSkin(ctx: CanvasRenderingContext2D): void {
    if (this.level >= 2) {
      const tierIdx = Math.min(this.level - 2, this.sharkTierSprites.length - 1);
      const sprite = this.sharkTierSprites[tierIdx];
      if (sprite?.complete && sprite.naturalWidth > 0) {
        this.drawEvolutionFlash(ctx);
        this.drawCrispCreatureSprite(ctx, sprite, 108, 0.56, 0.038, 0.024, 0.042, 'rgba(56, 189, 248, 0.62)');
        return;
      }
    }

    // Scale Level 1 base Shark cleanly to match Submarine & evolved sprite presence
    ctx.save();
    ctx.scale(1.45, 1.45);
    ctx.shadowColor = 'rgba(125, 211, 252, 0.55)';
    ctx.shadowBlur = 7;

    // Tall pointed dorsal fin (Level 1 base Shark)
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
    ctx.restore();
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
    const floorY = this.viewH - 65;
    const swaySpeed = 0.05 * (1 + (this.level - 1) * 0.18);

    // Ocean floor ground silhouette
    ctx.fillStyle = theme.floorBg;
    ctx.fillRect(0, floorY, this.viewW, 65);

    // Floor top edge rim
    ctx.fillStyle = theme.floorRim;
    ctx.fillRect(0, floorY, this.viewW, 6);

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
    ctx.roundRect(this.viewW / 2 - 86, 14, 172, 62, 12);
    ctx.fill();
    ctx.font = '800 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(`LEVEL ${this.level} · ${theme.name}`, this.viewW / 2, 32);
    ctx.font = '900 26px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.score.toString(), this.viewW / 2, 60);
    ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#c7e8ff';
    ctx.fillText(`${this.score % this.obstaclesPerLevel}/${this.obstaclesPerLevel} TO NEXT LEVEL`, this.viewW / 2, 88);
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
    ctx.roundRect(this.viewW / 2 - 125, 102 + yOffset, 250, 42, 21);
    ctx.fill();
    ctx.stroke();

    ctx.font = '800 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(`⚡ ${this.levelUpText}`, this.viewW / 2, 122 + yOffset);
    ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    const subMsg = this.fish.skin === 'SUBMARINE'
      ? 'SUBMARINE EVOLVED · SPEED BOOST!'
      : this.fish.skin === 'SHARK'
        ? 'SHARK EVOLVED · SPEED BOOST!'
        : 'MANTA RAY EVOLVED · SPEED BOOST!';
    ctx.fillText(subMsg, this.viewW / 2, 136 + yOffset);
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
  }

  /** Submit score to Python Backend using the saved first-login diver name */
  private async submitScoreToBackend(score: number): Promise<void> {
    try {
      const playerName = this.getSavedPlayerName() || 'Player';
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
