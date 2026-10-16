package us.fluxis.ble.core

import org.junit.Test
import java.security.SecureRandom
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val TOKEN = "v4.local.collector-engine-test-token-0123456789abcdefghijklmnopqrstuvwxyz"

/** Records engine side effects and lets the test pump indications like a GATT stack would. */
private class FakeIo : CollectorIo {
    val phases = mutableListOf<Pair<CollectorPhase, String?>>()
    val indications = ArrayDeque<Pair<String, ByteArray>>()
    val disconnected = mutableListOf<String>()
    var advertising = false
    var advertiseStarts = 0
    var closed = false

    override fun startAdvertising() {
        advertising = true
        advertiseStarts++
    }

    override fun stopAdvertising() {
        advertising = false
    }

    override fun indicate(peer: String, frame: ByteArray) {
        indications.addLast(peer to frame)
    }

    override fun disconnect(peer: String) {
        disconnected += peer
    }

    override fun closeServer() {
        closed = true
    }

    override fun onPhaseChanged(phase: CollectorPhase, detail: String?) {
        phases += phase to detail
    }
}

private class Harness(
    ttlSeconds: Int = 120,
    rearm: Boolean = true,
    token: String = TOKEN,
    amount: FluxisAmount? = FluxisAmount.parse("12.50", "ARS"),
) {
    var now = 1_800_000_000_000L
    val io = FakeIo()
    val engine = CollectorEngine(
        CollectorConfig(token, amount, "Café Tero", ttlSeconds, rearm),
        io,
        clock = { now },
        random = SecureRandom(),
    )

    fun ready(): Harness = apply {
        engine.begin()
        engine.onServiceAdded()
        engine.onAdvertisingStarted()
        assertEquals(CollectorPhase.READY, engine.phase)
    }

    fun connect(peer: String, mtu: Int = 23, subscribe: Boolean = true): PayerSession {
        engine.onConnected(peer)
        engine.onMtuChanged(peer, mtu)
        val record = readFullRecord(peer, mtu)
        if (subscribe) engine.onSubscriptionChanged(peer, true)
        return PayerSession(record, mtu)
    }

    /** Emulates ATT Read + Read Blob with (MTU − 1)-byte responses. */
    fun readFullRecord(peer: String, mtu: Int): ByteArray {
        val out = java.io.ByteArrayOutputStream()
        while (true) {
            val chunk = engine.readRecord(peer, out.size())!!.take(mtu - 1).toByteArray()
            out.write(chunk)
            if (chunk.size < mtu - 1) break
        }
        return out.toByteArray()
    }

    fun write(peer: String, frames: List<ByteArray>) = frames.forEach { engine.onControlWrite(peer, it) }

    /** Delivers queued indications for [peer] to [session], confirming each, until an event other than Incomplete. */
    fun pump(peer: String, session: PayerSession, confirm: Boolean = true): PayerEvent {
        var event: PayerEvent = PayerEvent.Incomplete
        while (event is PayerEvent.Incomplete) {
            val (to, frame) = io.indications.removeFirstOrNull() ?: return event
            assertEquals(peer, to)
            assertTrue(frame.size <= session.mtu - 3, "indication exceeds MTU − 3")
            event = session.onIndication(frame)
            if (confirm) engine.onIndicationSent(peer, true)
        }
        return event
    }

    fun advance(ms: Long) {
        now += ms
        engine.onTick()
    }
}

class CollectorEngineTest {
    @Test
    fun happyPathAtMinimumMtu() = deliver(mtu = 23)

    @Test
    fun happyPathAtLargeMtu() = deliver(mtu = 517)

