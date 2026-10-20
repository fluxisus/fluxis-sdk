package us.fluxis.ble.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.fail

/** Loads packages/ble/test-vectors/vectors.json (path injected by Gradle). */
internal object Vectors {
    val root: JsonObject by lazy {
        val path = System.getProperty("fluxis.ble.vectors")
            ?: error("system property fluxis.ble.vectors is not set")
        Json.parseToJsonElement(File(path).readText()).jsonObject
    }

    fun section(vararg path: String): JsonElement =
        path.fold(root as JsonElement) { el, key -> el.jsonObject[key] ?: error("missing vector section $key") }
}

internal fun JsonElement.obj(): JsonObject = jsonObject
internal fun JsonElement.arr(): JsonArray = jsonArray
internal fun JsonObject.str(key: String): String = getValue(key).jsonPrimitive.content
internal fun JsonObject.int(key: String): Int = getValue(key).jsonPrimitive.int
internal fun JsonObject.long(key: String): Long = getValue(key).jsonPrimitive.long
internal fun JsonObject.hex(key: String): ByteArray = str(key).hexToBytes()
internal fun JsonObject.hexList(key: String): List<ByteArray> = getValue(key).jsonArray.map { it.jsonPrimitive.content.hexToBytes() }
internal fun JsonObject.isNull(key: String): Boolean = get(key) == null || get(key) is JsonNull
internal fun JsonObject.flag(key: String): Boolean = get(key)?.jsonPrimitive?.content == "true"

internal fun assertProtocolError(expected: String, label: String, block: () -> Unit) {
    try {
        block()
    } catch (e: FluxisBleProtocolException) {
        assertEquals(expected, e.code.wire, label)
        return
    }
    fail("$label: expected protocol error $expected")
}

internal fun assertBytes(expected: ByteArray, actual: ByteArray, label: String) =
    assertEquals(expected.toHex(), actual.toHex(), label)
