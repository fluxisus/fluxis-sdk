package us.fluxis.ble.core

import java.security.SecureRandom

/** What the payer should do after an indication on DATA. */
public sealed class PayerEvent {
    /** More frames are expected. */
    public object Incomplete : PayerEvent()

    /** Token decrypted. Write [ackFrames] to CONTROL, then hand [token] to the host app. */
    public class Delivered(public val token: String, public val ackFrames: List<ByteArray>) : PayerEvent()

    /** The collector is locked to another payer. */
    public object Busy : PayerEvent()

    /** The collector sent ERROR. [rawCode] keeps unknown codes visible. */
    public class Rejected(public val code: CollectorErrorCode, public val rawCode: Int) : PayerEvent()

    /** Local failure. Write [abortFrames] (best effort), then disconnect. */
    public class Failed(
        public val reason: AbortReason,
        public val cause: FluxisBleProtocolException,
        public val abortFrames: List<ByteArray>,
    ) : PayerEvent()
}

/**
 * Payer side of one delivery attempt, independent of any Bluetooth API: feed it the RECORD
 * bytes and the negotiated MTU, write [startFrames] to CONTROL, then pass every DATA indication
 * to [onIndication]. Use a new instance (and so a new ephemeral key) for each attempt.
 */
public class PayerSession @JvmOverloads constructor(
    recordBytes: ByteArray,
    public val mtu: Int,
    private val keyPair: P256KeyPair = P256.generate(SecureRandom()),
) {
    private val recordRaw = recordBytes.copyOf()
    public val record: DiscoveryRecord = DiscoveryRecord.decode(recordRaw)
    private val startPayload = StartMessage(record.sessionId, keyPair.publicKey).encode()
    private val reassembler = Reassembler(Direction.TO_PAYER, mtu)
    private var finished = false

    init {
        FluxisBle.maxFramePayload(mtu)
    }

    public val startFrames: List<ByteArray> = Framing.split(MessageType.START, startPayload, mtu)

    public fun abortFrames(reason: AbortReason): List<ByteArray> =
        Framing.split(MessageType.ABORT, byteArrayOf(reason.code.toByte()), mtu)

    public fun onIndication(frame: ByteArray): PayerEvent {
        if (finished) return fail(AbortReason.PROTOCOL_ERROR, FluxisBleProtocolException(ProtocolErrorCode.UNEXPECTED_TYPE))
        val message = try {
            reassembler.push(frame) ?: return PayerEvent.Incomplete
        } catch (e: FluxisBleProtocolException) {
            return fail(AbortReason.PROTOCOL_ERROR, e)
        }
        finished = true
        return when (message.type) {
            MessageType.BUSY -> PayerEvent.Busy
            MessageType.ERROR -> {
                val raw = message.payload.firstOrNull()?.toInt()?.and(0xFF) ?: CollectorErrorCode.INTERNAL.code
                PayerEvent.Rejected(CollectorErrorCode.fromCode(raw), raw)
            }
            MessageType.DATA -> openData(message.payload)
            else -> fail(AbortReason.PROTOCOL_ERROR, FluxisBleProtocolException(ProtocolErrorCode.UNEXPECTED_TYPE))
        }
    }

    private fun openData(data: ByteArray): PayerEvent {
        return try {
            val keys = KeySchedule.derive(keyPair, record.collectorPublicKey, recordRaw, startPayload)
            val envelope = DataMessage.open(keys, data)
            val token = Envelope.decode(envelope)
            val ack = AckMessage.compute(keys, envelope)
            PayerEvent.Delivered(token, Framing.split(MessageType.ACK, ack, mtu))
        } catch (e: FluxisBleProtocolException) {
            val reason = when (e.code) {
                ProtocolErrorCode.DECRYPT_FAILED -> AbortReason.DECRYPT_FAILED
                ProtocolErrorCode.UNSUPPORTED_CONTENT -> AbortReason.UNSUPPORTED_CONTENT
                else -> AbortReason.PROTOCOL_ERROR
            }
            fail(reason, e)
        }
    }

    private fun fail(reason: AbortReason, cause: FluxisBleProtocolException): PayerEvent {
        finished = true
        return PayerEvent.Failed(reason, cause, abortFrames(reason))
    }
}
