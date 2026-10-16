import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm")
    `java-library`
    `maven-publish`
}

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
    withSourcesJar()
}

kotlin {
    explicitApi()
    compilerOptions { jvmTarget.set(JvmTarget.JVM_11) }
}

dependencies {
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
}

tasks.test {
    useJUnit()
    systemProperty("fluxis.ble.vectors", (System.getenv("FLUXIS_BLE_VECTORS") ?: rootProject.file("../test-vectors/vectors.json").absolutePath))
    testLogging { events("failed"); exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL }
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            from(components["java"])
            artifactId = "fluxis-ble-core"
            pom {
                name.set("Fluxis BLE core")
                description.set("Fluxis BLE Handoff Protocol v3: wire format, crypto and state machines (pure JVM).")
                url.set("https://github.com/fluxisus/fluxis-sdk/tree/main/packages/ble/kotlin")
                licenses { license { name.set("MIT"); url.set("https://opensource.org/licenses/MIT") } }
            }
        }
    }
}
