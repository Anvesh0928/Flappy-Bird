/**
 * Centralized Frontend AdManager
 * - Delegates to native Android AdMob SDK (via window.AndroidAds) inside the APK.
 * - Uses a clearly labelled simulated test-ad UI when running in a standard web browser.
 */

export const USE_TEST_ADS = true;

interface AndroidAdsBridge {
  isTestAdsMode(): boolean;
  setGameplayActive(active: boolean): void;
  onGameOver(): void;
  isRewardedReady(): boolean;
  showRewardedRevive(): void;
}

declare global {
  interface Window {
    AndroidAds?: AndroidAdsBridge;
    __adManager?: AdManager;
  }
}

export class AdManager {
  private readonly interstitialEveryN = 3;
  private readonly interstitialMinGapMs = 50_000;

  private gameOverCount = 0;
  private lastInterstitialAt = 0;
  private pendingInterstitialResolve: (() => void) | null = null;
  private pendingReviveResolve: ((rewarded: boolean) => void) | null = null;

  // Browser simulator DOM elements
  private simBannerEl: HTMLElement | null;
  private simModalEl: HTMLElement | null;
  private simTitleEl: HTMLElement | null;
  private simBodyEl: HTMLElement | null;
  private simPrimaryBtn: HTMLButtonElement | null;
  private simCloseBtn: HTMLButtonElement | null;
  private simCountdownTimer: number | null = null;

  constructor() {
    window.__adManager = this;

    this.simBannerEl = document.getElementById('testAdBanner');
    this.simModalEl = document.getElementById('simAdModal');
    this.simTitleEl = document.getElementById('simAdTitle');
    this.simBodyEl = document.getElementById('simAdBody');
    this.simPrimaryBtn = document.getElementById('simAdCompleteBtn') as HTMLButtonElement | null;
    this.simCloseBtn = document.getElementById('simAdCloseBtn') as HTMLButtonElement | null;

    if (this.isNativeAndroid()) {
      // Native Android renders its own real Adaptive Banner outside the WebView.
      this.simBannerEl?.classList.add('hidden');
    } else {
      this.simBannerEl?.classList.remove('hidden');
    }
  }

  public isNativeAndroid(): boolean {
    return Boolean(window.AndroidAds);
  }

  /** Keep banner in non-overlapping safe bar; block clicks during active flight. */
  public setGameplayActive(active: boolean): void {
    if (this.isNativeAndroid()) {
      window.AndroidAds!.setGameplayActive(active);
      return;
    }
    if (this.simBannerEl) {
      this.simBannerEl.classList.toggle('gameplay-safe', active);
    }
  }

  public isReviveAvailable(): boolean {
    if (this.isNativeAndroid()) {
      return window.AndroidAds!.isRewardedReady();
    }
    return true;
  }

  /** Called when a run ends; shows frequency-capped Interstitial if eligible. */
  public handleGameOver(): Promise<void> {
    if (this.isNativeAndroid()) {
      return new Promise((resolve) => {
        this.pendingInterstitialResolve = resolve;
        window.AndroidAds!.onGameOver();
      });
    }

    this.gameOverCount++;
    const now = Date.now();
    const cooldownOk = this.lastInterstitialAt === 0 || (now - this.lastInterstitialAt) >= this.interstitialMinGapMs;
    const freqOk = this.gameOverCount % this.interstitialEveryN === 0;

    if (!freqOk || !cooldownOk || !this.simModalEl) {
      return Promise.resolve();
    }

    this.lastInterstitialAt = now;
    return this.openBrowserInterstitial();
  }

  /** Launch Rewarded Ad for Revive; resolves true ONLY if reward callback confirms completion. */
  public showRewardedForRevive(): Promise<boolean> {
    if (this.pendingReviveResolve) {
      return Promise.resolve(false);
    }

    if (this.isNativeAndroid()) {
      return new Promise((resolve) => {
        this.pendingReviveResolve = resolve;
        window.AndroidAds!.showRewardedRevive();
      });
    }

    return this.openBrowserRewarded();
  }

