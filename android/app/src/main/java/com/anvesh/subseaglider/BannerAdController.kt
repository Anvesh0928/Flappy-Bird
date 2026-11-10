package com.anvesh.subseaglider

import android.app.Activity
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.google.android.libraries.ads.mobile.sdk.banner.AdSize
import com.google.android.libraries.ads.mobile.sdk.banner.AdView
import com.google.android.libraries.ads.mobile.sdk.banner.BannerAd
import com.google.android.libraries.ads.mobile.sdk.banner.BannerAdRequest
import com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback
import com.google.android.libraries.ads.mobile.sdk.common.LoadAdError

/**
 * Owns the native adaptive banner view and its cleanup.
 * Uses AdMobConfig.bannerUnitId() so test mode is strictly enforced during development.
 */
class BannerAdController(
    private val activity: Activity,
    private val container: FrameLayout
) {
    private var adView: AdView? = null

    fun load() {
        if (adView != null) return

        val screenWidthDp = (
            activity.resources.displayMetrics.widthPixels /
                activity.resources.displayMetrics.density
            ).toInt()

        val adSize = AdSize.getLargeAnchoredAdaptiveBannerAdSize(
            activity,
            screenWidthDp
        )
        val view = AdView(activity)
        adView = view

        container.addView(
            view,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            )
        )

        val request = BannerAdRequest.Builder(
            AdMobConfig.bannerUnitId(),
            adSize
        ).build()

        view.loadAd(request, object : AdLoadCallback<BannerAd> {
            override fun onAdLoaded(ad: BannerAd) {
                Log.d(TAG, "Banner loaded (testMode=${AdMobConfig.USE_TEST_ADS}).")
            }

            override fun onAdFailedToLoad(adError: LoadAdError) {
                Log.w(TAG, "Banner failed to load: $adError")
                container.removeView(view)
                view.destroy()
                if (adView === view) adView = null
            }
        })
    }

    /**
     * Hides the banner visually & blocks touches during active flight without
     * collapsing container height so the WebView canvas never resizes mid-run.
     */
    fun setVisible(visible: Boolean) {
        container.visibility = if (visible) View.VISIBLE else View.INVISIBLE
        adView?.isEnabled = visible
    }

    fun destroy() {
        adView?.let { view ->
            container.removeView(view)
            view.destroy()
        }
        adView = null
    }

    private companion object {
        const val TAG = "BannerAdController"
    }
}
