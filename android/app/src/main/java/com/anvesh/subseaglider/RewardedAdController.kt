package com.anvesh.subseaglider

import android.app.Activity
import android.util.Log
import com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback
import com.google.android.libraries.ads.mobile.sdk.common.AdRequest
import com.google.android.libraries.ads.mobile.sdk.common.FullScreenContentError
import com.google.android.libraries.ads.mobile.sdk.common.LoadAdError
import com.google.android.libraries.ads.mobile.sdk.rewarded.OnUserEarnedRewardListener
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardItem
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAd
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAdEventCallback

/**
 * Manages preloading and strict reward verification for Revive Rewarded Ads.
 * Revive is granted ONLY when OnUserEarnedRewardListener confirms the reward.
 */
class RewardedAdController(private val activity: Activity) {

    private var rewardedAd: RewardedAd? = null
    private var isLoading = false
    private var isShowing = false

    fun preload() {
        if (rewardedAd != null || isLoading || isShowing) return
        if (activity.isFinishing || activity.isDestroyed) return

        isLoading = true
        val request = AdRequest.Builder(AdMobConfig.rewardedUnitId()).build()

        RewardedAd.load(
            request,
            object : AdLoadCallback<RewardedAd> {
                override fun onAdLoaded(ad: RewardedAd) {
                    isLoading = false
                    rewardedAd = ad
                    Log.d(TAG, "Rewarded ad preloaded (testMode=${AdMobConfig.USE_TEST_ADS}).")
                }

                override fun onAdFailedToLoad(adError: LoadAdError) {
                    isLoading = false
                    rewardedAd = null
                    Log.w(TAG, "Rewarded ad failed to load: $adError")
                }
            }
        )
    }

    fun isReady(): Boolean = rewardedAd != null && !isShowing

    fun showForRevive(onResult: (rewarded: Boolean) -> Unit) {
        if (isShowing) {
            onResult(false)
            return
        }

        val ad = rewardedAd
        if (ad == null) {
            preload()
            onResult(false)
            return
        }

        rewardedAd = null
        isShowing = true
        var rewardEarned = false
        var resultDispatched = false

        val dispatchOnce = { granted: Boolean ->
            if (!resultDispatched) {
                resultDispatched = true
                isShowing = false
                onResult(granted)
            }
        }

        ad.adEventCallback = object : RewardedAdEventCallback {
            override fun onAdDismissedFullScreenContent() {
                preload()
                dispatchOnce(rewardEarned)
            }

            override fun onAdFailedToShowFullScreenContent(adError: FullScreenContentError) {
                Log.w(TAG, "Rewarded ad failed to show: $adError")
                preload()
                dispatchOnce(false)
            }
        }

        ad.show(
            activity,
            object : OnUserEarnedRewardListener {
                override fun onUserEarnedReward(reward: RewardItem) {
                    // Prevent duplicate reward flags on multiple listener triggers
                    if (!rewardEarned) {
                        rewardEarned = true
                        Log.d(TAG, "Reward earned: ${reward.amount} ${reward.type}")
                    }
                }
            }
        )
    }

    fun destroy() {
        rewardedAd = null
        isShowing = false
    }

    private companion object {
        const val TAG = "RewardedAdController"
    }
}