    private fun deliver(mtu: Int) {
        val h = Harness().ready()
        assertTrue(h.io.advertising)
        val payer = h.connect("A", mtu)
        assertEquals(DiscoveryRecord.decode(h.engine.recordBytes()), payer.record)
        assertEquals("ARS 12.50", payer.record.amount.toString())

        h.write("A", payer.startFrames)
        assertEquals(CollectorPhase.CLAIMED, h.engine.phase)
        assertFalse(h.io.advertising, "advertising stops once claimed")

        val delivered = assertIs<PayerEvent.Delivered>(h.pump("A", payer))
        assertEquals(TOKEN, delivered.token)
        assertEquals(CollectorPhase.AWAITING_ACK, h.engine.phase)

        h.write("A", delivered.ackFrames)
        assertEquals(CollectorPhase.DELIVERED, h.engine.phase)
        assertFalse(h.io.closed, "lingers before closing")
        assertEquals(h.now + FluxisBle.T_LINGER_MS, h.engine.nextDeadlineMs())
        h.advance(FluxisBle.T_LINGER_MS)
        assertTrue(h.io.closed)
        assertEquals(listOf("A"), h.io.disconnected)
        assertEquals(
            listOf(CollectorPhase.PREPARING, CollectorPhase.READY, CollectorPhase.CLAIMED, CollectorPhase.AWAITING_ACK, CollectorPhase.DELIVERED),
            h.io.phases.map { it.first },
        )
    }

    @Test
    fun ackOvertakingLastConfirmationIsAccepted() {
        val h = Harness().ready()
        val payer = h.connect("A")
        h.write("A", payer.startFrames)
        var event: PayerEvent = PayerEvent.Incomplete
        while (event is PayerEvent.Incomplete) {
            val (_, frame) = h.io.indications.removeFirst()
            event = payer.onIndication(frame)
            if (event is PayerEvent.Incomplete) h.engine.onIndicationSent("A", true)
        }
        h.write("A", assertIs<PayerEvent.Delivered>(event).ackFrames)
        assertEquals(CollectorPhase.DELIVERED, h.engine.phase)
    }

    @Test
    fun secondPayerGetsBusyAndIsDisconnected() {
        val h = Harness().ready()
        val a = h.connect("A")
        val b = h.connect("B")
        h.write("A", a.startFrames)
        h.write("B", b.startFrames)
        val busy = h.io.indications.filter { it.first == "B" }
        assertEquals(1, busy.size)
        assertIs<PayerEvent.Busy>(b.onIndication(busy.single().second))
        assertTrue("B" in h.io.disconnected)
        h.io.indications.removeAll { it.first == "B" }
        val delivered = assertIs<PayerEvent.Delivered>(h.pump("A", a))
        h.write("A", delivered.ackFrames)
        assertEquals(CollectorPhase.DELIVERED, h.engine.phase)
    }

    @Test
    fun badAckRearmsAndASecondAttemptSucceeds() {
        val h = Harness().ready()
        val a = h.connect("A")
        h.write("A", a.startFrames)
        assertIs<PayerEvent.Delivered>(h.pump("A", a))
        h.write("A", Framing.split(MessageType.ACK, ByteArray(16), 23))
        assertEquals(CollectorPhase.READY, h.engine.phase)
        assertEquals("bad_ack", h.io.phases.last().second)
        assertTrue(h.io.advertising, "re-armed")
        assertEquals(2, h.io.advertiseStarts)
        val error = h.io.indications.removeLast()
        assertEquals(MessageType.ERROR.code, error.second[0].toInt())
        assertEquals(CollectorErrorCode.BAD_ACK.code, error.second[3].toInt())
        assertTrue("A" in h.io.disconnected)
        h.engine.onDisconnected("A")

        val b = h.connect("B")
        h.write("B", b.startFrames)
        val delivered = assertIs<PayerEvent.Delivered>(h.pump("B", b))
        h.write("B", delivered.ackFrames)
        assertEquals(CollectorPhase.DELIVERED, h.engine.phase)
    }

