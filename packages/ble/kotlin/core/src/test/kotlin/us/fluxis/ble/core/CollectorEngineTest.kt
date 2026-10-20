package us.fluxis.ble.core

import org.junit.Test
import java.util.UUID
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val TOKEN = "naspip;fluxis.us;fluxis.qr.dyn.1;v4.public.collector-engine-test-token"
private val POS_ID: UUID = UUID.fromString("d2929894-2582-4877-8f92-ebe861f60987")
private val SESSION = ByteArray(16) { it.toByte() }

private class FakeIo : CollectorIo {
    val phases = mutableListOf<Pair<CollectorPhase, String?>>()
    val disconnected = mutableListOf<String>()
    val previewReads = mutableListOf<Pair<String, Int>>()
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

    override fun disconnect(peer: String) {
        disconnected += peer
    }

    override fun closeServer() {
        closed = true
    }

    override fun onPhaseChanged(phase: CollectorPhase, detail: String?) {
        phases += phase to detail
    }

    override fun onPreviewRead(peer: String, total: Int) {
        previewReads += peer to total
    }
}

private class Harness(token: String = TOKEN, posId: UUID? = null, amount: FluxisAmount? = FluxisAmount.parse("10.50", "ARS")) {
    var now = 1_800_000_000_000L
    val io = FakeIo()
    val engine = CollectorEngine(CollectorConfig(token, amount, "Casa Áureo", posId), io, clock = { now }, sessionId = SESSION)

    fun advertise() = apply {
        engine.begin()
        engine.onServiceAdded()
        engine.onAdvertisingStarted()
    }

    /** Long read the way a central does it: offsets until a short chunk. */
    fun longRead(peer: String, mtu: Int, read: (String, Int) -> ByteArray?): ByteArray {
        var out = ByteArray(0)
        while (true) {
            val chunk = read(peer, out.size)!!.let { it.copyOf(minOf(it.size, mtu - 1)) }
            out += chunk
            if (chunk.size < mtu - 1) return out
        }
    }
}

class CollectorEngineTest {
    @Test
    fun startsAdvertisingAfterServiceAdded() {
        val h = Harness()
        h.engine.begin()
        assertEquals(CollectorPhase.PREPARING, h.engine.phase)
        assertFalse(h.io.advertising)
        h.engine.onServiceAdded()
        assertTrue(h.io.advertising)
        h.engine.onAdvertisingStarted()
        assertEquals(CollectorPhase.ADVERTISING, h.engine.phase)
        assertEquals(listOf(CollectorPhase.PREPARING, CollectorPhase.ADVERTISING), h.io.phases.map { it.first })
    }

    @Test
    fun servesRecordAndPreviewToManyPeersWithLongReads() {
        val h = Harness(token = "naspip;" + "a".repeat(424)).advertise() // 431-byte token, 449-byte value
        val expectedPreview = h.engine.previewBytes()
        assertEquals(449, expectedPreview.size)
        for ((peer, mtu) in listOf("A" to 23, "B" to 185, "C" to 517)) {
            val record = DiscoveryRecord.decode(h.longRead(peer, mtu, h.engine::readRecord))
            val preview = PreviewValue.decode(h.longRead(peer, mtu, h.engine::readPreview))
            assertContentEquals(record.sessionId, preview.sessionId)
            assertContentEquals(expectedPreview, preview.encode())
            assertEquals("Casa Áureo", record.displayName)
        }
        // Reads never change the phase or stop advertising: nobody can take the POS.
        assertEquals(CollectorPhase.ADVERTISING, h.engine.phase)
        assertTrue(h.io.advertising)
        assertEquals(3, h.engine.previewReads)
        assertEquals(listOf("A" to 1, "B" to 2, "C" to 3), h.io.previewReads)
    }

    @Test
    fun offsetAtEndIsEmptyAndPastEndIsInvalid() {
        val h = Harness().advertise()
        val size = h.engine.previewBytes().size
        assertEquals(0, h.engine.readPreview("A", size)!!.size)
        assertNull(h.engine.readPreview("A", size + 1))
        assertNull(h.engine.readRecord("A", -1))
    }

    @Test
    fun fallsBackToPosIdWhenTokenTooLarge() {
        val h = Harness(token = "t".repeat(495), posId = POS_ID).advertise()
        assertEquals(PreviewContent.PosId(POS_ID), h.engine.preview.content)
        assertEquals(34, h.engine.previewBytes().size)
        assertEquals(PreviewContent.Naspip(TOKEN), Harness(posId = POS_ID).engine.preview.content)
    }

    @Test
    fun rejectsTokenThatCannotBePublished() {
        assertEquals(
            ProtocolErrorCode.PREVIEW_TOO_LARGE,
            assertFailsWith<FluxisBleProtocolException> { CollectorConfig("t".repeat(495), null, "POS") }.code,
        )
        assertEquals(
            ProtocolErrorCode.INVALID_TOKEN,
            assertFailsWith<FluxisBleProtocolException> { CollectorConfig("", null, "POS", POS_ID) }.code,
        )
    }

    @Test
    fun disconnectsIdlePeersAfterTIdle() {
        val h = Harness().advertise()
        h.engine.onConnected("A")
        h.now += 5_000
        h.engine.onConnected("B")
        assertEquals(h.now - 5_000 + FluxisBle.T_IDLE_MS, h.engine.nextDeadlineMs())
        h.now += FluxisBle.T_IDLE_MS - 5_000
        h.engine.onTick()
        assertEquals(listOf("A"), h.io.disconnected)
        h.engine.onDisconnected("A")
        h.now += 5_000
        h.engine.onTick()
        assertEquals(listOf("A", "B"), h.io.disconnected)
        assertEquals(CollectorPhase.ADVERTISING, h.engine.phase)
    }

    @Test
    fun stopTearsDownAndRefusesReads() {
        val h = Harness().advertise()
        h.engine.onConnected("A")
        h.engine.stop()
        assertEquals(CollectorPhase.STOPPED, h.engine.phase)
        assertFalse(h.io.advertising)
        assertTrue(h.io.closed)
        assertEquals(listOf("A"), h.io.disconnected)
        assertNull(h.engine.readPreview("A", 0))
        assertNull(h.engine.nextDeadlineMs())
        h.engine.stop()
        assertEquals(1, h.io.phases.count { it.first == CollectorPhase.STOPPED })
        h.engine.onConnected("late")
        assertEquals("late", h.io.disconnected.last())
    }

    @Test
    fun advertisingFailureFailsTheSession() {
        val h = Harness()
        h.engine.begin()
        h.engine.onServiceAdded()
        h.engine.onAdvertisingFailed("too_many_advertisers")
        assertEquals(CollectorPhase.FAILED to "advertise_failed:too_many_advertisers", h.io.phases.last())
        assertTrue(h.io.closed)
        h.engine.onServerFailed("bluetooth_off")
        assertEquals(1, h.io.phases.count { it.first == CollectorPhase.FAILED })
    }

    @Test
    fun openAmountAndFittedName() {
        val h = Harness(amount = null)
        assertNull(h.engine.record.amount)
        val long = CollectorConfig(TOKEN, null, "  " + "€".repeat(30) + "  ")
        assertEquals("€".repeat(21), long.displayName)
        assertIs<PreviewContent.Naspip>(h.engine.preview.content)
    }
}
