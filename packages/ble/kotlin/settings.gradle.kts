pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "fluxis-ble"

include(":core")

// The Android module needs an SDK; without one, `:core` still builds and tests on a plain JVM.
val localSdk = file("local.properties").takeIf { it.exists() }?.readText()?.contains("sdk.dir") == true
if (localSdk || System.getenv("ANDROID_HOME") != null || System.getenv("ANDROID_SDK_ROOT") != null) {
    include(":android")
} else {
    logger.warn("fluxis-ble: no Android SDK found (ANDROID_HOME / local.properties); building :core only")
}
