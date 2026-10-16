package us.fluxis.ble.core

import java.security.SecureRandom

/** Collector phases (spec §6.1). */
public enum class CollectorPhase(public val wire: String, public val isTerminal: Boolean) {
    IDLE("idle", false),
    PREPARING("preparing", false),
    READY("ready", false),
    CLAIMED("claimed", false),
    AWAITING_ACK("awaiting_ack", false),
    DELIVERED("delivered", true),
    EXPIRED("expired", true),
    STOPPED("stopped", true),
    FAILED("failed", true),
}

/**
 * What a collector session delivers. [token] is the NASPIP token from Fluxis core-api (the same
 * one the QR code would show). [displayName] is cut to 64 UTF-8 bytes on a code point boundary.
 */
public class CollectorConfig @JvmOverloads constructor(
    public val token: String,
    public val amount: FluxisAmount?,
    displayName: String,
    public val ttlSeconds: Int = FluxisBle.DEFAULT_TTL_SECONDS,
    /** After a failed attempt, go back to `ready` instead of failing the session (spec §6.2.7). */
    public val rearmOnFailure: Boolean = true,
) {
    public val displayName: String = DiscoveryRecord.fitDisplayName(displayName)

    init {
        require(ttlSeconds in 1..FluxisBle.MAX_TTL_SECONDS) { "ttlSeconds must be 1..${FluxisBle.MAX_TTL_SECONDS}" }
        Envelope.encodeNaspip(token)
    }
}

/**
 * Side effects requested by [CollectorEngine]. Implementations must not call back into the
 * engine synchronously; post to the engine's thread instead.
 */
public interface CollectorIo {
    public fun startAdvertising()
    public fun stopAdvertising()

    /** Send one confirmed indication on DATA; report the outcome via [CollectorEngine.onIndicationSent]. */
    public fun indicate(peer: String, frame: ByteArray)

    /** Disconnect after any indications already queued for [peer] have been sent. */
    public fun disconnect(peer: String)

    /** Session over: stop advertising and close the GATT server. */
    public fun closeServer()

    public fun onPhaseChanged(phase: CollectorPhase, detail: String?)
}

/**
 * The collector state machine of spec §6, with no Bluetooth dependency. All methods must be
 * called from one thread. Call [onTick] at [nextDeadlineMs] (or periodically) to run timeouts.
 */
