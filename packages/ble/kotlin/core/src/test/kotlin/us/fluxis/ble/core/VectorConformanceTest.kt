package us.fluxis.ble.core

import kotlinx.serialization.json.jsonPrimitive
import org.junit.Test
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** Runs every section of the shared test vectors against the Kotlin implementation. */
class VectorConformanceTest {
    @Test
    fun constantsMatch() {
        assertEquals(FluxisBle.PROTOCOL_VERSION, Vectors.root.int("protocolVersion"))
        val uuids = Vectors.section("uuids").obj()
        assertEquals(3, uuids.size)
        assertEquals(FluxisBle.SERVICE_UUID.toString(), uuids.str("service"))
        assertEquals(FluxisBle.RECORD_UUID.toString(), uuids.str("record"))
        assertEquals(FluxisBle.PREVIEW_UUID.toString(), uuids.str("preview"))
        val limits = Vectors.section("limits").obj()
        assertEquals(FluxisBle.MAX_ATTRIBUTE_BYTES, limits.int("maxAttributeBytes"))
        assertEquals(FluxisBle.MAX_PREVIEW_TOKEN_BYTES, limits.int("maxPreviewTokenBytes"))
        assertEquals(FluxisBle.MAX_RECORD_BYTES, limits.int("maxRecordBytes"))
        assertEquals(FluxisBle.SESSION_ID_BYTES, limits.int("sessionIdBytes"))
        assertEquals(FluxisBle.MAX_DISPLAY_NAME_BYTES, limits.int("maxDisplayNameBytes"))
        assertEquals(FluxisBle.T_IDLE_MS, limits.long("idleTimeoutMs"))
        val kinds = Vectors.section("previewKinds").obj()
        assertEquals(PreviewContent.KIND_NASPIP, kinds.int("naspip"))
        assertEquals(PreviewContent.KIND_POS_ID, kinds.int("pos_id"))
        val wires = ProtocolErrorCode.entries.map { it.wire }.toSet()
        val used = buildSet {
            for (s in listOf(listOf("amounts", "invalid"), listOf("records", "invalid"), listOf("previews", "invalid"), listOf("previews", "choiceErrors"))) {
                Vectors.section(*s.toTypedArray()).arr().forEach { add(it.obj().str("error")) }
            }
        }
        assertEquals(emptySet(), used - wires, "error codes in vectors missing from ProtocolErrorCode")
    }

    @Test
    fun amounts() {
        for (v in Vectors.section("amounts", "valid").arr().map { it.obj() }) {
            val currency = v.str("currency")
            val a = FluxisAmount.parse(v.str("decimal"), currency)
            assertEquals(v.str("minor").toLong(), a.minorUnits, v.str("decimal"))
            assertEquals(v.int("scale"), a.scale, v.str("decimal"))
            assertEquals(currency.ifEmpty { null }, a.currency)
            assertEquals(v.str("decimal"), a.toDecimalString())
            assertEquals(v.str("decimal"), FluxisAmount.of(a.toBigDecimal(), a.currency).toDecimalString())
        }
        for (v in Vectors.section("amounts", "invalid").arr().map { it.obj() }) {
            assertProtocolError(v.str("error"), "amount '${v.str("decimal")}' ${v.str("currency")}") {
                FluxisAmount.parse(v.str("decimal"), v.str("currency"))
            }
        }
    }

    @Test
    fun records() {
        for (v in Vectors.section("records", "valid").arr().map { it.obj() }) {
            val name = v.str("name")
            val r = DiscoveryRecord.decode(v.hex("hex"))
            assertBytes(v.hex("sessionId"), r.sessionId, name)
            assertEquals(v.str("displayName"), r.displayName, name)
            if (v.isNull("amount")) {
                assertNull(r.amount, name)
            } else {
                val a = v.getValue("amount").obj()
                assertEquals(FluxisAmount(a.str("minor").toLong(), a.int("scale"), a.str("currency").ifEmpty { null }), r.amount, name)
            }
            if (!v.flag("decodeOnly")) assertBytes(v.hex("hex"), r.encode(), "$name (re-encode)")
        }
        for (v in Vectors.section("records", "invalid").arr().map { it.obj() }) {
            assertProtocolError(v.str("error"), "record: ${v.str("name")}") { DiscoveryRecord.decode(v.hex("hex")) }
        }
    }

    @Test
    fun previews() {
        for (v in Vectors.section("previews", "valid").arr().map { it.obj() }) {
            val name = v.str("name")
            val p = PreviewValue.decode(v.hex("hex"))
            assertBytes(v.hex("sessionId"), p.sessionId, name)
            assertEquals(v.int("length"), v.hex("hex").size, name)
            val expected = when (v.str("kind")) {
                "naspip" -> PreviewContent.Naspip(v.str("token"))
                "pos_id" -> PreviewContent.PosId(UUID.fromString(v.str("posId")))
                else -> error("unknown kind in vectors")
            }
            assertEquals(expected, p.content, name)
            assertBytes(v.hex("hex"), PreviewValue(v.hex("sessionId"), expected).encode(), "$name (re-encode)")
        }
        for (v in Vectors.section("previews", "choice").arr().map { it.obj() }) {
            val p = PreviewValue.forToken(v.hex("sessionId"), v.str("token"), UUID.fromString(v.str("posId")))
            assertBytes(v.hex("hex"), p.encode(), v.str("name"))
            assertEquals(v.str("kind"), if (p.content is PreviewContent.PosId) "pos_id" else "naspip", v.str("name"))
        }
        for (v in Vectors.section("previews", "choiceErrors").arr().map { it.obj() }) {
            val posId = if (v.isNull("posId")) null else UUID.fromString(v.getValue("posId").jsonPrimitive.content)
            assertProtocolError(v.str("error"), "choice: ${v.str("name")}") { PreviewValue.forToken(v.hex("sessionId"), v.str("token"), posId) }
        }
        for (v in Vectors.section("previews", "invalid").arr().map { it.obj() }) {
            assertProtocolError(v.str("error"), "preview: ${v.str("name")}") { PreviewValue.decode(v.hex("hex")) }
        }
    }
}