    @Test
    fun badAckFailsSessionWhenRearmDisabled() {
        val h = Harness(rearm = false).ready()
        val a = h.connect("A")
        h.write("A", a.startFrames)
        assertIs<PayerEvent.Delivered>(h.pump("A", a))
        h.write("A", Framing.split(MessageType.ACK, ByteArray(16), 23))
        assertEquals(CollectorPhase.FAILED, h.engine.phase)
        assertTrue(h.io.closed)
    }

    @Test
    fun payerDisconnectMidDeliveryRearms() {
        val h = Harness().ready()
        val a = h.connect("A")
        h.write("A", a.startFrames)
        h.engine.onDisconnected("A")
        assertEquals(CollectorPhase.READY, h.engine.phase)
        assertEquals("peer_disconnected", h.io.phases.last().second)
        assertTrue(h.io.advertising)
    }

    @Test
    fun abortRearms() {
        val h = Harness().ready()
        val a = h.connect("A")
        h.write("A", a.startFrames)
        h.write("A", a.abortFrames(AbortReason.USER_CANCELLED))
        assertEquals(CollectorPhase.READY, h.engine.phase)
        assertEquals("aborted:user_cancelled", h.io.phases.last().second)
    }

    @Test
    fun unsubscribedStartIsDroppedWithoutClaim() {
        val h = Harness().ready()
        val a = h.connect("A", subscribe = false)
        h.write("A", a.startFrames)
        assertEquals(CollectorPhase.READY, h.engine.phase)
        assertTrue(h.io.indications.isEmpty())
        assertEquals(listOf("A"), h.io.disconnected)
    }

    @Test
    fun startForAnotherSessionIsRejected() {
        val h = Harness().ready()
        h.engine.onConnected("A")
        h.engine.onSubscriptionChanged("A", true)
        val other = Harness().ready()
        val foreign = PayerSession(other.engine.recordBytes(), 23)
        h.write("A", foreign.startFrames)
        assertEquals(CollectorPhase.READY, h.engine.phase)
        val (_, frame) = h.io.indications.single()
        assertEquals(CollectorErrorCode.SESSION_MISMATCH, assertIs<PayerEvent.Rejected>(foreign.onIndication(frame)).code)
    }

    @Test
    fun malformedFrameIsRejected() {
        val h = Harness().ready()
        h.connect("A")
        h.engine.onControlWrite("A", byteArrayOf(0x02, 0, 1, 0))
        val (_, frame) = h.io.indications.single()
        assertContentEquals(byteArrayOf(0x7F, 0, 1, CollectorErrorCode.MALFORMED.code.toByte()), frame)
        assertEquals(listOf("A"), h.io.disconnected)
    }

    @Test
    fun ackTimeoutRearms() {
        val h = Harness().ready()
        val a = h.connect("A")
        h.write("A", a.startFrames)
        assertIs<PayerEvent.Delivered>(h.pump("A", a))
        h.advance(FluxisBle.T_ACK_MS - 1)
        assertEquals(CollectorPhase.AWAITING_ACK, h.engine.phase)
        h.advance(1)
        assertEquals(CollectorPhase.READY, h.engine.phase)
        assertEquals("ack_timeout", h.io.phases.last().second)
    }

    @Test
    fun indicationConfirmationTimeoutRearms() {
        val h = Harness().ready()
        val a = h.connect("A")
        h.write("A", a.startFrames)
        h.advance(FluxisBle.T_FRAME_MS)
        assertEquals(CollectorPhase.READY, h.engine.phase)
        assertEquals("indication_timeout", h.io.phases.last().second)
    }

    @Test
    fun partialStartTimesOut() {
        val h = Harness().ready()
        val a = h.connect("A")
        h.write("A", a.startFrames.take(2))
        assertEquals(h.now + FluxisBle.T_FRAME_MS, h.engine.nextDeadlineMs())
        h.advance(FluxisBle.T_FRAME_MS)
        assertEquals(listOf("A"), h.io.disconnected)
        assertEquals(CollectorErrorCode.TIMEOUT.code, h.io.indications.single().second[3].toInt())
    }

