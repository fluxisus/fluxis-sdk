import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library")
    kotlin("android")
    `maven-publish`
}

android {
    namespace = "us.fluxis.ble.android"
    compileSdk = 35

    defaultConfig {
        // Clover PTA0010 runs Android 10; Clover Flex 4 runs Android 13. Every API above 26 is
        // behind a Build.VERSION.SDK_INT check, and lint enforces it (NewApi is fatal).
        minSdk = 26
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    lint {
        abortOnError = true
        warningsAsErrors = false
        fatal += listOf("NewApi", "InlinedApi", "MissingPermission")
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }

    publishing {
        singleVariant("release") { withSourcesJar() }
    }
}

kotlin {
    explicitApi()
    compilerOptions { jvmTarget.set(JvmTarget.JVM_11) }
}

dependencies {
    api(project(":core"))
    api("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
}

publishing {
    publications {
        create<MavenPublication>("release") {
            artifactId = "fluxis-ble-android"
            afterEvaluate { from(components["release"]) }
            pom {
                name.set("Fluxis BLE for Android")
                description.set("Fluxis BLE collector (POS GATT server) and payer (wallet central) for Android.")
                url.set("https://github.com/fluxisus/fluxis-sdk/tree/main/packages/ble/kotlin")
                licenses { license { name.set("MIT"); url.set("https://opensource.org/licenses/MIT") } }
            }
        }
    }
}
