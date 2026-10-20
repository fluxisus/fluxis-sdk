package us.fluxis.ble.core

import java.security.SecureRandom
import java.util.UUID

/** Collector phases (spec §6.1). */
public enum class CollectorPhase(public val wire: String, public val isTerminal: Boolean) {
    IDLE("idle", false),
    PREPARING("preparing", false),
    ADVERTISING("advertising", false),
    STOPPED("stopped", true),
    FAILED("failed", true),
}

/**
 * What a collector session publishes. [token] is the NASPIP token from Fluxis core-api (the
 * same one the QR code shows). [posId] is only used when the token doesn't fit in PREVIEW
 * (spec §4.2). [amount] and [displayName] go into RECORD as hints; [displayName] is cut to 64
 * UTF-8 bytes on a code point boundary.
 */
public class CollectorConfig @JvmOverloads constructor(
    public val token: String,
    public val amount: FluxisAmount?,
    displayName: String,
    public val posId: UUID? = null,
) {
    public val displayName: String = DiscoveryRecord.fitDisplayName(displayName)

    init {
        // Fail fast on a token that can't be published (empty, or too large without a POS id).
        PreviewValue.forToken(ByteArray(FluxisBle.SESSION_ID_BYTES), token, posId)
    }
}

/**
 * Side effects requested by [CollectorEngine]. Implementations must not call back into the
 * engine synchronously; post to the engine's thread instead.
 */
public interface CollectorIo {
    public fun startAdvertising()
    public fun stopAdvertising()

    /** Disconnect [peer]. */
    public fun disconnect(peer: String)

    /** Session over: stop advertising and close the GATT server. */
    public fun closeServer()

    public fun onPhaseChanged(phase: CollectorPhase, detail: String?)

    /** A peer read PREVIEW from offset 0; [total] counts them for this session. Diagnostics only. */
    public fun onPreviewRead(peer: String, total: Int) {}
}

/**
 * The collector state machine of spec §6, with no Bluetooth dependency: it builds RECORD and
 * PREVIEW once, answers offset reads, and disconnects peers after [FluxisBle.T_IDLE_MS]. All
 * methods must be called from one thread. Call [onTick] at [nextDeadlineMs].
 */
public class CollectorEngine @JvmOverloads constructor(
    config: CollectorConfig,
    private val io: CollectorIo,
    private val clock: () -> Long = System::currentTimeMillis,
    random: SecureRandom = SecureRandom(),
    sessionId: ByteArray = ByteArray(FluxisBle.SESSION_ID_BYTES).also { random.nextBytes(it) },
) {
    public val record: DiscoveryRecord = DiscoveryRecord(sessionId, config.amount, config.displayName)
    public val preview: PreviewValue = PreviewValue.forToken(sessionId, config.token, config.posId)
    private val recordBytes = record.encode()
    private val previewBytes = preview.encode()

    public var phase: CollectorPhase = CollectorPhase.IDLE
        private set

    /** Complete PREVIEW reads (offset 0) served in this session. */
    public var previewReads: Int = 0
        private set

    private val peers = LinkedHashMap<String, Long>() // peer → connected at
    private val closing = HashSet<String>()
    private var advertising = false

    public fun recordBytes(): ByteArray = recordBytes.copyOf()

    public fun previewBytes(): ByteArray = previewBytes.copyOf()

    /** Host is opening the GATT server; the service is being registered. */
    public fun begin() {
        check(phase == CollectorPhase.IDLE) { "begin() called in $phase" }
        setPhase(CollectorPhase.PREPARING)
    }

    /** The service-added callback succeeded. */
    public fun onServiceAdded() {
        if (phase != CollectorPhase.PREPARING || advertising) return
        advertising = true
        io.startAdvertising()
    }

    public fun onAdvertisingStarted() {
        if (phase == CollectorPhase.PREPARING) setPhase(CollectorPhase.ADVERTISING)
    }

    public fun onAdvertisingFailed(detail: String) {
        advertising = false
        fail("advertise_failed:$detail")
    }

    public fun onServerFailed(detail: String) {
        fail("server_failed:$detail")
    }

    public fun onConnected(peer: String) {
        if (phase.isTerminal) {
            io.disconnect(peer)
            return
        }
        peers.getOrPut(peer) { clock() }
    }

    public fun onDisconnected(peer: String) {
        peers.remove(peer)
        closing.remove(peer)
    }

    /** Value for an ATT read of RECORD at [offset], or `null` for an invalid offset or a dead session. */
    public fun readRecord(peer: String, offset: Int): ByteArray? = read(peer, recordBytes, offset)

    /** Value for an ATT read of PREVIEW at [offset], or `null` for an invalid offset or a dead session. */
    public fun readPreview(peer: String, offset: Int): ByteArray? {
        val value = read(peer, previewBytes, offset) ?: return null
        if (offset == 0) {
            previewReads++
            io.onPreviewRead(peer, previewReads)
        }
        return value
    }

    public fun stop() {
        if (phase.isTerminal) return
        setPhase(CollectorPhase.STOPPED)
        teardown()
    }

    /** Disconnects peers that have been connected for [FluxisBle.T_IDLE_MS]. */
    public fun onTick() {
        if (phase.isTerminal) return
        val now = clock()
        for ((peer, since) in peers.toList()) {
            if (peer !in closing && now - since >= FluxisBle.T_IDLE_MS) {
                closing += peer
                io.disconnect(peer)
            }
        }
    }

    /** Earliest time at which [onTick] has work to do, or `null` if none is scheduled. */
    public fun nextDeadlineMs(): Long? {
        if (phase.isTerminal) return null
        return peers.filterKeys { it !in closing }.values.minOrNull()?.plus(FluxisBle.T_IDLE_MS)
    }

    private fun read(peer: String, value: ByteArray, offset: Int): ByteArray? {
        if (phase.isTerminal) return null
        peers.getOrPut(peer) { clock() }
        if (offset < 0 || offset > value.size) return null
        return value.copyOfRange(offset, value.size)
    }

    private fun fail(detail: String) {
        if (phase.isTerminal) return
        setPhase(CollectorPhase.FAILED, detail)
        teardown()
    }

    private fun teardown() {
        if (advertising) {
            advertising = false
            io.stopAdvertising()
        }
        for (peer in peers.keys.toList()) if (closing.add(peer)) io.disconnect(peer)
        io.closeServer()
    }

    private fun setPhase(next: CollectorPhase, detail: String? = null) {
        if (phase == next && detail == null) return
        phase = next
        io.onPhaseChanged(next, detail)
    }
}
