package us.fluxis.ble.core

public enum class MessageType(public val code: Int, public val direction: Direction) {
    START(0x01, Direction.TO_COLLECTOR),
    DATA(0x02, Direction.TO_PAYER),
    ACK(0x03, Direction.TO_COLLECTOR),
    ABORT(0x04, Direction.TO_COLLECTOR),
    BUSY(0x7E, Direction.TO_PAYER),
    ERROR(0x7F, Direction.TO_PAYER),
    ;

    public companion object {
        public fun fromCode(code: Int): MessageType? = entries.firstOrNull { it.code == code }
    }
}

public enum class Direction { TO_COLLECTOR, TO_PAYER }

public class Message(public val type: MessageType, public val payload: ByteArray)

/** Splits messages into `type | seq | total | payload` frames (spec §4). */
public object Framing {
    @JvmStatic
    public fun split(type: MessageType, payload: ByteArray, mtu: Int): List<ByteArray> {
        if (payload.size > FluxisBle.MAX_MESSAGE_BYTES) throw FluxisBleProtocolException(ProtocolErrorCode.MESSAGE_TOO_LARGE)
        val chunk = FluxisBle.maxFramePayload(mtu)
        val count = maxOf(1, (payload.size + chunk - 1) / chunk)
        if (count > FluxisBle.MAX_FRAMES) throw FluxisBleProtocolException(ProtocolErrorCode.TOO_MANY_FRAMES)
        return List(count) { i ->
            val from = i * chunk
            val to = minOf(payload.size, from + chunk)
            byteArrayOf(type.code.toByte(), i.toByte(), count.toByte()) + payload.copyOfRange(from, to)
        }
    }
}

/**
 * Reassembles frames received on one connection in one [direction]. Any violation throws
 * [FluxisBleProtocolException] and resets the buffer; per spec the caller then drops the link.
 *
 * [mtu] enables the `frame ≤ MTU − 3` check; pass `null` when the receiver can't know the MTU.
 */
public class Reassembler(private val direction: Direction, public var mtu: Int? = null) {
    private var type: MessageType? = null
    private var total = 0
    private var nextSeq = 0
    private val buffer = java.io.ByteArrayOutputStream()

    /** True while a multi-frame message is partially received. */
    public val inProgress: Boolean get() = type != null

    /** Returns the completed message, or `null` if more frames are expected. */
    public fun push(frame: ByteArray): Message? = try {
        pushInternal(frame)
    } catch (e: FluxisBleProtocolException) {
        reset()
        throw e
    }

    public fun reset() {
        type = null
        total = 0
        nextSeq = 0
        buffer.reset()
    }

    private fun pushInternal(frame: ByteArray): Message? {
        if (frame.size < FluxisBle.FRAME_HEADER_BYTES) throw err(ProtocolErrorCode.FRAME_TOO_SHORT)
        mtu?.let { if (frame.size > it - 3) throw err(ProtocolErrorCode.FRAME_TOO_LONG) }
        val t = MessageType.fromCode(frame[0].toInt() and 0xFF)
        val seq = frame[1].toInt() and 0xFF
        val tot = frame[2].toInt() and 0xFF
        val payloadSize = frame.size - FluxisBle.FRAME_HEADER_BYTES
        if (t == null || t.direction != direction) throw err(ProtocolErrorCode.UNEXPECTED_TYPE)
        if (tot == 0 || seq >= tot) throw err(ProtocolErrorCode.BAD_SEQUENCE)
        val current = type
        if (current == null) {
            if (seq != 0) throw err(ProtocolErrorCode.BAD_SEQUENCE)
            type = t
            total = tot
        } else if (seq == 0) {
            throw err(ProtocolErrorCode.INTERLEAVED_MESSAGE)
        } else if (t != current || tot != total) {
            throw err(ProtocolErrorCode.INCONSISTENT_FRAME)
        }
        if (seq != nextSeq) throw err(ProtocolErrorCode.BAD_SEQUENCE)
        if (payloadSize == 0 && tot > 1) throw err(ProtocolErrorCode.EMPTY_FRAME)
        if (buffer.size() + payloadSize > FluxisBle.MAX_MESSAGE_BYTES) throw err(ProtocolErrorCode.MESSAGE_TOO_LARGE)
        buffer.write(frame, FluxisBle.FRAME_HEADER_BYTES, payloadSize)
        nextSeq++
        if (nextSeq < total) return null
        val message = Message(type!!, buffer.toByteArray())
        reset()
        return message
    }

    private fun err(code: ProtocolErrorCode) = FluxisBleProtocolException(code)
}
