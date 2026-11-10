package com.anvesh.subseaglider

import android.app.Activity
import android.os.SystemClock
import android.util.Log
import com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback
import com.google.android.libraries.ads.mobile.sdk.common.AdRequest
import com.google.android.libraries.ads.mobile.sdk.common.FullScreenContentError
import com.google.android.libraries.ads.mobile.sdk.common.LoadAdError
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAd
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAdEventCallback

/**
 * Manages preloading and frequency-capped presentation of Interstitial Ads.
 * Only shows on every 3rd Game Over and at least 50s after the previous interstitial.
 */
class InterstitialAdController(private val activity: Activity) {

    private var interstitialAd: InterstitialAd? = null
    private var isLoading = false
    private var gameOverCount = 0
    private var lastShownElapsedMs = 0L

    fun preload() {
        if (interstitialAd != null || isLoading) return
        if (activity.isFinishing || activity.isDestroyed) return

        isLoading = true
        val request = AdRequest.Builder(AdMobConfig.interstitialUnitId()).build()

        InterstitialAd.load(
            request,
            object : AdLoadCallback<InterstitialAd> {
                override fun onAdLoaded(ad: InterstitialAd) {
                    isLoading = false
                    interstitialAd = ad
                    Log.d(TAG, "Interstitial preloaded (testMode=${AdMobConfig.USE_TEST_ADS}).")
                }

                override fun onAdFailedToLoad(adError: LoadAdError) {
                    isLoading = false
                    interstitialAd = null
                    Log.w(TAG, "Interstitial failed to load: $adError")
                }
            }
        )
    }

    fun onGameOver(onClosed: () -> Unit) {
        gameOverCount++
        val nowMs = SystemClock.elapsedRealtime()
        val cooldownPassed = lastShownElapsedMs == 0L ||
            (nowMs - lastShownElapsedMs) >= AdMobConfig.INTERSTITIAL_MIN_INTERVAL_MS
        val frequencyMet = gameOverCount % AdMobConfig.INTERSTITIAL_EVERY_N_GAME_OVERS == 0

        val ad = interstitialAd
        if (!frequencyMet || !cooldownPassed || ad == null) {
            if (ad == null) preload()
            onClosed()
            return
        }

        interstitialAd = null
        var finished = false
        val notifyOnce = {
            if (!finished) {
                finished = true
                onClosed()
            }
        }

        ad.adEventCallback = object : InterstitialAdEventCallback {
            override fun onAdShowedFullScreenContent() {
                lastShownElapsedMs = SystemClock.elapsedRealtime()
            }

            override fun onAdDismissedFullScreenContent() {
                preload()
                notifyOnce()
            }

            override fun onAdFailedToShowFullScreenContent(adError: FullScreenContentError) {
                Log.w(TAG, "Interstitial failed to show: $adError")
                preload()
                notifyOnce()
            }
        }

        ad.show(activity)
    }

    fun destroy() {
        interstitialAd = null
    }

    private companion object {
        const val TAG = "InterstitialController"
    }
}

