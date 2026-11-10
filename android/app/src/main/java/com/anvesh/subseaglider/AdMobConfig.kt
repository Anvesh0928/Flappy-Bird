package com.anvesh.subseaglider

/**
 * Centralized AdMob configuration.
 * Keep USE_TEST_ADS = true until ready for explicit production activation.
 */
object AdMobConfig {
    const val USE_TEST_ADS: Boolean = true

    const val ADMOB_APP_ID = "ca-app-pub-9534864038217573~3582604399"

    // Google Official Android Test Ad Unit IDs
    private const val TEST_BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/9214589741"
    private const val TEST_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"
    private const val TEST_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917"

    // Publisher Production Ad Unit IDs (never used while USE_TEST_ADS is true)
    private const val PROD_BANNER_AD_UNIT_ID = "ca-app-pub-9534864038217573/2580688925"
    private const val PROD_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-9534864038217573/4576269078"
    private const val PROD_REWARDED_AD_UNIT_ID = "ca-app-pub-9534864038217573/4357947206"

    // Frequency capping for Interstitial Ads
    const val INTERSTITIAL_EVERY_N_GAME_OVERS = 3
    const val INTERSTITIAL_MIN_INTERVAL_MS = 50_000L

    fun bannerUnitId(): String =
        if (USE_TEST_ADS) TEST_BANNER_AD_UNIT_ID else PROD_BANNER_AD_UNIT_ID

    fun interstitialUnitId(): String =
        if (USE_TEST_ADS) TEST_INTERSTITIAL_AD_UNIT_ID else PROD_INTERSTITIAL_AD_UNIT_ID

    fun rewardedUnitId(): String =
        if (USE_TEST_ADS) TEST_REWARDED_AD_UNIT_ID else PROD_REWARDED_AD_UNIT_ID
}

