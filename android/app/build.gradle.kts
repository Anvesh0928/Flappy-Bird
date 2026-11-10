import org.gradle.api.tasks.Sync

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val admobAppId = providers.gradleProperty("ADMOB_APP_ID")
    .orElse("ca-app-pub-9534864038217573~3582604399")
    .get()
val bannerAdUnitId = providers.gradleProperty("ADMOB_BANNER_AD_UNIT_ID")
    .orElse("ca-app-pub-3940256099942544/9214589741")
    .get()

android {
    namespace = "com.anvesh.subseaglider"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.anvesh.subseaglider"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "ADMOB_APP_ID", "\"$admobAppId\"")
        buildConfigField("String", "ADMOB_BANNER_AD_UNIT_ID", "\"$bannerAdUnitId\"")
        manifestPlaceholders["admobAppId"] = admobAppId
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/gameAssets"))
}

val syncGameAssets by tasks.registering(Sync::class) {
    from(rootProject.layout.projectDirectory.dir("../frontend/public"))
    from(rootProject.layout.projectDirectory.dir("../frontend/assets")) {
        into("assets")
        // The level-range artwork files were uploaded without extensions; serve them as PNGs.
        eachFile {
            if (!name.contains(".")) name = "$name.png"
        }
    }
    into(layout.buildDirectory.dir("generated/gameAssets/game"))
}
tasks.named("preBuild").configure { dependsOn(syncGameAssets) }

dependencies {
    implementation("androidx.webkit:webkit:1.18.0")
    implementation("com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk:1.6.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
}
