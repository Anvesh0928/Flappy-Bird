# Android app

This module wraps the existing HTML5 game in a small native Kotlin application.

## Project boundaries

- `frontend/src` remains the source of truth for game behavior.
- `frontend/public` contains the browser-ready files packaged into the app.
- `android/app` contains Android-specific code: WebView hosting, lifecycle, consent, and ads.
- `backend` remains an optional remote service. The game remains playable offline with local score storage.

The Android build copies `frontend/public` into generated assets automatically. Do not edit files under `app/build/generated`.

## Build

Requirements: Android SDK 36, JDK 17, and Gradle 8.13.

From this directory:

```bash
gradle :app:assembleDebug
```

Open the `android/` directory in Android Studio to sync and run on an emulator or device.

## AdMob configuration

The app uses Google's official sample app ID and Android banner test unit by default. Never test with live ad units.

For local builds, provide publisher IDs only after registering the app in AdMob:

```bash
gradle :app:assembleDebug \
  -PADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY \
  -PADMOB_BANNER_AD_UNIT_ID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
```

Do not commit live ad IDs as secrets or replace test IDs before consent messages, privacy policy, store disclosures, and regional compliance have been reviewed. UMP consent is requested at launch; ads initialize only when UMP reports that ad requests are allowed.

## Known limitation: online leaderboard

The existing web game submits to relative `/api/scores` URLs. The standalone Android asset origin does not host the Flask backend, so those requests fail safely and the game remains playable with local storage. A production leaderboard requires a deployed HTTPS API URL and backend hardening.

A signed release bundle also requires a release keystore and publisher configuration. Never put signing credentials in source control.
