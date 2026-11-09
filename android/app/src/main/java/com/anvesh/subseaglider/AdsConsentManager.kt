package com.anvesh.subseaglider

import android.app.Activity
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

/**
 * Keeps UMP consent handling in one place so the Activity does not need to
 * know the consent SDK's request and form lifecycle.
 */
class AdsConsentManager(private val activity: Activity) {

    private val consentInformation =
        UserMessagingPlatform.getConsentInformation(activity)

    fun gatherConsent(onComplete: (canRequestAds: Boolean) -> Unit) {
        val requestParameters = ConsentRequestParameters.Builder().build()

        consentInformation.requestConsentInfoUpdate(
            activity,
            requestParameters,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) {
                    onComplete(consentInformation.canRequestAds())
                }
            },
            {
                // A previously stored valid decision may still allow ads offline.
                onComplete(consentInformation.canRequestAds())
            }
        )
    }

    fun isPrivacyOptionsRequired(): Boolean =
        consentInformation.privacyOptionsRequirementStatus ==
            ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED

    fun showPrivacyOptions(onDismissed: () -> Unit) {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) {
            onDismissed()
        }
    }
}