  /** Native callback invoked by AndroidAdsBridge when Interstitial finishes/skips. */
  public onNativeInterstitialDone(): void {
    const resolve = this.pendingInterstitialResolve;
    this.pendingInterstitialResolve = null;
    if (resolve) resolve();
  }

  /** Native callback invoked by AndroidAdsBridge with strict reward verification result. */
  public onNativeReviveResult(rewarded: boolean): void {
    const resolve = this.pendingReviveResolve;
    this.pendingReviveResolve = null;
    if (resolve) resolve(Boolean(rewarded));
  }

  private openBrowserInterstitial(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.simModalEl || !this.simTitleEl || !this.simBodyEl || !this.simPrimaryBtn || !this.simCloseBtn) {
        resolve();
        return;
      }

      this.clearSimTimer();
      this.simTitleEl.textContent = 'TEST AD SIMULATOR · Interstitial';
      this.simBodyEl.textContent = 'Simulated Interstitial Ad (Browser Mode Only). Ready in 2s...';
      this.simPrimaryBtn.classList.add('hidden');
      this.simCloseBtn.disabled = true;
      this.simCloseBtn.textContent = 'Wait (2s)...';
      this.simModalEl.classList.remove('hidden');

      let left = 2;
      this.simCountdownTimer = window.setInterval(() => {
        left--;
        if (left > 0 && this.simCloseBtn) {
          this.simCloseBtn.textContent = `Wait (${left}s)...`;
        } else {
          this.clearSimTimer();
          if (this.simCloseBtn) {
            this.simCloseBtn.disabled = false;
            this.simCloseBtn.textContent = 'Close Ad';
          }
          if (this.simBodyEl) {
            this.simBodyEl.textContent = 'Simulated Interstitial complete. You may close now.';
          }
        }
      }, 1000);

      const onClose = () => {
        this.clearSimTimer();
        this.simCloseBtn?.removeEventListener('click', onClose);
        this.simModalEl?.classList.add('hidden');
        resolve();
      };
      this.simCloseBtn.addEventListener('click', onClose);
    });
  }

  private openBrowserRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.simModalEl || !this.simTitleEl || !this.simBodyEl || !this.simPrimaryBtn || !this.simCloseBtn) {
        resolve(false);
        return;
      }

      this.clearSimTimer();
      this.simTitleEl.textContent = 'TEST AD SIMULATOR · Rewarded Ad';
      this.simBodyEl.textContent = 'Watch full test ad to earn 1 Revive with 2.5s Bubble Shield, or close early to test no-reward.';
      this.simPrimaryBtn.classList.remove('hidden');
      this.simPrimaryBtn.disabled = false;
      this.simPrimaryBtn.textContent = '✅ Complete Ad (Earn Revive)';
      this.simCloseBtn.disabled = false;
      this.simCloseBtn.textContent = '✖ Close Early (No Reward)';
      this.simModalEl.classList.remove('hidden');

      let settled = false;
      const cleanup = (granted: boolean) => {
        if (settled) return;
        settled = true;
        this.clearSimTimer();
        this.simPrimaryBtn?.removeEventListener('click', onEarn);
        this.simCloseBtn?.removeEventListener('click', onEarlyClose);
        this.simModalEl?.classList.add('hidden');
        resolve(granted);
      };

      const onEarn = () => cleanup(true);
      const onEarlyClose = () => cleanup(false);

      this.simPrimaryBtn.addEventListener('click', onEarn);
      this.simCloseBtn.addEventListener('click', onEarlyClose);
    });
  }

  private clearSimTimer(): void {
    if (this.simCountdownTimer !== null) {
      clearInterval(this.simCountdownTimer);
      this.simCountdownTimer = null;
    }
  }
}