    @Test
    fun idlePeerIsDisconnected() {
        val h = Harness().ready()
        h.connect("A")
        h.advance(FluxisBle.T_IDLE_MS - 1)
        assertTrue(h.io.disconnected.isEmpty())
        h.advance(1)
        assertEquals(listOf("A"), h.io.disconnected)
    }

    @Test
    fun sessionExpires() {
        val h = Harness(ttlSeconds = 30).ready()
        h.connect("A")
        h.engine.onTick()
        val expiresAtMs = h.engine.record.expiresAtEpochSeconds * 1000
        h.now = expiresAtMs
        h.engine.onTick()
        assertEquals(CollectorPhase.EXPIRED, h.engine.phase)
        assertFalse(h.io.advertising)
        assertTrue(h.io.closed)
        assertNull(h.engine.nextDeadlineMs())
    }

    @Test
    fun startAfterExpiryIsRejectedWithExpired() {
        val h = Harness(ttlSeconds = 30).ready()
        val a = h.connect("A")
        h.now = h.engine.record.expiresAtEpochSeconds * 1000
        h.write("A", a.startFrames)
        assertEquals(CollectorErrorCode.EXPIRED, assertIs<PayerEvent.Rejected>(h.pump("A", a)).code)
    }

    @Test
    fun stopTearsDown() {
        val h = Harness().ready()
        h.connect("A")
        h.engine.stop()
        assertEquals(CollectorPhase.STOPPED, h.engine.phase)
        assertTrue(h.io.closed)
        assertEquals(listOf("A"), h.io.disconnected)
        h.engine.onConnected("B")
        assertEquals(listOf("A", "B"), h.io.disconnected)
    }

    @Test
    fun advertisingFailureFailsSession() {
        val h = Harness()
        h.engine.begin()
        h.engine.onServiceAdded()
        h.engine.onAdvertisingFailed("ADVERTISE_FAILED_FEATURE_UNSUPPORTED")
        assertEquals(CollectorPhase.FAILED, h.engine.phase)
        assertEquals("advertise_failed:ADVERTISE_FAILED_FEATURE_UNSUPPORTED", h.io.phases.last().second)
    }

    @Test
    fun recordReadsHonourOffsets() {
        val h = Harness().ready()
        val full = h.engine.recordBytes()
        assertContentEquals(full.copyOfRange(10, full.size), h.engine.readRecord("A", 10))
        assertContentEquals(ByteArray(0), h.engine.readRecord("A", full.size))
        assertNull(h.engine.readRecord("A", full.size + 1))
    }

    @Test
    fun openAmountAndMaxTokenDeliver() {
        val token = "v4.local." + "x".repeat(FluxisBle.MAX_TOKEN_BYTES - 9)
        val h = Harness(token = token, amount = null).ready()
        val a = h.connect("A", mtu = 23)
        assertNull(a.record.amount)
        h.write("A", a.startFrames)
        val delivered = assertIs<PayerEvent.Delivered>(h.pump("A", a))
        assertEquals(token, delivered.token)
        h.write("A", delivered.ackFrames)
        assertEquals(CollectorPhase.DELIVERED, h.engine.phase)
    }

    @Test
    fun configValidation() {
        assertProtocolError("message_too_large", "token too long") {
            CollectorConfig("x".repeat(FluxisBle.MAX_TOKEN_BYTES + 1), null, "POS")
        }
        assertProtocolError("empty_token", "empty token") { CollectorConfig("", null, "POS") }
        assertProtocolError("invalid_display_name", "blank name") { CollectorConfig(TOKEN, null, "   ") }
        assertEquals(64, CollectorConfig(TOKEN, null, "é".repeat(40)).displayName.toByteArray().size)
        assertEquals(63, CollectorConfig(TOKEN, null, "€".repeat(30)).displayName.toByteArray().size)
    }
}
