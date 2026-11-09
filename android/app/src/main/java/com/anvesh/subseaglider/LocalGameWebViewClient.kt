package com.anvesh.subseaglider

import android.content.Intent
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

/**
 * Serves bundled game files over the appassets HTTPS origin.
 * Only that local origin is allowed to navigate inside the WebView.
 */
class LocalGameWebViewClient(
    private val assetLoader: WebViewAssetLoader
) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

    override fun shouldOverrideUrlLoading(
        view: WebView,
        request: WebResourceRequest
    ): Boolean {
        val uri = request.url
        if (uri.scheme == "https" && uri.host == ASSET_HOST) return false

        if (uri.scheme == "https" || uri.scheme == "http") {
            view.context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri.toString())))
        }
        return true
    }

    private companion object {
        const val ASSET_HOST = "appassets.androidplatform.net"
    }
}
