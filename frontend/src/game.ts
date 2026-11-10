/**
 * Underwater Flappy Adventure - Main Game Engine
 * Built with HTML5 Canvas & TypeScript
 * Features: Depth Zones, Pearls & Power-ups, Combos, Parallax Ocean, Pause/Resume, High-DPI Mobile Support
 */

import {
  GameStatus,
  Fish,
  Pipe,
  Bubble,
  ScoreRecord,
  SkinType,
  Collectible,
  CollectibleType,
  FloatingText,
  ParallaxSilhouette,
  DepthZone
} from './types.js';
import { SoundManager } from './audio.js';

const SKIN_ICONS: Record<SkinType, string> = {
  MANTA: '🐟',
  SUBMARINE: '🚤',
  SHARK: '🦈',
  ANGLER: '🏮'
};

export class FlappyGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sound: SoundManager;

  // Logical Game Dimensions (Resolution-independent)
  private readonly logicalWidth = 400;
  private readonly logicalHeight = 600;
  private dpr: number = 1;

  // Game States
  private state: GameStatus = 'READY';
  private score: number = 0;
  private bestScore: number = 0;
  private totalPearls: number = 0;
  private runPearls: number = 0;
  private perfectStreak: number = 0;
  private frameCount: number = 0;
  private spawnCounter: number = 0;
  private lastTime: number = 0;
  private shakeTimer: number = 0;
  private currentSkin: SkinType = 'MANTA';
  private currentZone: DepthZone = 'SUNLIT';
  private currentLevel: number = 1;
  private playerName: string = 'Player';
  private isOnboarded: boolean = false;
  private leaderboardPeriod: 'all' | 'today' = 'all';

  // Power-Up States (in frames at ~60fps)
  private hasShield: boolean = false;
  private invulnTimer: number = 0;
  private slowMoTimer: number = 0;
  private magnetTimer: number = 0;
  private resumeCountdown: number = 0;
  private countdownTimerId: number | null = null;

  // Game Entities
  private fish!: Fish;
  private pipes: Pipe[] = [];
  private collectibles: Collectible[] = [];
  private floatingTexts: FloatingText[] = [];
  private silhouettes: ParallaxSilhouette[] = [];
  private bubbles: Bubble[] = [];
  private swimParticles: Array<{ x: number; y: number; r: number; alpha: number; vy: number; color?: string }> = [];

  // DOM Elements
  private readyOverlay: HTMLElement;
  private pauseOverlay: HTMLElement | null;
  private pauseTitle: HTMLElement | null;
  private resumeBtn: HTMLElement | null;
  private pauseBtn: HTMLElement | null;
  private gameOverOverlay: HTMLElement;
  private finalScoreEl: HTMLElement;
  private bestScoreEl: HTMLElement;
  private runPearlsEl: HTMLElement | null;
  private pearlBankEl: HTMLElement | null;
  private medalBadgeEl: HTMLElement | null;
  private rankFeedbackEl: HTMLElement | null;
  private missionPillEl: HTMLElement | null;
  private activeHudEl: HTMLElement | null;
  private anglerSkinBtn: HTMLElement | null;
  private resetBtn: HTMLElement;
  private playAgainBtn: HTMLElement;
  private soundBtn: HTMLElement;
  private leaderboardList: HTMLElement | null;
  private tabAllTime: HTMLElement | null;
  private tabToday: HTMLElement | null;
  private onboardingOverlay: HTMLElement | null;
  private diverNameBadge: HTMLElement | null;
  private diverNameText: HTMLElement | null;
  private homeBtn: HTMLElement | null;
  private howItWorksBtn: HTMLElement | null;
  private closeModalBtn: HTMLElement | null;
  private infoModal: HTMLElement | null;
  private mobileLeaderboardBtn: HTMLElement | null;
  private closeLeaderboardBtn: HTMLElement | null;
  private leaderboardPanel: HTMLElement | null;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.sound = new SoundManager();

    // Cache UI elements
    this.readyOverlay = document.getElementById('readyOverlay')!;
    this.pauseOverlay = document.getElementById('pauseOverlay');
    this.pauseTitle = document.getElementById('pauseTitle');
    this.resumeBtn = document.getElementById('resumeBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.gameOverOverlay = document.getElementById('gameOverOverlay')!;
    this.finalScoreEl = document.getElementById('finalScore')!;
    this.bestScoreEl = document.getElementById('bestScore')!;
    this.runPearlsEl = document.getElementById('runPearls');
    this.pearlBankEl = document.getElementById('pearlBank');
    this.medalBadgeEl = document.getElementById('medalBadge');
    this.rankFeedbackEl = document.getElementById('rankFeedback');
    this.missionPillEl = document.getElementById('missionPill');
    this.activeHudEl = document.getElementById('activeHud');
    this.anglerSkinBtn = document.getElementById('anglerSkinBtn');
    this.resetBtn = document.getElementById('resetBtn')!;
    this.playAgainBtn = document.getElementById('playAgainBtn')!;
    this.homeBtn = document.getElementById('homeBtn');
    this.soundBtn = document.getElementById('soundToggleBtn')!;
    this.leaderboardList = document.getElementById('leaderboardList');
    this.tabAllTime = document.getElementById('tabAllTime');
    this.tabToday = document.getElementById('tabToday');
    this.onboardingOverlay = document.getElementById('onboardingOverlay');
    this.diverNameBadge = document.getElementById('diverNameBadge');
    this.diverNameText = document.getElementById('diverNameText');
    this.howItWorksBtn = document.getElementById('howItWorksBtn');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.infoModal = document.getElementById('infoModal');
    this.mobileLeaderboardBtn = document.getElementById('mobileLeaderboardBtn');
    this.closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
    this.leaderboardPanel = document.getElementById('leaderboardPanel');

    this.loadPreferences();
    this.setupCanvasDPR();
    window.addEventListener('resize', () => this.setupCanvasDPR());

    this.initEntities();
    this.initBackgroundBubbles();
    this.initParallaxSilhouettes();
    this.initOnboarding();
    this.bindEvents();
    this.updateProgressionUI();
    this.fetchLeaderboard();

    requestAnimationFrame((t) => this.loop(t));
  }

  /** Setup canvas internal buffer for crisp High-DPI (Retina) rendering */
  private setupCanvasDPR(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(this.logicalWidth * this.dpr);
    this.canvas.height = Math.round(this.logicalHeight * this.dpr);
  }

  /** Check if Anglerfish skin is unlocked */
  private isAnglerUnlocked(): boolean {
    return this.totalPearls >= 10 || this.bestScore >= 15;
  }

  /** Load saved skin, pearls, diver name, and high score */
  private loadPreferences(): void {
    const stored = localStorage.getItem('flappy_best_score');
    if (stored) {
      this.bestScore = parseInt(stored, 10) || 0;
    }
    const storedPearls = localStorage.getItem('flappy_total_pearls');
    if (storedPearls) {
      this.totalPearls = parseInt(storedPearls, 10) || 0;
    }
    const savedName = localStorage.getItem('flappy_player_name');
    if (savedName && savedName.trim()) {
      this.playerName = savedName.trim();
    }
    const savedSkin = localStorage.getItem('flappy_skin') as SkinType;
    if (
      savedSkin === 'MANTA' ||
      savedSkin === 'SUBMARINE' ||
      savedSkin === 'SHARK' ||
      (savedSkin === 'ANGLER' && this.isAnglerUnlocked())
    ) {
      this.currentSkin = savedSkin;
    }
  }

  /** First-time onboarding flow (Welcome -> Terms -> Name -> How to Play) */
  private initOnboarding(): void {
    const termsOk = localStorage.getItem('subsea_terms_accepted') === 'true';
    const hasName = Boolean(localStorage.getItem('flappy_player_name')?.trim());
    const onboarded = localStorage.getItem('subsea_onboarded') === 'true';

    this.updateDiverBadge();

    if (termsOk && hasName && onboarded) {
      this.isOnboarded = true;
      this.onboardingOverlay?.classList.add('hidden');
      this.readyOverlay.classList.remove('hidden');
      return;
    }

    this.isOnboarded = false;
    this.readyOverlay.classList.add('hidden');
    this.onboardingOverlay?.classList.remove('hidden');

    const showStep = (stepNum: number) => {
      const steps = document.querySelectorAll<HTMLElement>('.onboard-step');
      steps.forEach((el) => {
        el.classList.toggle('hidden', el.dataset.step !== String(stepNum));
      });
    };

    const startStep = !termsOk ? 1 : !hasName ? 3 : 4;
    showStep(startStep);

    document.getElementById('onboardStartBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showStep(termsOk ? (hasName ? 4 : 3) : 2);
    });

    const termsCheck = document.getElementById('acceptTermsCheck') as HTMLInputElement | null;
    const acceptTermsBtn = document.getElementById('acceptTermsBtn') as HTMLButtonElement | null;
    if (termsCheck && acceptTermsBtn) {
      termsCheck.addEventListener('change', () => {
        acceptTermsBtn.disabled = !termsCheck.checked;
      });
      acceptTermsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!termsCheck.checked) return;
        localStorage.setItem('subsea_terms_accepted', 'true');
        showStep(hasName ? 4 : 3);
      });
    }

    const nameInput = document.getElementById('onboardNameInput') as HTMLInputElement | null;
    const nameError = document.getElementById('nameErrorMsg');
    const saveNameBtn = document.getElementById('saveOnboardNameBtn');
    const submitOnboardName = () => {
      const clean = (nameInput?.value || '').trim().slice(0, 15);
      if (!clean) {
        nameError?.classList.remove('hidden');
        return;
      }
      nameError?.classList.add('hidden');
      this.playerName = clean;
      localStorage.setItem('flappy_player_name', clean);
      this.updateDiverBadge();
      nameInput?.blur();
      showStep(4);
    };

    saveNameBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      submitOnboardName();
    });
    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitOnboardName();
      }
    });

    document.getElementById('finishOnboardBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.setItem('subsea_onboarded', 'true');
      this.isOnboarded = true;
      this.onboardingOverlay?.classList.add('hidden');
      this.readyOverlay.classList.remove('hidden');
    });
  }

  /** Display saved diver name on Ready/Home screen */
  private updateDiverBadge(): void {
    const saved = localStorage.getItem('flappy_player_name')?.trim();
    if (saved && this.diverNameBadge && this.diverNameText) {
      this.diverNameText.textContent = saved;
      this.diverNameBadge.classList.remove('hidden');
    }
  }

  /** Update pearl counter, unlock state, and mission goal pill */
  private updateProgressionUI(): void {
    if (this.pearlBankEl) {
      this.pearlBankEl.textContent = this.totalPearls.toString();
    }
    if (this.anglerSkinBtn) {
      this.anglerSkinBtn.classList.toggle('locked', !this.isAnglerUnlocked());
    }
    if (this.missionPillEl) {
      if (!this.isAnglerUnlocked()) {
        const pearlsLeft = Math.max(0, 10 - this.totalPearls);
        this.missionPillEl.textContent = `🏮 Collect ${pearlsLeft} more Pearls (or reach 15 pts) to unlock Angler!`;
      } else if (this.bestScore < 25) {
        this.missionPillEl.textContent = '🥈 Goal: Reach 25 pts for the Silver Medal!';
      } else if (this.bestScore < 50) {
        this.missionPillEl.textContent = '🥇 Goal: Reach 50 pts for the Gold Medal!';
      } else {
        this.missionPillEl.textContent = '👑 Abyssal Master! Beat your Best Score!';
      }
    }
    this.updateSkinButtonsUI();
  }

  /** Initialize or reset player fish and run states */
  private initEntities(): void {
    this.fish = {
      x: 90,
      y: this.logicalHeight / 2 - 20,
      radius: 14,
      width: 38,
      height: 28,
      velocity: 0,
      gravity: 0.20,
      swimForce: -5.0,
      rotation: 0,
      finAngle: 0,
      skin: this.currentSkin
    };
    this.pipes = [];
    this.collectibles = [];
    this.floatingTexts = [];
    this.swimParticles = [];
    this.runPearls = 0;
    this.perfectStreak = 0;
    this.spawnCounter = 45; // Gentle warm-up buffer before 1st pipe appears
    this.currentZone = 'SUNLIT';
    this.currentLevel = 1;
    this.hasShield = false;
    this.invulnTimer = 0;
    this.slowMoTimer = 0;
    this.magnetTimer = 0;
    this.updateActiveHud();
  }

  /** Generate ambient floating bubbles */
  private initBackgroundBubbles(): void {
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

  /** Generate distant parallax silhouettes (coral, shipwreck, fish schools) */
  private initParallaxSilhouettes(): void {
    this.silhouettes = [
      { x: 40, y: this.logicalHeight - 65, width: 70, height: 55, kind: 'CORAL', speed: 0.45 },
      { x: 210, y: this.logicalHeight - 65, width: 110, height: 50, kind: 'SHIP', speed: 0.35 },
      { x: 350, y: this.logicalHeight - 65, width: 65, height: 48, kind: 'CORAL', speed: 0.45 },
      { x: 140, y: 170, width: 55, height: 22, kind: 'FISH_SCHOOL', speed: 0.7 },
      { x: 320, y: 290, width: 45, height: 18, kind: 'FISH_SCHOOL', speed: 0.55 }
    ];
  }

  /** Safe mobile haptic vibration */
  private vibrate(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore on unsupported browsers
      }
    }
  }

  /** Bind Keyboard, Touch, Click and UI Button events */
  private bindEvents(): void {
    const unlockAudioOnce = () => {
      this.sound.unlockAudio();
      window.removeEventListener('pointerdown', unlockAudioOnce);
      window.removeEventListener('keydown', unlockAudioOnce);
    };
    window.addEventListener('pointerdown', unlockAudioOnce, { passive: true });
    window.addEventListener('keydown', unlockAudioOnce, { passive: true });

    const handleAction = (e?: Event) => {
      if (e) e.preventDefault();
      this.onAction();
    };

    const playArea = this.canvas.parentElement || this.canvas;
    playArea.addEventListener('pointerdown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, input, label, a')) return;
      handleAction(e);
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isOnboarded) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleAction();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED' && this.resumeCountdown === 0) this.resumeGame();
      }
    });

    this.resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetGame();
    });

    // Direct Restart straight into a new round
    this.playAgainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.restartDirect();
    });

    // Home returns to Ready to Dive screen
    if (this.homeBtn) {
      this.homeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetGame();
      });
    }

    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED' && this.resumeCountdown === 0) this.resumeGame();
      });
    }

    if (this.resumeBtn) {
      this.resumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.state === 'PAUSED' && this.resumeCountdown === 0) this.resumeGame();
      });
    }

    this.soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const enabled = this.sound.toggle();
      this.soundBtn.textContent = enabled ? '🔊' : '🔇';
    });

    // Skin selector buttons
    const skinBtns = document.querySelectorAll<HTMLButtonElement>('.skin-btn');
    skinBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skin = btn.dataset.skin as SkinType;
        if (!skin) return;
        if (skin === 'ANGLER' && !this.isAnglerUnlocked()) {
          const pearlsLeft = Math.max(0, 10 - this.totalPearls);
          this.spawnFloatingText(this.logicalWidth / 2, 130, `Need ${pearlsLeft} more 🦪 or 15 pts!`, '#fde047');
          return;
        }
        this.currentSkin = skin;
        this.fish.skin = skin;
        localStorage.setItem('flappy_skin', skin);
        this.updateSkinButtonsUI();
      });
    });

    // Leaderboard Filter Tabs (All-Time vs Today)
    const setTab = (period: 'all' | 'today') => {
      this.leaderboardPeriod = period;
      this.tabAllTime?.classList.toggle('active', period === 'all');
      this.tabToday?.classList.toggle('active', period === 'today');
      this.fetchLeaderboard();
    };
    this.tabAllTime?.addEventListener('click', (e) => { e.stopPropagation(); setTab('all'); });
    this.tabToday?.addEventListener('click', (e) => { e.stopPropagation(); setTab('today'); });

    // Mobile Leaderboard Drawer toggle
    if (this.mobileLeaderboardBtn && this.leaderboardPanel) {
      this.mobileLeaderboardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.leaderboardPanel!.classList.add('open');
        this.fetchLeaderboard();
      });
    }

    if (this.closeLeaderboardBtn && this.leaderboardPanel) {
      this.closeLeaderboardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.leaderboardPanel!.classList.remove('open');
      });
    }

    document.addEventListener('pointerdown', (e) => {
      if (
        this.leaderboardPanel &&
        this.leaderboardPanel.classList.contains('open') &&
        !this.leaderboardPanel.contains(e.target as Node) &&
        e.target !== this.mobileLeaderboardBtn
      ) {
        this.leaderboardPanel.classList.remove('open');
      }
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

  /** Update active visual styling on skin buttons */
  private updateSkinButtonsUI(): void {
    const skinBtns = document.querySelectorAll<HTMLButtonElement>('.skin-btn');
    skinBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.skin === this.currentSkin);
    });
  }

  /** Pause gameplay */
  private pauseGame(): void {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.resumeCountdown = 0;
    if (this.pauseTitle) this.pauseTitle.textContent = 'Paused';
    this.resumeBtn?.classList.remove('hidden');
    this.pauseOverlay?.classList.remove('hidden');
  }

  /** Resume gameplay with 3-2-1 countdown */
  private resumeGame(): void {
    if (this.state !== 'PAUSED' || this.resumeCountdown > 0) return;
    this.resumeCountdown = 3;
    this.resumeBtn?.classList.add('hidden');
    if (this.pauseTitle) this.pauseTitle.textContent = '3';

    const tick = () => {
      this.resumeCountdown--;
      if (this.resumeCountdown > 0) {
        if (this.pauseTitle) this.pauseTitle.textContent = this.resumeCountdown.toString();
        this.countdownTimerId = window.setTimeout(tick, 650);
      } else {
        this.pauseOverlay?.classList.add('hidden');
        this.resumeBtn?.classList.remove('hidden');
        this.state = 'PLAYING';
        this.fish.velocity = Math.min(this.fish.velocity, 0);
      }
    };
    this.countdownTimerId = window.setTimeout(tick, 650);
  }

  /** User input action (swim or start) */
  private onAction(): void {
    if (!this.isOnboarded) return;
    if (this.state === 'READY') {
      this.state = 'PLAYING';
      this.readyOverlay.classList.add('hidden');
      this.pauseBtn?.classList.remove('hidden');
      this.swim();
    } else if (this.state === 'PLAYING') {
      this.swim();
    }
  }

  /** Flap/swim up */
  private swim(): void {
    this.fish.velocity = this.fish.swimForce;
    this.sound.playSwim();

    const trailColor =
      this.currentSkin === 'SUBMARINE'
        ? 'rgba(253, 224, 71, 0.7)'
        : this.currentSkin === 'ANGLER'
        ? 'rgba(103, 232, 249, 0.8)'
        : 'rgba(180, 230, 255, 0.75)';

    for (let i = 0; i < 4; i++) {
      this.swimParticles.push({
        x: this.fish.x - 14 + (Math.random() * 6 - 3),
        y: this.fish.y + 4 + (Math.random() * 6 - 3),
        r: Math.random() * 3.5 + 1.5,
        alpha: 0.75,
        vy: -(Math.random() * 1 + 0.5),
        color: trailColor
      });
    }
  }

  /** Smooth 6-level progression curve based on score */
  private getDifficultyConfig(): { level: number; zone: DepthZone; speed: number; gap: number; spawnFrames: number; oscChance: number; label: string } {
    const tiers: Array<{ min: number; level: number; zone: DepthZone; speed: number; gap: number; spawnFrames: number; oscChance: number; label: string }> = [
      { min: 75, level: 6, zone: 'ABYSS', speed: 3.5, gap: 126, spawnFrames: 72, oscChance: 0.65, label: '🔥 HYPER CURRENT!' },
      { min: 50, level: 5, zone: 'ABYSS', speed: 3.2, gap: 132, spawnFrames: 78, oscChance: 0.55, label: '🌑 ABYSSAL SURGE!' },
      { min: 30, level: 4, zone: 'TWILIGHT', speed: 2.9, gap: 138, spawnFrames: 84, oscChance: 0.40, label: '⚡ 30 PTS SPEED BOOST!' },
      { min: 20, level: 3, zone: 'TWILIGHT', speed: 2.6, gap: 146, spawnFrames: 90, oscChance: 0.25, label: '🌊 TWILIGHT DRIFT' },
      { min: 10, level: 2, zone: 'SUNLIT', speed: 2.35, gap: 156, spawnFrames: 98, oscChance: 0, label: '⚡ LEVEL 2: REEF CRUISE' },
      { min: 0, level: 1, zone: 'SUNLIT', speed: 2.1, gap: 168, spawnFrames: 108, oscChance: 0, label: '☀️ SUNLIT WARMUP' }
    ];
    const cfg = tiers.find((t) => this.score >= t.min)!;
    const speed = this.slowMoTimer > 0 ? cfg.speed * 0.65 : cfg.speed;
    return { ...cfg, speed };
  }

  /** Spawn pipe obstacle + optional Pearl or Power-up */
  private spawnPipe(gap: number, oscChance: number): void {
    const minHeight = 55;
    const groundHeight = 65;
    const maxTop = this.logicalHeight - groundHeight - gap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxTop - minHeight + 1)) + minHeight;
    const shouldOscillate = oscChance > 0 && Math.random() < oscChance;

    const pipeX = this.logicalWidth + 10;
    this.pipes.push({
      x: pipeX,
      topHeight: topHeight,
      baseTopHeight: topHeight,
      bottomY: topHeight + gap,
      width: 58,
      gap: gap,
      passed: false,
      oscAmp: shouldOscillate ? 20 : 0,
      oscSpeed: 0.032,
      oscPhase: Math.random() * Math.PI * 2
    });

    // Spawn Golden Pearl inside pipe gap (60% chance)
    if (Math.random() < 0.6) {
      const offsetY = (Math.random() - 0.5) * (gap * 0.4);
      this.collectibles.push({
        x: pipeX + 29,
        y: topHeight + gap / 2 + offsetY,
        radius: 10,
        type: 'PEARL',
        phase: Math.random() * Math.PI * 2,
        collected: false
      });
    } else if (Math.random() < 0.28) {
      const types: CollectibleType[] = ['SHIELD', 'SLOWMO', 'MAGNET'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      this.collectibles.push({
        x: pipeX + 125,
        y: Math.max(95, Math.min(this.logicalHeight - 135, topHeight + gap / 2)),
        radius: 13,
        type: chosen,
        phase: 0,
        collected: false
      });
    }
  }

  /** Spawn floating feedback text */
  private spawnFloatingText(x: number, y: number, text: string, color: string = '#ffffff'): void {
    this.floatingTexts.push({ x, y, text, color, alpha: 1.0, vy: -1.1 });
  }

  /** Update active power-up HUD badges */
  private updateActiveHud(): void {
    if (!this.activeHudEl) return;
    const items: string[] = [];
    if (this.hasShield) items.push('<span class="hud-badge">🫧 Shield Ready</span>');
    if (this.slowMoTimer > 0) items.push(`<span class="hud-badge">⏱️ ${(this.slowMoTimer / 60).toFixed(1)}s</span>`);
    if (this.magnetTimer > 0) items.push(`<span class="hud-badge">🧲 ${(this.magnetTimer / 60).toFixed(1)}s</span>`);
    this.activeHudEl.innerHTML = items.join('');
  }

  /** Update physics and game logic (normalized to 60 FPS via dt) */
  private update(dt: number): void {
    if (this.state === 'PAUSED') return;

    this.frameCount += dt;

    // Update ambient bubbles
    for (const b of this.bubbles) {
      b.y -= b.speed * dt;
      b.x = b.baseX + Math.sin(this.frameCount * b.wobbleSpeed) * b.wobbleDistance;
      if (b.y < -10) {
        b.y = this.logicalHeight + 10;
        b.baseX = Math.random() * this.logicalWidth;
      }
    }

    // Update swim bubbles
    for (let i = this.swimParticles.length - 1; i >= 0; i--) {
      const p = this.swimParticles[i];
      p.y += p.vy * dt;
      p.x -= 1.2 * dt;
      p.alpha -= 0.025 * dt;
      if (p.alpha <= 0) this.swimParticles.splice(i, 1);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 0.018 * dt;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }

    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    // Gentle hovering in READY state
    if (this.state === 'READY') {
      this.fish.y = this.logicalHeight / 2 - 20 + Math.sin(this.frameCount * 0.08) * 8;
      this.fish.rotation = 0;
      this.fish.finAngle = Math.sin(this.frameCount * 0.15) * 0.3;
      return;
    }

    if (this.state === 'GAMEOVER') {
      if (this.fish.y < this.logicalHeight - 65 - this.fish.height / 2) {
        this.fish.velocity = Math.min(7, this.fish.velocity + this.fish.gravity * 1.4 * dt);
        this.fish.y += this.fish.velocity * dt;
        this.fish.rotation = Math.min(Math.PI / 2, this.fish.rotation + 0.1 * dt);
      }
      return;
    }

    // --- PLAYING STATE ---
    const { level, zone, speed, gap, spawnFrames, oscChance, label } = this.getDifficultyConfig();
    this.currentZone = zone;

    if (level > this.currentLevel) {
      this.currentLevel = level;
      this.spawnFloatingText(this.logicalWidth / 2, 110, label, '#38bdf8');
      this.sound.playPowerUp();
    }

    // Power-up timers
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.slowMoTimer > 0) this.slowMoTimer = Math.max(0, this.slowMoTimer - dt);
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    this.updateActiveHud();

    // Update parallax silhouettes
    for (const s of this.silhouettes) {
      s.x -= s.speed * (speed / 2.4) * dt;
      if (s.x + s.width < -20) {
        s.x = this.logicalWidth + 30 + Math.random() * 60;
      }
    }

    // Balanced Sub-Sea Glider physics with terminal fall cap
    this.fish.velocity = Math.min(5.8, this.fish.velocity + this.fish.gravity * dt);
    this.fish.y += this.fish.velocity * dt;

    const targetAngle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.fish.velocity * 0.08));
    this.fish.rotation += (targetAngle - this.fish.rotation) * Math.min(1, 0.2 * dt);
    this.fish.finAngle = Math.sin(this.frameCount * 0.3) * 0.4;

    // Spawn pipes
    this.spawnCounter += dt;
    if (this.spawnCounter >= spawnFrames) {
      this.spawnCounter = 0;
      this.spawnPipe(gap, oscChance);
    }

    const groundLevel = this.logicalHeight - 65;

    // Ceiling clamp
    if (this.fish.y - this.fish.radius <= 0) {
      this.fish.y = this.fish.radius;
      this.fish.velocity = 0;
    }

    // Floor collision
    if (this.fish.y + this.fish.radius >= groundLevel) {
      if (this.hasShield) {
        this.consumeShield();
        this.fish.y = groundLevel - this.fish.radius - 4;
        this.fish.velocity = this.fish.swimForce;
      } else {
        this.triggerGameOver();
        return;
      }
    }

    // Update pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= speed * dt;

      if (p.oscAmp > 0) {
        p.oscPhase += p.oscSpeed * dt;
        p.topHeight = p.baseTopHeight + Math.sin(p.oscPhase) * p.oscAmp;
        p.bottomY = p.topHeight + p.gap;
      }

      // Score passing & Perfect Pass check
      if (!p.passed && p.x + p.width < this.fish.x) {
        p.passed = true;
        const gapCenter = p.topHeight + p.gap / 2;
        const isPerfect = Math.abs(this.fish.y - gapCenter) <= 18;

        if (isPerfect) {
          this.perfectStreak++;
          this.score += 2;
          this.sound.playScore(this.perfectStreak);
          this.vibrate(8);
          const msg = this.perfectStreak > 1 ? `PERFECT x${this.perfectStreak}! +2` : 'PERFECT! +2';
          this.spawnFloatingText(this.fish.x + 15, this.fish.y - 24, msg, '#4ade80');
        } else {
          this.perfectStreak = 0;
          this.score += 1;
          this.sound.playScore(0);
        }

        this.updateBestScore();
      }

      // Pipe collision
      if (this.invulnTimer === 0 && this.checkPipeCollision(p)) {
        if (this.hasShield) {
          this.consumeShield();
          this.fish.velocity = -4;
        } else {
          this.triggerGameOver();
          return;
        }
      }

      if (p.x + p.width < -20) {
        this.pipes.splice(i, 1);
      }
    }

    // Update collectibles (Pearls & Power-Ups)
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.x -= speed * dt;
      c.phase += 0.08 * dt;

      // Magnet pulls Pearls toward fish
      if (c.type === 'PEARL' && this.magnetTimer > 0) {
        const dx = this.fish.x - c.x;
        const dy = this.fish.y - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140 && dist > 1) {
          c.x += (dx / dist) * 5.2 * dt;
          c.y += (dy / dist) * 5.2 * dt;
        }
      }

      // Check pickup
      const dist = Math.hypot(this.fish.x - c.x, this.fish.y - c.y);
      if (dist < this.fish.radius + c.radius + 4) {
        this.handleCollectiblePickup(c);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (c.x < -30) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  /** Absorb one collision when Bubble Shield is active (2.5s recovery & shake) */
  private consumeShield(): void {
    this.hasShield = false;
    this.invulnTimer = 150; // 2.5s grace period at 60fps
    this.shakeTimer = 150;  // 2.5s screen shake, stops cleanly afterward
    this.sound.playShieldBreak();
    this.vibrate(25);
    this.spawnFloatingText(this.fish.x, this.fish.y - 24, '🫧 SHIELD SAVED!', '#38bdf8');
    this.updateActiveHud();
  }

  /** Apply Pearl or Power-up effect */
  private handleCollectiblePickup(c: Collectible): void {
    this.vibrate(10);
    if (c.type === 'PEARL') {
      this.score += 2;
      this.runPearls += 1;
      this.totalPearls += 1;
      localStorage.setItem('flappy_total_pearls', this.totalPearls.toString());
      this.sound.playPearl();
      this.spawnFloatingText(c.x, c.y - 12, '+2 🦪', '#fde047');
      this.updateBestScore();
      this.updateProgressionUI();
    } else if (c.type === 'SHIELD') {
      this.hasShield = true;
      this.sound.playPowerUp();
      this.spawnFloatingText(c.x, c.y - 12, '🫧 SHIELD!', '#38bdf8');
      this.updateActiveHud();
    } else if (c.type === 'SLOWMO') {
      this.slowMoTimer = 300; // 5s
      this.sound.playPowerUp();
      this.spawnFloatingText(c.x, c.y - 12, '⏱️ CALM CURRENT!', '#a78bfa');
      this.updateActiveHud();
    } else if (c.type === 'MAGNET') {
      this.magnetTimer = 420; // 7s
      this.sound.playPowerUp();
      this.spawnFloatingText(c.x, c.y - 12, '🧲 PEARL MAGNET!', '#f472b6');
      this.updateActiveHud();
    }
  }

  /** Update best score & unlock check */
  private updateBestScore(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('flappy_best_score', this.bestScore.toString());
    }
  }

  /** Circle to Rectangle collision detection (forgiving hitbox) */
  private checkPipeCollision(p: Pipe): boolean {
    const fx = this.fish.x;
    const fy = this.fish.y;
    const r = this.fish.radius - 3.5;

    if (fx + r > p.x && fx - r < p.x + p.width && fy - r < p.topHeight) {
      return true;
    }
    if (fx + r > p.x && fx - r < p.x + p.width && fy + r > p.bottomY) {
      return true;
    }
    return false;
  }

  /** Determine medal earned based on run score */
  private getMedalLabel(score: number): string | null {
    if (score >= 80) return '👑 Abyssal Legend';
    if (score >= 50) return '🥇 Gold Diver';
    if (score >= 25) return '🥈 Silver Diver';
    if (score >= 10) return '🥉 Bronze Diver';
    return null;
  }

  /** Trigger Game Over sequence */
  private triggerGameOver(): void {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    this.shakeTimer = 16;
    this.pauseBtn?.classList.add('hidden');
    this.sound.playHit();
    this.vibrate([40, 30, 60]);
    setTimeout(() => this.sound.playGameOver(), 150);

    this.finalScoreEl.textContent = this.score.toString();
    this.bestScoreEl.textContent = this.bestScore.toString();
    if (this.runPearlsEl) {
      this.runPearlsEl.textContent = `+${this.runPearls} 🦪`;
    }

    const medal = this.getMedalLabel(this.score);
    if (this.medalBadgeEl) {
      if (medal) {
        this.medalBadgeEl.textContent = medal;
        this.medalBadgeEl.classList.remove('hidden');
      } else {
        this.medalBadgeEl.classList.add('hidden');
      }
    }

    if (this.rankFeedbackEl) {
      this.rankFeedbackEl.classList.add('hidden');
    }

    this.updateProgressionUI();
    this.gameOverOverlay.classList.remove('hidden');
    this.submitScoreToBackend(this.score);
  }

  /** Restart directly into a new active round (skips Home/Ready screen) */
  public restartDirect(): void {
    this.resetGame();
    this.state = 'PLAYING';
    this.readyOverlay.classList.add('hidden');
    this.pauseBtn?.classList.remove('hidden');
    this.swim();
  }

  /** Reset game to Home / Ready to Dive screen */
  public resetGame(): void {
    if (this.countdownTimerId !== null) {
      clearTimeout(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    this.resumeCountdown = 0;
    this.state = 'READY';
    this.score = 0;
    this.shakeTimer = 0;
    this.initEntities();
    this.pauseBtn?.classList.add('hidden');
    this.pauseOverlay?.classList.add('hidden');
    this.readyOverlay.classList.remove('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.updateProgressionUI();
    this.fetchLeaderboard();
  }

  /** Render loop */
  private draw(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    if (this.shakeTimer > 0) {
      const amp = Math.min(8, 2 + (this.shakeTimer / 150) * 6);
      const dx = (Math.random() - 0.5) * amp;
      const dy = (Math.random() - 0.5) * amp;
      ctx.translate(dx, dy);
    }

    // 1. Dynamic Depth Zone Ocean Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
    if (this.currentZone === 'ABYSS') {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.4, '#090d24');
      bgGrad.addColorStop(1, '#020617');
    } else if (this.currentZone === 'TWILIGHT') {
      bgGrad.addColorStop(0, '#0369a1');
      bgGrad.addColorStop(0.35, '#1e3a8a');
      bgGrad.addColorStop(1, '#090e26');
    } else {
      bgGrad.addColorStop(0, '#0277bd');
      bgGrad.addColorStop(0.3, '#01579b');
      bgGrad.addColorStop(0.7, '#002f6c');
      bgGrad.addColorStop(1, '#001433');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

    // 2. God rays & parallax ocean silhouettes
    this.drawGodRays();
    this.drawParallaxSilhouettes();

    // 3. Wavy water surface highlights
    this.drawSurfaceWaves();

    // 4. Ambient bubbles
    this.drawBubbles();

    // 5. Pipes
    this.drawPipes();

    // 6. Collectibles (Pearls & Power-Ups)
    this.drawCollectibles();

    // 7. Swim bubbles
    this.drawSwimParticles();

    // 8. Player (with blink during shield invulnerability)
    if (this.invulnTimer === 0 || Math.floor(this.invulnTimer / 5) % 2 === 0) {
      this.drawFish();
    }

    // 9. Seabed & seaweed foreground
    this.drawSeabed();

    // 10. Floating combo / pickup texts
    this.drawFloatingTexts();

    // 11. In-game score display
    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      this.drawScoreHeader();
    }

    ctx.restore();
  }

  /** Draw soft sunlit rays filtering from top surface */
  private drawGodRays(): void {
    if (this.currentZone === 'ABYSS') return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.currentZone === 'TWILIGHT' ? 'rgba(56, 189, 248, 0.04)' : 'rgba(255, 255, 255, 0.06)';
    for (let i = 0; i < 3; i++) {
      const shift = Math.sin(this.frameCount * 0.01 + i) * 18;
      const startX = 50 + i * 130 + shift;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + 45, 0);
      ctx.lineTo(startX + 120, this.logicalHeight);
      ctx.lineTo(startX + 20, this.logicalHeight);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Draw distant background coral, shipwreck, and fish schools */
  private drawParallaxSilhouettes(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.currentZone === 'ABYSS' ? 'rgba(15, 23, 42, 0.55)' : 'rgba(2, 22, 49, 0.42)';

    for (const s of this.silhouettes) {
      if (s.kind === 'CORAL') {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(s.x + 12, s.y - s.height, s.x + 25, s.y - s.height * 0.6);
        ctx.quadraticCurveTo(s.x + 42, s.y - s.height * 1.1, s.x + s.width, s.y);
        ctx.closePath();
        ctx.fill();
      } else if (s.kind === 'SHIP') {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + 15, s.y - 26);
        ctx.lineTo(s.x + 48, s.y - 26);
        ctx.lineTo(s.x + 52, s.y - s.height);
        ctx.lineTo(s.x + 58, s.y - s.height);
        ctx.lineTo(s.x + 62, s.y - 26);
        ctx.lineTo(s.x + s.width, s.y - 32);
        ctx.lineTo(s.x + s.width - 12, s.y);
        ctx.closePath();
        ctx.fill();
      } else {
        // Tiny background fish school
        for (let f = 0; f < 3; f++) {
          const fx = s.x + f * 16;
          const fy = s.y + (f % 2 === 0 ? 0 : 9);
          ctx.beginPath();
          ctx.ellipse(fx, fy, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  /** Draw decorative ocean surface ripples */
  private drawSurfaceWaves(): void {
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

      ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha * 1.8})`;
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Draw Pearls and Power-Ups */
  private drawCollectibles(): void {
    const ctx = this.ctx;
    for (const c of this.collectibles) {
      const bobY = c.y + Math.sin(c.phase) * 4;
      ctx.save();

      if (c.type === 'PEARL') {
        // Golden Pearl with glow
        const grad = ctx.createRadialGradient(c.x - 3, bobY - 3, 2, c.x, bobY, c.radius);
        grad.addColorStop(0, '#fef9c3');
        grad.addColorStop(0.5, '#facc15');
        grad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c.x, bobY, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Power-Up Bubble
        const colorMap: Record<string, string> = {
          SHIELD: '#38bdf8',
          SLOWMO: '#a78bfa',
          MAGNET: '#f472b6'
        };
        const iconMap: Record<string, string> = {
          SHIELD: '🫧',
          SLOWMO: '⏱️',
          MAGNET: '🧲'
        };
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.strokeStyle = colorMap[c.type] || '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(c.x, bobY, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(iconMap[c.type] || '✨', c.x, bobY + 1);
      }

      ctx.restore();
    }
  }

  /** Draw swim bubble particles */
  private drawSwimParticles(): void {
    const ctx = this.ctx;
    for (const p of this.swimParticles) {
      ctx.save();
      ctx.fillStyle = p.color || `rgba(180, 230, 255, ${p.alpha})`;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Draw Obstacle Pipes */
  private drawPipes(): void {
    const ctx = this.ctx;
    const lipHeight = 24;
    const lipExtend = 5;

    for (const p of this.pipes) {
      const topGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
      topGrad.addColorStop(0, '#c5cbd3');
      topGrad.addColorStop(0.35, '#eef2f7');
      topGrad.addColorStop(0.8, '#8b96a5');
      topGrad.addColorStop(1, '#616c7a');

      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x, 0, p.width, p.topHeight - lipHeight);
      ctx.strokeStyle = '#39424e';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, 0, p.width, p.topHeight - lipHeight);

      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x - lipExtend, p.topHeight - lipHeight, p.width + lipExtend * 2, lipHeight);
      ctx.strokeRect(p.x - lipExtend, p.topHeight - lipHeight, p.width + lipExtend * 2, lipHeight);

      this.drawPurpleTicks(p.x + 4, 10, p.topHeight - lipHeight - 10, true);

      const bottomHeight = this.logicalHeight - p.bottomY;
      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x - lipExtend, p.bottomY, p.width + lipExtend * 2, lipHeight);
      ctx.strokeRect(p.x - lipExtend, p.bottomY, p.width + lipExtend * 2, lipHeight);

      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x, p.bottomY + lipHeight, p.width, bottomHeight - lipHeight);
      ctx.strokeRect(p.x, p.bottomY + lipHeight, p.width, bottomHeight - lipHeight);

      this.drawPurpleTicks(p.x + 4, p.bottomY + lipHeight + 6, bottomHeight - lipHeight - 12, false);
    }
  }

  /** Draw purple measurement tick markings */
  private drawPurpleTicks(x: number, startY: number, length: number, _isTop: boolean): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.currentZone === 'ABYSS' ? '#f0abfc' : '#d946ef';
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

  /** Draw Player Swimmer Creature + Active Shield Aura */
  private drawFish(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.fish.x, this.fish.y);

    // Draw protective Bubble Shield ring if active
    if (this.hasShield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(this.frameCount * 0.15) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.rotate(this.fish.rotation);

    if (this.currentSkin === 'SUBMARINE') {
      this.drawSubmarineSkin(ctx);
    } else if (this.currentSkin === 'SHARK') {
      this.drawSharkSkin(ctx);
    } else if (this.currentSkin === 'ANGLER') {
      this.drawAnglerSkin(ctx);
    } else {
      this.drawMantaSkin(ctx);
    }

    ctx.restore();
  }

  private drawMantaSkin(ctx: CanvasRenderingContext2D): void {
    const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 18);
    bodyGrad.addColorStop(0, '#475569');
    bodyGrad.addColorStop(0.5, '#1e293b');
    bodyGrad.addColorStop(1, '#0f172a');

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

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();

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

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(9.5, -4, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9, -5.2, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSubmarineSkin(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-18, 0);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    const propH = Math.sin(this.frameCount * 0.4) * 10;
    ctx.ellipse(0, 0, 3, Math.max(2, Math.abs(propH)), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-2, -18, 6, 8);
    ctx.fillRect(0, -20, 7, 4);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(6, -18, 2, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(5, -1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(4, -2.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSharkSkin(ctx: CanvasRenderingContext2D): void {
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

    const sharkGrad = ctx.createLinearGradient(0, -12, 0, 12);
    sharkGrad.addColorStop(0, '#0284c7');
    sharkGrad.addColorStop(0.5, '#0369a1');
    sharkGrad.addColorStop(0.7, '#e2e8f0');
    sharkGrad.addColorStop(1, '#f8fafc');

    ctx.fillStyle = sharkGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = 1.2;
    for (let gx = -4; gx <= 2; gx += 3) {
      ctx.beginPath();
      ctx.arc(gx, 0, 4, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
    }

    ctx.fillStyle = '#082f49';
    ctx.beginPath();
    ctx.arc(10, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(9.5, -4.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Deep-Sea Anglerfish Skin (Unlockable) with Glowing Lantern Lure */
  private drawAnglerSkin(ctx: CanvasRenderingContext2D): void {
    // Glowing Lantern Stalk
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, -11);
    ctx.quadraticCurveTo(18, -22, 23, -10);
    ctx.stroke();

    // Bioluminescent Glow Halo
    const glow = ctx.createRadialGradient(23, -10, 2, 23, -10, 15);
    glow.addColorStop(0, 'rgba(103, 232, 249, 0.95)');
    glow.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(23, -10, 15, 0, Math.PI * 2);
    ctx.fill();

    // Lure bulb
    ctx.fillStyle = '#cffafe';
    ctx.beginPath();
    ctx.arc(23, -10, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Tail fin
    ctx.save();
    ctx.translate(-15, 0);
    ctx.rotate(this.fish.finAngle);
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-11, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-11, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body
    const anglerGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
    anglerGrad.addColorStop(0, '#7e22ce');
    anglerGrad.addColorStop(0.6, '#4c1d95');
    anglerGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = anglerGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(7, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(8, -4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Draw ocean floor & animated seaweed */
  private drawSeabed(): void {
    const ctx = this.ctx;
    const floorY = this.logicalHeight - 65;

    ctx.fillStyle = '#091526';
    ctx.fillRect(0, floorY, this.logicalWidth, 65);

    ctx.fillStyle = this.currentZone === 'ABYSS' ? '#312e81' : '#1e3a5f';
    ctx.fillRect(0, floorY, this.logicalWidth, 6);

    ctx.fillStyle = this.currentZone === 'ABYSS' ? '#065f46' : '#064e3b';
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

  /** Draw floating combo & pickup text */
  private drawFloatingTexts(): void {
    const ctx = this.ctx;
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = '800 15px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  /** Draw in-game score at top center */
  private drawScoreHeader(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '900 42px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(this.score.toString(), this.logicalWidth / 2, 58);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.score.toString(), this.logicalWidth / 2, 58);
    ctx.restore();
  }

  /** Main RAF Loop (normalized to 60 FPS for 60Hz/90Hz/120Hz consistency) */
  private loop(time: number): void {
    if (!this.lastTime) this.lastTime = time;
    const rawDt = (time - this.lastTime) / 16.6667;
    this.lastTime = time;
    const dt = Math.min(Math.max(rawDt, 0.25), 2.0);

    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Save local offline score fallback (1 best score per player, Top 10) */
  private saveLocalLeaderboard(name: string, score: number): ScoreRecord[] {
    let records: ScoreRecord[] = [];
    try {
      const raw = localStorage.getItem('flappy_local_leaderboard');
      if (raw) records = JSON.parse(raw);
    } catch {
      records = [];
    }
    const key = name.trim().toLowerCase();
    const existingIdx = records.findIndex((r) => r.name.trim().toLowerCase() === key);
    if (existingIdx !== -1) {
      if (score > records[existingIdx].score) {
        records[existingIdx] = {
          name,
          score,
          skin: this.currentSkin,
          date: new Date().toISOString().slice(0, 10)
        };
      }
    } else {
      records.push({
        name,
        score,
        skin: this.currentSkin,
        date: new Date().toISOString().slice(0, 10)
      });
    }
    records.sort((a, b) => b.score - a.score);
    records = records.slice(0, 10);
    localStorage.setItem('flappy_local_leaderboard', JSON.stringify(records));
    return records;
  }

  /** Submit score to Python Backend using saved diver name */
  private async submitScoreToBackend(score: number): Promise<void> {
    const playerName = localStorage.getItem('flappy_player_name')?.trim() || this.playerName || 'Player';
    this.saveLocalLeaderboard(playerName, score);

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, score, skin: this.currentSkin })
      });
      if (res.ok) {
        const data = await res.json();
        if (this.rankFeedbackEl) {
          if (data.is_new_record && data.rank) {
            this.rankFeedbackEl.textContent = `🏅 New Record! Ranked #${data.rank} on Hall of Fame!`;
            this.rankFeedbackEl.style.color = '#34d399';
            this.rankFeedbackEl.classList.remove('hidden');
          } else if (score > 0) {
            this.rankFeedbackEl.textContent = 'No New Rank (Best Score Unbeaten)';
            this.rankFeedbackEl.style.color = '#94a3b8';
            this.rankFeedbackEl.classList.remove('hidden');
          }
        }
      }
      this.fetchLeaderboard();
    } catch {
      this.fetchLeaderboard();
    }
  }

  /** Fetch top scores from Python Backend (falls back to localStorage offline) */
  public async fetchLeaderboard(): Promise<void> {
    if (!this.leaderboardList) return;
    try {
      const res = await fetch(`/api/scores?limit=10&period=${this.leaderboardPeriod}`);
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      if (data.success && Array.isArray(data.scores)) {
        this.renderLeaderboard(data.scores);
        return;
      }
    } catch {
      try {
        const raw = localStorage.getItem('flappy_local_leaderboard');
        const localRecords: ScoreRecord[] = raw ? JSON.parse(raw) : [];
        this.renderLeaderboard(localRecords);
      } catch {
        this.renderLeaderboard([]);
      }
    }
  }

  /** Render top 10 leaderboard list with creature skin icon */
  private renderLeaderboard(records: ScoreRecord[]): void {
    if (!this.leaderboardList) return;
    this.leaderboardList.innerHTML = '';
    if (records.length === 0) {
      this.leaderboardList.innerHTML = '<li class="loading-item">No scores yet for this period!</li>';
      return;
    }
    records.slice(0, 10).forEach((rec, idx) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';
      const skinEmoji = SKIN_ICONS[rec.skin || 'MANTA'] || '🐟';
      li.innerHTML = `
        <span class="rank">#${idx + 1}</span>
        <span class="player-skin">${skinEmoji}</span>
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

window.addEventListener('DOMContentLoaded', () => {
  new FlappyGame('gameCanvas');
});
