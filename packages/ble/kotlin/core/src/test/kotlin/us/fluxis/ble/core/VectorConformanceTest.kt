package us.fluxis.ble.core

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Runs every section of the shared test vectors against the Kotlin implementation. */
class VectorConformanceTest {
    @Test
    fun constantsMatch() {
        assertEquals(FluxisBle.PROTOCOL_VERSION, Vectors.root.int("protocolVersion"))
        val uuids = Vectors.section("uuids").obj()
        assertEquals(FluxisBle.SERVICE_UUID.toString(), uuids.str("service"))
        assertEquals(FluxisBle.RECORD_UUID.toString(), uuids.str("record"))
        assertEquals(FluxisBle.CONTROL_UUID.toString(), uuids.str("control"))
        assertEquals(FluxisBle.DATA_UUID.toString(), uuids.str("data"))
        assertEquals(FluxisBle.CCCD_UUID.toString(), uuids.str("cccd"))
        val types = Vectors.section("messageTypes").obj()
        for (t in MessageType.entries) assertEquals(t.code, types.int(t.name.lowercase()), t.name)
        val reasons = Vectors.section("messages", "abortReasons").obj()
        assertEquals(AbortReason.entries.size, reasons.size)
        for (r in AbortReason.entries) assertEquals(r.code, reasons.int(r.name.lowercase()), r.name)
        val codes = Vectors.section("messages", "errorCodes").obj()
        assertEquals(CollectorErrorCode.entries.size, codes.size)
        for (c in CollectorErrorCode.entries) assertEquals(c.code, codes.int(c.name.lowercase()), c.name)
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
            assertEquals(v.long("expiresAt"), r.expiresAtEpochSeconds, name)
            assertBytes(v.hex("sessionId"), r.sessionId, name)
            assertBytes(v.hex("collectorPublicKey"), r.collectorPublicKey, name)
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
    fun framingSplit() {
        for (v in Vectors.section("framing", "split").arr().map { it.obj() }) {
            val type = MessageType.fromCode(v.int("type"))!!
            val frames = Framing.split(type, v.hex("payload"), v.int("mtu"))
            assertEquals(v.hexList("frames").map { it.toHex() }, frames.map { it.toHex() }, v.str("name"))
            val direction = type.direction
            val r = Reassembler(direction, v.int("mtu"))
            frames.dropLast(1).forEach { assertNull(r.push(it)) }
            val m = r.push(frames.last())!!
            assertEquals(type, m.type)
            assertBytes(v.hex("payload"), m.payload, v.str("name"))
        }
        for (v in Vectors.section("framing", "splitErrors").arr().map { it.obj() }) {
            assertProtocolError(v.str("error"), v.str("name")) {
                Framing.split(MessageType.fromCode(v.int("type"))!!, ByteArray(v.int("payloadLength")), v.int("mtu"))
            }
        }
    }

    @Test
    fun framingReassembly() {
        for (v in Vectors.section("framing", "reassemble").arr().map { it.obj() }) {
            val name = v.str("name")
            val direction = if (v.str("direction") == "toPayer") Direction.TO_PAYER else Direction.TO_COLLECTOR
            val r = Reassembler(direction, v.int("mtu"))
            val frames = v.hexList("frames")
            frames.dropLast(1).forEach { assertNull(r.push(it), name) }
            if (v.containsKey("error")) {
                assertProtocolError(v.str("error"), name) { r.push(frames.last()) }
                assertFalse(r.inProgress, "$name: buffer reset after error")
            } else {
                val m = r.push(frames.last())!!
                val expect = v.getValue("expect").obj()
                assertEquals(expect.int("type"), m.type.code, name)
                assertBytes(expect.hex("payload"), m.payload, name)
            }
        }
    }

    @Test
    fun messages() {
        val start = Vectors.section("messages", "start").obj()
        assertBytes(start.hex("hex"), StartMessage(start.hex("sessionId"), start.hex("payerPublicKey")).encode(), "start")
        val decoded = StartMessage.decode(start.hex("hex"))
        assertBytes(start.hex("sessionId"), decoded.sessionId, "start.sessionId")
        assertBytes(start.hex("payerPublicKey"), decoded.payerPublicKey, "start.payerPublicKey")
        for (v in Vectors.section("messages", "startInvalid").arr().map { it.obj() }) {
            assertProtocolError(v.str("error"), "start: ${v.str("name")}") { StartMessage.decode(v.hex("hex")) }
        }
        for (v in Vectors.section("messages", "envelope").arr().map { it.obj() }) {
            assertBytes(v.hex("hex"), Envelope.encodeNaspip(v.str("token")), "envelope")
            assertEquals(v.str("token"), Envelope.decode(v.hex("hex")))
        }
        for (v in Vectors.section("messages", "envelopeInvalid").arr().map { it.obj() }) {
            assertProtocolError(v.str("error"), "envelope: ${v.str("name")}") { Envelope.decode(v.hex("hex")) }
        }
    }

    @Test
    fun handshakes() {
        for (v in Vectors.section("handshakes").arr().map { it.obj() }) {
            val name = v.str("name")
            val collector = P256KeyPair.fromRaw(v.hex("collectorPrivateKey"), v.hex("collectorPublicKey"))
            val payer = P256KeyPair.fromRaw(v.hex("payerPrivateKey"), v.hex("payerPublicKey"))
            val record = v.hex("record")
            val start = v.hex("start")
            assertBytes(start, StartMessage(DiscoveryRecord.decode(record).sessionId, payer.publicKey).encode(), "$name start")

            val ck = KeySchedule.derive(collector, payer.publicKey, record, start)
            val pk = KeySchedule.derive(payer, collector.publicKey, record, start)
            for ((label, keys) in listOf("collector" to ck, "payer" to pk)) {
                assertBytes(v.hex("sharedSecret"), keys.sharedSecret, "$name $label Z")
                assertBytes(v.hex("transcriptHash"), keys.transcriptHash, "$name $label TH")
                assertBytes(v.hex("prk"), keys.prk, "$name $label PRK")
                assertBytes(v.hex("dataKey"), keys.dataKey, "$name $label dataKey")
                assertBytes(v.hex("ackKey"), keys.ackKey, "$name $label ackKey")
            }

            val envelope = Envelope.encodeNaspip(v.str("token"))
            assertBytes(v.hex("envelope"), envelope, "$name envelope")
            val data = DataMessage.seal(ck, v.hex("nonce"), envelope)
            assertBytes(v.hex("data"), data, "$name data")
            assertBytes(envelope, DataMessage.open(pk, data), "$name open")
            assertProtocolError("decrypt_failed", "$name tampered") { DataMessage.open(pk, v.hex("tamperedData")) }

            val ack = AckMessage.compute(pk, envelope)
            assertBytes(v.hex("ack"), ack, "$name ack")
            assertTrue(AckMessage.verify(ck, envelope, ack))
            assertFalse(AckMessage.verify(ck, envelope, v.hex("tamperedAck")))

            for (f in v.getValue("frames").arr().map { it.obj() }) {
                val mtu = f.int("mtu")
                assertEquals(f.hexList("start").map { it.toHex() }, Framing.split(MessageType.START, start, mtu).map { it.toHex() }, "$name start@$mtu")
                assertEquals(f.hexList("data").map { it.toHex() }, Framing.split(MessageType.DATA, data, mtu).map { it.toHex() }, "$name data@$mtu")
                assertEquals(f.hexList("ack").map { it.toHex() }, Framing.split(MessageType.ACK, ack, mtu).map { it.toHex() }, "$name ack@$mtu")

                // The payer-side session must reach the same token and ACK from the vector frames.
                val session = PayerSession(record, mtu, payer)
                assertEquals(f.hexList("start").map { it.toHex() }, session.startFrames.map { it.toHex() }, "$name session start@$mtu")
                val frames = f.hexList("data")
                frames.dropLast(1).forEach { assertTrue(session.onIndication(it) is PayerEvent.Incomplete) }
                val event = session.onIndication(frames.last()) as PayerEvent.Delivered
                assertEquals(v.str("token"), event.token)
                assertEquals(f.hexList("ack").map { it.toHex() }, event.ackFrames.map { it.toHex() }, "$name session ack@$mtu")
            }
        }
    }
}
