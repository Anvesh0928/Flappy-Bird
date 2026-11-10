/**
 * Centralized Frontend AdManager
 * - Delegates to native Android AdMob SDK (via window.AndroidAds) inside the APK.
 * - Uses a clearly labelled simulated test-ad UI when running in a standard web browser.
 */
export const USE_TEST_ADS = true;
export class AdManager {
    interstitialEveryN = 3;
    interstitialMinGapMs = 50_000;
    gameOverCount = 0;
    lastInterstitialAt = 0;
    pendingInterstitialResolve = null;
    pendingReviveResolve = null;
    // Browser simulator DOM elements
    simBannerEl;
    simModalEl;
    simTitleEl;
    simBodyEl;
    simPrimaryBtn;
    simCloseBtn;
    simCountdownTimer = null;
    constructor() {
        window.__adManager = this;
        this.simBannerEl = document.getElementById('testAdBanner');
        this.simModalEl = document.getElementById('simAdModal');
        this.simTitleEl = document.getElementById('simAdTitle');
        this.simBodyEl = document.getElementById('simAdBody');
        this.simPrimaryBtn = document.getElementById('simAdCompleteBtn');
        this.simCloseBtn = document.getElementById('simAdCloseBtn');
        if (this.isNativeAndroid()) {
            // Native Android renders its own real Adaptive Banner outside the WebView.
            this.simBannerEl?.classList.add('hidden');
        }
        else {
            this.simBannerEl?.classList.remove('hidden');
        }
    }
    isNativeAndroid() {
        return Boolean(window.AndroidAds);
    }
    /** Keep banner in non-overlapping safe bar; block clicks during active flight. */
    setGameplayActive(active) {
        if (this.isNativeAndroid()) {
            window.AndroidAds.setGameplayActive(active);
            return;
        }
        if (this.simBannerEl) {
            this.simBannerEl.classList.toggle('gameplay-safe', active);
        }
    }
    isReviveAvailable() {
        if (this.isNativeAndroid()) {
            return window.AndroidAds.isRewardedReady();
        }
        return true;
    }
    /** Called when a run ends; shows frequency-capped Interstitial if eligible. */
    handleGameOver() {
        if (this.isNativeAndroid()) {
            return new Promise((resolve) => {
                this.pendingInterstitialResolve = resolve;
                window.AndroidAds.onGameOver();
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
    showRewardedForRevive() {
        if (this.pendingReviveResolve) {
            return Promise.resolve(false);
        }
        if (this.isNativeAndroid()) {
            return new Promise((resolve) => {
                this.pendingReviveResolve = resolve;
                window.AndroidAds.showRewardedRevive();
            });
        }
        return this.openBrowserRewarded();
    }
    /** Native callback invoked by AndroidAdsBridge when Interstitial finishes/skips. */
    onNativeInterstitialDone() {
        const resolve = this.pendingInterstitialResolve;
        this.pendingInterstitialResolve = null;
        if (resolve)
            resolve();
    }
    /** Native callback invoked by AndroidAdsBridge with strict reward verification result. */
    onNativeReviveResult(rewarded) {
        const resolve = this.pendingReviveResolve;
        this.pendingReviveResolve = null;
        if (resolve)
            resolve(Boolean(rewarded));
    }
    openBrowserInterstitial() {
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
                }
                else {
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
    openBrowserRewarded() {
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
            const cleanup = (granted) => {
                if (settled)
                    return;
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
    clearSimTimer() {
        if (this.simCountdownTimer !== null) {
            clearInterval(this.simCountdownTimer);
            this.simCountdownTimer = null;
        }
    }
}
