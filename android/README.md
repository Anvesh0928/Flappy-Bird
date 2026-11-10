# Android app

This module wraps the existing HTML5 game in a native Kotlin WebView application with Google Mobile Ads (Next-Gen SDK) and UMP consent.

## Project boundaries

- `frontend/src` remains the source of truth for game behavior and `AdManager` browser simulation.
- `frontend/public` contains the compiled browser-ready files packaged into the app.
- `android/app` contains Android-specific code: WebView hosting, UMP consent (`AdsConsentManager`), and native ads (`AdMobConfig`, `BannerAdController`, `InterstitialAdController`, `RewardedAdController`, `NativeAdManager`).
- `backend` remains an optional remote service. The game remains playable offline with local score storage.

The Android build copies `frontend/public` into generated assets automatically. Do not edit files under `app/build/generated`.

## Build

Requirements: Android SDK 36, JDK 17, and Gradle 8.13.

From this directory:

```bash
gradle :app:assembleDebug
```

Open the `android/` directory in Android Studio to sync and run on an emulator or device.

## AdMob configuration & Test Mode

- `AdMobConfig.USE_TEST_ADS` and `USE_TEST_ADS` in `frontend/src/adManager.ts` are **`true` by default**.
- While test mode is enabled, all three ad formats (Adaptive Banner, Interstitial, and Rewarded) strictly load Google's official Android test ad unit IDs. Never switch to production IDs until test verification and regional consent checks are complete.
- Banner ads render in `bannerAdContainer` below the WebView and hide during active gameplay to prevent accidental clicks.
- Interstitial ads are capped to every 3rd Game Over and at least 50 seconds apart.
- Rewarded ads (`📺 REVIVE`) allow at most 1 revive per run, granted only on `OnUserEarnedRewardListener` confirmation, restoring the player to center height with 2.5 seconds of Bubble Shield invulnerability.

## Known limitation: online leaderboard

The existing web game submits to relative `/api/scores` URLs. The standalone Android asset origin does not host the Flask backend, so those requests fail safely and the game remains playable with local storage. A production leaderboard requires a deployed HTTPS API URL and backend hardening.

A signed release bundle also requires a release keystore and publisher configuration. Never put signing credentials in source control.
