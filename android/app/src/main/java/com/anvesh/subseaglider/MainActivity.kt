package com.anvesh.subseaglider

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.View
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.TextView
import androidx.webkit.WebViewAssetLoader

/**
 * Hosts the existing HTML5 game locally. Native Android responsibilities
 * (consent, ads, and lifecycle) stay outside the web game.
 */
class MainActivity : Activity() {

    private lateinit var gameWebView: WebView
    private lateinit var adManager: NativeAdManager
    private lateinit var consentManager: AdsConsentManager
    private lateinit var privacyOptionsButton: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        gameWebView = findViewById(R.id.gameWebView)
        val bannerContainer = findViewById<FrameLayout>(R.id.bannerAdContainer)
        privacyOptionsButton = findViewById(R.id.privacyOptionsButton)

        adManager = NativeAdManager(this, bannerContainer, gameWebView)
        consentManager = AdsConsentManager(this)

        configureGameWebView()
        gameWebView.loadUrl(GAME_URL)
        configurePrivacyOptions()
        collectConsentAndPrepareAds()
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
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

        // Only local bundled assets from appassets.androidplatform.net are loaded here.
        gameWebView.addJavascriptInterface(adManager.jsBridge, "AndroidAds")
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
                if (canRequestAds) {
                    adManager.initializeAndLoadAds()
                }
            }
        }
    }

    private fun updatePrivacyOptionsVisibility() {
        privacyOptionsButton.visibility =
            if (consentManager.isPrivacyOptionsRequired()) View.VISIBLE else View.GONE
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
        if (::adManager.isInitialized) adManager.destroy()
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
