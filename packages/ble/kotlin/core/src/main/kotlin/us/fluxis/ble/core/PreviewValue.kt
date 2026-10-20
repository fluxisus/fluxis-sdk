package us.fluxis.ble.core

import java.nio.ByteBuffer
import java.util.UUID

/** What a PREVIEW value carries (spec §4.2). */
public sealed class PreviewContent {
    /** The NASPIP token of the active sale, as core-api returned it. Opaque to the SDK. */
    public data class Naspip(public val token: String) : PreviewContent() {
        override fun toString(): String = "Naspip(${token.toByteArray(Charsets.UTF_8).size} bytes)"
    }

    /** Fallback when the token doesn't fit in 512 bytes: resolve `GET /public/checkout/pos/{posId}`. */
    public data class PosId(public val posId: UUID) : PreviewContent()

    public companion object {
        public const val KIND_NASPIP: Int = 0x01
        public const val KIND_POS_ID: Int = 0x02
    }
}

/**
 * The value of the PREVIEW characteristic: `version | sessionId | kind | content`, at most
 * 512 bytes (spec §4.2). Decoding is strict.
 */
public class PreviewValue(sessionId: ByteArray, public val content: PreviewContent) {
    private val sessionIdBytes = sessionId.copyOf()

    public val sessionId: ByteArray get() = sessionIdBytes.copyOf()

    public fun encode(): ByteArray {
        if (sessionIdBytes.size != FluxisBle.SESSION_ID_BYTES) {
            throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_SESSION_ID)
        }
        val w = ByteWriter().u8(FluxisBle.PROTOCOL_VERSION).bytes(sessionIdBytes)
        when (content) {
            is PreviewContent.PosId -> w.u8(PreviewContent.KIND_POS_ID).bytes(uuidBytes(content.posId))
            is PreviewContent.Naspip -> {
                val token = content.token.toByteArray(Charsets.UTF_8)
                if (token.isEmpty()) throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_TOKEN)
                if (token.size > FluxisBle.MAX_PREVIEW_TOKEN_BYTES) {
                    throw FluxisBleProtocolException(ProtocolErrorCode.PREVIEW_TOO_LARGE)
                }
                w.u8(PreviewContent.KIND_NASPIP).bytes(token)
            }
        }
        return w.toByteArray()
    }

    override fun equals(other: Any?): Boolean =
        other is PreviewValue && other.sessionIdBytes.contentEquals(sessionIdBytes) && other.content == content

    override fun hashCode(): Int = 31 * sessionIdBytes.contentHashCode() + content.hashCode()

    override fun toString(): String = "PreviewValue(session=${sessionIdBytes.toHex()}, content=$content)"

    public companion object {
        /**
         * The collector's choice (spec §4.2): the token when it fits, else [posId]. Throws
         * `preview_too_large` when the token doesn't fit and there is no [posId].
         */
        @JvmStatic
        public fun forToken(sessionId: ByteArray, token: String, posId: UUID?): PreviewValue {
            val size = token.toByteArray(Charsets.UTF_8).size
            if (size == 0) throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_TOKEN)
            if (size <= FluxisBle.MAX_PREVIEW_TOKEN_BYTES) return PreviewValue(sessionId, PreviewContent.Naspip(token))
            if (posId == null) throw FluxisBleProtocolException(ProtocolErrorCode.PREVIEW_TOO_LARGE)
            return PreviewValue(sessionId, PreviewContent.PosId(posId))
        }

        @JvmStatic
        public fun decode(data: ByteArray): PreviewValue {
            if (data.size > FluxisBle.MAX_ATTRIBUTE_BYTES) throw FluxisBleProtocolException(ProtocolErrorCode.PREVIEW_TOO_LARGE)
            val r = ByteReader(data)
            if (r.u8() != FluxisBle.PROTOCOL_VERSION) throw FluxisBleProtocolException(ProtocolErrorCode.UNSUPPORTED_VERSION)
            val sessionId = r.take(FluxisBle.SESSION_ID_BYTES)
            val kind = r.u8()
            val rest = r.take(r.remaining())
            val content = when (kind) {
                PreviewContent.KIND_NASPIP -> {
                    val token = if (rest.isEmpty()) null else decodeUtf8Strict(rest)
                    PreviewContent.Naspip(token ?: throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_TOKEN))
                }
                PreviewContent.KIND_POS_ID -> {
                    if (rest.size != FluxisBle.POS_ID_BYTES) throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_POS_ID)
                    val b = ByteBuffer.wrap(rest)
                    PreviewContent.PosId(UUID(b.long, b.long))
                }
                else -> throw FluxisBleProtocolException(ProtocolErrorCode.UNSUPPORTED_CONTENT)
            }
            return PreviewValue(sessionId, content)
        }

        private fun uuidBytes(u: UUID): ByteArray =
            ByteBuffer.allocate(16).putLong(u.mostSignificantBits).putLong(u.leastSignificantBits).array()
    }
}