public class CollectorEngine @JvmOverloads constructor(
    private val config: CollectorConfig,
    private val io: CollectorIo,
    private val clock: () -> Long = System::currentTimeMillis,
    private val random: SecureRandom = SecureRandom(),
    private val keyPair: P256KeyPair = P256.generate(random),
    sessionId: ByteArray = ByteArray(FluxisBle.SESSION_ID_BYTES).also { random.nextBytes(it) },
) {
    private val envelope = Envelope.encodeNaspip(config.token)

    public val record: DiscoveryRecord = DiscoveryRecord(
        expiresAtEpochSeconds = clock() / 1000 + config.ttlSeconds,
        sessionId = sessionId,
        collectorPublicKey = keyPair.publicKey,
        amount = config.amount,
        displayName = config.displayName,
    )
    private val recordBytes = record.encode()
    private val sessionIdBytes = sessionId.copyOf()
    private val expiresAtMs = record.expiresAtEpochSeconds * 1000

    public var phase: CollectorPhase = CollectorPhase.IDLE
        private set

    private val peers = LinkedHashMap<String, Peer>()
    private var claim: Claim? = null
    private var advertising = false
    private var finishAtMs: Long? = null

    private class Peer(val id: String, val connectedAtMs: Long) {
        var mtu = FluxisBle.DEFAULT_MTU
        var subscribed = false
        var closing = false
        var lastFrameAtMs: Long? = null
        val reassembler = Reassembler(Direction.TO_COLLECTOR, FluxisBle.DEFAULT_MTU)
    }

    private class Claim(val peer: String, val keys: SessionKeys, val frames: List<ByteArray>) {
        var next = 0
        var pendingSinceMs: Long? = null
        var ackSinceMs: Long? = null
    }

    /** The RECORD value served to every reader. */
    public fun recordBytes(): ByteArray = recordBytes.copyOf()

    /** Host opened the GATT server; the service is being registered. */
    public fun begin() {
        check(phase == CollectorPhase.IDLE) { "begin() called in $phase" }
        setPhase(CollectorPhase.PREPARING)
    }

    /** The service-added callback succeeded. */
    public fun onServiceAdded() {
        if (phase != CollectorPhase.PREPARING) return
        startAdvertising()
    }

    public fun onAdvertisingStarted() {
        if (phase == CollectorPhase.PREPARING) setPhase(CollectorPhase.READY)
    }

    public fun onAdvertisingFailed(detail: String) {
        advertising = false
        if (!phase.isTerminal) failSession("advertise_failed:$detail")
    }

    public fun onServerFailed(detail: String) {
        if (!phase.isTerminal) failSession("server_failed:$detail")
    }

    public fun onConnected(peer: String) {
        if (phase.isTerminal) {
            io.disconnect(peer)
            return
        }
        peers.getOrPut(peer) { Peer(peer, clock()) }
    }

    public fun onDisconnected(peer: String) {
        peers.remove(peer)
        val c = claim ?: return
        if (c.peer == peer && (phase == CollectorPhase.CLAIMED || phase == CollectorPhase.AWAITING_ACK)) {
            failAttempt("peer_disconnected", null)
        }
    }

    public fun onMtuChanged(peer: String, mtu: Int) {
        val p = peer(peer) ?: return
        p.mtu = maxOf(FluxisBle.DEFAULT_MTU, mtu)
        p.reassembler.mtu = p.mtu
    }

    /** Value for an ATT read of RECORD at [offset], or `null` for an invalid offset. */
    public fun readRecord(peer: String, offset: Int): ByteArray? {
        peer(peer)
        if (offset < 0 || offset > recordBytes.size) return null
        return recordBytes.copyOfRange(offset, recordBytes.size)
    }

    public fun onSubscriptionChanged(peer: String, indicationsEnabled: Boolean) {
        peer(peer)?.subscribed = indicationsEnabled
    }

    /** A write on CONTROL. The host always answers the ATT write with success. */
    public fun onControlWrite(peer: String, value: ByteArray) {
        if (phase.isTerminal) return
        val p = peer(peer) ?: return
        if (p.closing) return
        val message = try {
            p.reassembler.push(value)
        } catch (e: FluxisBleProtocolException) {
            reject(p, CollectorErrorCode.MALFORMED, "frame:${e.code.wire}")
            return
        }
        p.lastFrameAtMs = if (p.reassembler.inProgress) clock() else null
        if (message == null) return
        when (message.type) {
            MessageType.START -> handleStart(p, message.payload)
            MessageType.ACK -> handleAck(p, message.payload)
            MessageType.ABORT -> {
                val reason = AbortReason.fromCode(message.payload.firstOrNull()?.toInt()?.and(0xFF) ?: 0xFF)
                if (claim?.peer == p.id) failAttempt("aborted:${reason.name.lowercase()}", null)
                closePeer(p)
            }
            else -> reject(p, CollectorErrorCode.MALFORMED, "unexpected_message")
        }
    }

    public fun onIndicationSent(peer: String, success: Boolean) {
        val c = claim ?: return
        if (c.peer != peer || c.pendingSinceMs == null) return
        c.pendingSinceMs = null
        if (!success) {
            failAttempt("indication_failed", null)
            return
        }
        c.next++
        if (c.next < c.frames.size) {
            sendNextFrame(c)
        } else {
            c.ackSinceMs = clock()
            setPhase(CollectorPhase.AWAITING_ACK)
        }
    }

    public fun stop() {
        if (finishAtMs != null) {
            finishAtMs = null
            teardown()
        }
        if (phase.isTerminal) return
        setPhase(CollectorPhase.STOPPED)
        teardown()
    }

    /** Runs every timeout that is due. */
    public fun onTick() {
        val now = clock()
        finishAtMs?.let {
            if (now >= it) {
                finishAtMs = null
                teardown()
            }
        }
        if (phase.isTerminal) return
        if (now >= expiresAtMs) {
            setPhase(CollectorPhase.EXPIRED, "ttl")
            teardown()
            return
        }
        val c = claim
        if (c != null) {
            c.pendingSinceMs?.let { if (now - it >= FluxisBle.T_FRAME_MS) failAttempt("indication_timeout", CollectorErrorCode.TIMEOUT) }
            c.ackSinceMs?.let { if (now - it >= FluxisBle.T_ACK_MS) failAttempt("ack_timeout", CollectorErrorCode.TIMEOUT) }
        }
        for (p in peers.values.toList()) {
            if (p.closing) continue
            val frameAt = p.lastFrameAtMs
            if (frameAt != null && now - frameAt >= FluxisBle.T_FRAME_MS) {
                reject(p, CollectorErrorCode.TIMEOUT, "frame_timeout")
            } else if (claim?.peer != p.id && now - p.connectedAtMs >= FluxisBle.T_IDLE_MS) {
                closePeer(p)
            }
        }
    }

    /** Earliest time at which [onTick] has work to do, or `null` if none is scheduled. */
    public fun nextDeadlineMs(): Long? {
        val candidates = mutableListOf<Long>()
        finishAtMs?.let { candidates += it }
        if (!phase.isTerminal) {
            candidates += expiresAtMs
            claim?.let { c ->
                c.pendingSinceMs?.let { candidates += it + FluxisBle.T_FRAME_MS }
                c.ackSinceMs?.let { candidates += it + FluxisBle.T_ACK_MS }
            }
            for (p in peers.values) {
                if (p.closing) continue
                p.lastFrameAtMs?.let { candidates += it + FluxisBle.T_FRAME_MS }
                if (claim?.peer != p.id) candidates += p.connectedAtMs + FluxisBle.T_IDLE_MS
            }
        }
        return candidates.minOrNull()
    }

    private fun handleStart(p: Peer, payload: ByteArray) {
        val c = claim
        if (c != null) {
            if (c.peer == p.id) reject(p, CollectorErrorCode.MALFORMED, "duplicate_start") else busy(p)
            return
        }
        if (phase != CollectorPhase.READY) {
            busy(p)
            return
        }
        val start = try {
            StartMessage.decode(payload)
        } catch (e: FluxisBleProtocolException) {
            val code = when (e.code) {
                ProtocolErrorCode.UNSUPPORTED_VERSION -> CollectorErrorCode.UNSUPPORTED_VERSION
                ProtocolErrorCode.INVALID_KEY -> CollectorErrorCode.INVALID_KEY
                else -> CollectorErrorCode.MALFORMED
            }
            reject(p, code, "start:${e.code.wire}")
            return
        }
        if (!start.sessionId.contentEquals(sessionIdBytes)) {
            reject(p, CollectorErrorCode.SESSION_MISMATCH, "session_mismatch")
            return
        }
        if (clock() >= expiresAtMs) {
            reject(p, CollectorErrorCode.EXPIRED, "expired")
            return
        }
        if (!p.subscribed) {
            closePeer(p)
            return
        }
        val frames = try {
            val keys = KeySchedule.derive(keyPair, start.payerPublicKey, recordBytes, payload)
            val nonce = ByteArray(FluxisBle.NONCE_BYTES).also { random.nextBytes(it) }
            Claim(p.id, keys, Framing.split(MessageType.DATA, DataMessage.seal(keys, nonce, envelope), p.mtu))
        } catch (e: Exception) {
            reject(p, CollectorErrorCode.INTERNAL, "seal_failed")
            return
        }
        claim = frames
        stopAdvertising()
        setPhase(CollectorPhase.CLAIMED)
        sendNextFrame(frames)
    }

    private fun handleAck(p: Peer, payload: ByteArray) {
        val c = claim
        // The payer can only ACK after receiving the last frame, so an ACK that overtakes the
        // stack's confirmation callback for that frame implies the confirmation.
        if (c != null && c.peer == p.id && phase == CollectorPhase.CLAIMED &&
            c.next == c.frames.size - 1 && c.pendingSinceMs != null
        ) {
            c.pendingSinceMs = null
            c.next++
            c.ackSinceMs = clock()
            setPhase(CollectorPhase.AWAITING_ACK)
        }
        if (c == null || c.peer != p.id || phase != CollectorPhase.AWAITING_ACK) {
            reject(p, CollectorErrorCode.MALFORMED, "unexpected_ack")
            return
        }
        if (!AckMessage.verify(c.keys, envelope, payload)) {
            failAttempt("bad_ack", CollectorErrorCode.BAD_ACK)
            return
        }
        claim = null
        setPhase(CollectorPhase.DELIVERED)
        finishAtMs = clock() + FluxisBle.T_LINGER_MS
    }

    private fun sendNextFrame(c: Claim) {
        c.pendingSinceMs = clock()
        io.indicate(c.peer, c.frames[c.next])
    }

    /** Sends ERROR (if subscribed) and drops [p]; ends the attempt if [p] holds the claim. */
    private fun reject(p: Peer, code: CollectorErrorCode, detail: String) {
        if (claim?.peer == p.id) {
            failAttempt(detail, code)
            return
        }
        sendControl(p, MessageType.ERROR, byteArrayOf(code.code.toByte()))
        closePeer(p)
    }

    private fun busy(p: Peer) {
        sendControl(p, MessageType.BUSY, ByteArray(0))
        closePeer(p)
    }

    private fun sendControl(p: Peer, type: MessageType, payload: ByteArray) {
        if (!p.subscribed || p.closing) return
        Framing.split(type, payload, p.mtu).forEach { io.indicate(p.id, it) }
    }

    private fun closePeer(p: Peer) {
        if (p.closing) return
        p.closing = true
        p.lastFrameAtMs = null
        io.disconnect(p.id)
    }

    private fun failAttempt(detail: String, code: CollectorErrorCode?) {
        val c = claim ?: return
        claim = null
        peers[c.peer]?.let { p ->
            if (code != null) sendControl(p, MessageType.ERROR, byteArrayOf(code.code.toByte()))
            closePeer(p)
        }
        if (config.rearmOnFailure && clock() < expiresAtMs) {
            setPhase(CollectorPhase.READY, detail)
            startAdvertising()
        } else {
            failSession(detail)
        }
    }

    private fun failSession(detail: String) {
        claim = null
        setPhase(CollectorPhase.FAILED, detail)
        teardown()
    }

    private fun teardown() {
        stopAdvertising()
        for (p in peers.values.toList()) closePeer(p)
        io.closeServer()
    }

    private fun startAdvertising() {
        if (advertising) return
        advertising = true
        io.startAdvertising()
    }

    private fun stopAdvertising() {
        if (!advertising) return
        advertising = false
        io.stopAdvertising()
    }

    private fun setPhase(next: CollectorPhase, detail: String? = null) {
        if (phase == next && detail == null) return
        phase = next
        io.onPhaseChanged(next, detail)
    }

    private fun peer(id: String): Peer? {
        if (phase.isTerminal) return null
        return peers.getOrPut(id) { Peer(id, clock()) }
    }
}
