package com.anvesh.subseaglider

import android.app.Activity
import android.os.Bundle
import android.view.View
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.TextView
import androidx.webkit.WebViewAssetLoader
import com.google.android.libraries.ads.mobile.sdk.MobileAds
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig

/**
 * Hosts the existing HTML5 game locally. Native Android responsibilities
 * (consent, ads, and lifecycle) stay outside the web game.
 */
class MainActivity : Activity() {

    private lateinit var gameWebView: WebView
    private lateinit var bannerAdController: BannerAdController
    private lateinit var consentManager: AdsConsentManager
    private lateinit var privacyOptionsButton: TextView
    private var adsInitializationStarted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        gameWebView = findViewById(R.id.gameWebView)
        val bannerContainer = findViewById<FrameLayout>(R.id.bannerAdContainer)
        privacyOptionsButton = findViewById(R.id.privacyOptionsButton)

        bannerAdController = BannerAdController(this, bannerContainer)
        consentManager = AdsConsentManager(this)

        configureGameWebView()
        gameWebView.loadUrl(GAME_URL)
        configurePrivacyOptions()
        collectConsentAndPrepareAds()
    }

    private fun configureGameWebView() {
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        gameWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }

        gameWebView.webViewClient = LocalGameWebViewClient(assetLoader)
        gameWebView.setBackgroundColor(android.graphics.Color.rgb(7, 19, 33))
    }

    private fun configurePrivacyOptions() {
        privacyOptionsButton.setOnClickListener {
            consentManager.showPrivacyOptions {
                updatePrivacyOptionsVisibility()
            }
        }
    }

    private fun collectConsentAndPrepareAds() {
        consentManager.gatherConsent { canRequestAds ->
            runOnUiThread {
                if (isFinishing || isDestroyed) return@runOnUiThread
                updatePrivacyOptionsVisibility()
                if (canRequestAds) initializeAds()
            }
        }
    }

    private fun updatePrivacyOptionsVisibility() {
        privacyOptionsButton.visibility =
            if (consentManager.isPrivacyOptionsRequired()) View.VISIBLE else View.GONE
    }

    private fun initializeAds() {
        if (adsInitializationStarted) return
        adsInitializationStarted = true

        // Google requires GMA Next-Gen initialization on a background thread.
        Thread {
            MobileAds.initialize(
                this,
                InitializationConfig.Builder(BuildConfig.ADMOB_APP_ID).build()
            ) {
                runOnUiThread {
                    if (!isFinishing && !isDestroyed) bannerAdController.load()
                }
            }
        }.start()
    }

    override fun onPause() {
        gameWebView.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        gameWebView.onResume()
    }

    @Deprecated("Use the Android back dispatcher in a future Activity migration.")
    override fun onBackPressed() {
        if (::gameWebView.isInitialized && gameWebView.canGoBack()) {
            gameWebView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (::bannerAdController.isInitialized) bannerAdController.destroy()
        if (::gameWebView.isInitialized) {
            gameWebView.stopLoading()
            gameWebView.destroy()
        }
        super.onDestroy()
    }

    private companion object {
        const val GAME_URL =
            "https://appassets.androidplatform.net/assets/game/index.html"
    }
}
