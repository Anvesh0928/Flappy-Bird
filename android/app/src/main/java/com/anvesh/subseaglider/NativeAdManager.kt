package com.anvesh.subseaglider

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.FrameLayout
import com.google.android.libraries.ads.mobile.sdk.MobileAds
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig

/**
 * Centralized coordinator for native AdMob lifecycle and WebView JS communication.
 * Requests ads only after UMP consent confirms ads are allowed.
 */
class NativeAdManager(
    private val activity: Activity,
    bannerContainer: FrameLayout,
    private val webView: WebView
) {
    private val bannerController = BannerAdController(activity, bannerContainer)
    private val interstitialController = InterstitialAdController(activity)
    private val rewardedController = RewardedAdController(activity)

    @Volatile
    private var initializationStarted = false

    @Volatile
    private var adsAllowed = false

    val jsBridge = AndroidAdsBridge()

    fun initializeAndLoadAds() {
        adsAllowed = true
        if (initializationStarted) return
        initializationStarted = true

        // GMA Next-Gen initialization runs on a background thread.
        Thread {
            MobileAds.initialize(
                activity,
                InitializationConfig.Builder(AdMobConfig.ADMOB_APP_ID).build()
            ) {
                activity.runOnUiThread {
                    if (activity.isFinishing || activity.isDestroyed) return@runOnUiThread
                    bannerController.load()
                    interstitialController.preload()
                    rewardedController.preload()
                }
            }
        }.start()
    }

    fun destroy() {
        bannerController.destroy()
        interstitialController.destroy()
        rewardedController.destroy()
    }

    private fun evaluateJs(script: String) {
        activity.runOnUiThread {
            if (!activity.isFinishing && !activity.isDestroyed) {
                webView.evaluateJavascript(script, null)
            }
        }
    }

    inner class AndroidAdsBridge {

        @JavascriptInterface
        fun isTestAdsMode(): Boolean = AdMobConfig.USE_TEST_ADS

        @JavascriptInterface
        fun setGameplayActive(active: Boolean) {
            activity.runOnUiThread {
                if (!activity.isFinishing && !activity.isDestroyed) {
                    bannerController.setVisible(!active)
                }
            }
        }

        @JavascriptInterface
        fun onGameOver() {
            activity.runOnUiThread {
                if (!adsAllowed || activity.isFinishing || activity.isDestroyed) {
                    evaluateJs("window.__adManager && window.__adManager.onNativeInterstitialDone();")
                    return@runOnUiThread
                }
                interstitialController.onGameOver {
                    evaluateJs("window.__adManager && window.__adManager.onNativeInterstitialDone();")
                }
            }
        }

        @JavascriptInterface
        fun isRewardedReady(): Boolean = adsAllowed && rewardedController.isReady()

        @JavascriptInterface
        fun showRewardedRevive() {
            activity.runOnUiThread {
                if (!adsAllowed || activity.isFinishing || activity.isDestroyed) {
                    evaluateJs("window.__adManager && window.__adManager.onNativeReviveResult(false);")
                    return@runOnUiThread
                }
                rewardedController.showForRevive { rewarded ->
                    evaluateJs("window.__adManager && window.__adManager.onNativeReviveResult($rewarded);")
                }
            }
        }
    }
}

