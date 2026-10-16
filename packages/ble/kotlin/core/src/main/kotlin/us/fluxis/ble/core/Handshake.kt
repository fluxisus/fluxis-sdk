package us.fluxis.ble.core

/** START payload: `version | sessionId | payerPublicKey` (spec §5.3). */
public class StartMessage(sessionId: ByteArray, payerPublicKey: ByteArray) {
    private val sid = sessionId.copyOf()
    private val pub = payerPublicKey.copyOf()
    public val sessionId: ByteArray get() = sid.copyOf()
    public val payerPublicKey: ByteArray get() = pub.copyOf()

    public fun encode(): ByteArray {
        if (sid.size != FluxisBle.SESSION_ID_BYTES) throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_SESSION_ID)
        P256.validatePublicKey(pub)
        return byteArrayOf(FluxisBle.PROTOCOL_VERSION.toByte()) + sid + pub
    }

    public companion object {
        @JvmStatic
        public fun decode(payload: ByteArray): StartMessage {
            if (payload.size != FluxisBle.START_BYTES) throw FluxisBleProtocolException(ProtocolErrorCode.MALFORMED)
            if (payload[0].toInt() != FluxisBle.PROTOCOL_VERSION) {
                throw FluxisBleProtocolException(ProtocolErrorCode.UNSUPPORTED_VERSION)
            }
            val pub = payload.copyOfRange(1 + FluxisBle.SESSION_ID_BYTES, payload.size)
            P256.validatePublicKey(pub)
            return StartMessage(payload.copyOfRange(1, 1 + FluxisBle.SESSION_ID_BYTES), pub)
        }
    }
}

/** Keys and transcript hash for one (session, START) pair (spec §5.4). */
public class SessionKeys internal constructor(
    public val sharedSecret: ByteArray,
    public val transcriptHash: ByteArray,
    public val prk: ByteArray,
    public val dataKey: ByteArray,
    public val ackKey: ByteArray,
)

public object KeySchedule {
    private val LABEL_TRANSCRIPT = "fluxis-ble/3/transcript".toByteArray(Charsets.US_ASCII)
    private val LABEL_DATA = "fluxis-ble/3/data".toByteArray(Charsets.US_ASCII)
    private val LABEL_ACK = "fluxis-ble/3/ack".toByteArray(Charsets.US_ASCII)

    /** [record] and [start] are the exact wire bytes (RECORD value and START payload). */
    @JvmStatic
    public fun derive(own: P256KeyPair, peerPublicKey: ByteArray, record: ByteArray, start: ByteArray): SessionKeys {
        val z = P256.ecdh(own, peerPublicKey)
        val th = Primitives.sha256(LABEL_TRANSCRIPT, record, start)
        val prk = Primitives.hkdfExtract(th, z)
        return SessionKeys(
            sharedSecret = z,
            transcriptHash = th,
            prk = prk,
            dataKey = Primitives.hkdfExpand(prk, LABEL_DATA, 32),
            ackKey = Primitives.hkdfExpand(prk, LABEL_ACK, 32),
        )
    }
}

/** Plaintext carried in DATA: `contentType | content` (spec §5.5). */
public object Envelope {
    public const val CONTENT_NASPIP: Int = 0x01

    @JvmStatic
    public fun encodeNaspip(token: String): ByteArray {
        val content = token.toByteArray(Charsets.UTF_8)
        if (content.isEmpty()) throw FluxisBleProtocolException(ProtocolErrorCode.EMPTY_TOKEN)
        if (content.size > FluxisBle.MAX_TOKEN_BYTES) throw FluxisBleProtocolException(ProtocolErrorCode.MESSAGE_TOO_LARGE)
        return byteArrayOf(CONTENT_NASPIP.toByte()) + content
    }

    /** Returns the NASPIP token. */
    @JvmStatic
    public fun decode(envelope: ByteArray): String {
        if (envelope.size < 2) throw FluxisBleProtocolException(ProtocolErrorCode.MALFORMED)
        if (envelope[0].toInt() != CONTENT_NASPIP) throw FluxisBleProtocolException(ProtocolErrorCode.UNSUPPORTED_CONTENT)
        return decodeUtf8Strict(envelope.copyOfRange(1, envelope.size))
            ?: throw FluxisBleProtocolException(ProtocolErrorCode.MALFORMED)
    }
}

/** DATA payload: `nonce | AES-256-GCM(envelope)`, AAD = transcript hash (spec §5.5). */
public object DataMessage {
    @JvmStatic
    public fun seal(keys: SessionKeys, nonce: ByteArray, envelope: ByteArray): ByteArray {
        if (nonce.size != FluxisBle.NONCE_BYTES) throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_NONCE)
        return nonce + Primitives.aesGcmSeal(keys.dataKey, nonce, envelope, keys.transcriptHash)
    }

    /** Returns the envelope. */
    @JvmStatic
    public fun open(keys: SessionKeys, data: ByteArray): ByteArray {
        if (data.size < FluxisBle.NONCE_BYTES + FluxisBle.TAG_BYTES + 2) {
            throw FluxisBleProtocolException(ProtocolErrorCode.MALFORMED)
        }
        val nonce = data.copyOfRange(0, FluxisBle.NONCE_BYTES)
        val body = data.copyOfRange(FluxisBle.NONCE_BYTES, data.size)
        return Primitives.aesGcmOpen(keys.dataKey, nonce, body, keys.transcriptHash)
            ?: throw FluxisBleProtocolException(ProtocolErrorCode.DECRYPT_FAILED)
    }
}

/** ACK payload: `HMAC-SHA256(ackKey, TH || SHA-256(envelope))[0..16]` (spec §5.6). */
public object AckMessage {
    @JvmStatic
    public fun compute(keys: SessionKeys, envelope: ByteArray): ByteArray =
        Primitives.hmacSha256(keys.ackKey, keys.transcriptHash, Primitives.sha256(envelope))
            .copyOf(FluxisBle.ACK_BYTES)

    /** Constant-time verification. */
    @JvmStatic
    public fun verify(keys: SessionKeys, envelope: ByteArray, ack: ByteArray): Boolean =
        ack.size == FluxisBle.ACK_BYTES && Primitives.constantTimeEquals(compute(keys, envelope), ack)
}
