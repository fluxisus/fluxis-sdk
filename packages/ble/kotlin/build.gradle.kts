plugins {
    id("com.android.library") version "8.7.3" apply false
    kotlin("jvm") version "2.1.0" apply false
    kotlin("android") version "2.1.0" apply false
}

val sdkVersion = file("version.txt").readText().trim()

subprojects {
    group = "us.fluxis"
    version = sdkVersion

    plugins.withId("maven-publish") {
        extensions.configure<PublishingExtension> {
            repositories {
                maven {
                    name = "GitHubPackages"
                    url = uri("https://maven.pkg.github.com/fluxisus/fluxis-sdk")
                    credentials {
                        username = System.getenv("GITHUB_ACTOR")
                        password = System.getenv("GITHUB_TOKEN")
                    }
                }
            }
        }
    }
}
