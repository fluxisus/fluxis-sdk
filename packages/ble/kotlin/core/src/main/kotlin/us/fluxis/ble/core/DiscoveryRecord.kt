package us.fluxis.ble.core

/**
 * The value of the RECORD characteristic (spec §4.1): unauthenticated hints that a payer can
 * show in a picker of nearby POS. [sessionId] ties it to the PREVIEW value of the same session.
 *
 * [amount] and [displayName] are informational only: wallets must show the merchant and amount
 * that the Fluxis API returns for the preview.
 */
public class DiscoveryRecord(
    sessionId: ByteArray,
    public val amount: FluxisAmount?,
    public val displayName: String,
) {
    private val sessionIdBytes = sessionId.copyOf()

    public val sessionId: ByteArray get() = sessionIdBytes.copyOf()

    public fun encode(): ByteArray {
        if (sessionIdBytes.size != FluxisBle.SESSION_ID_BYTES) {
            throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_SESSION_ID)
        }
        val name = displayName.toByteArray(Charsets.UTF_8)
        if (name.size !in 1..FluxisBle.MAX_DISPLAY_NAME_BYTES) {
            throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_DISPLAY_NAME)
        }
        val w = ByteWriter()
            .u8(FluxisBle.PROTOCOL_VERSION)
            .u8(if (amount != null) FLAG_AMOUNT_PRESENT else 0)
            .bytes(sessionIdBytes)
        if (amount != null) {
            val currency = amount.currency?.toByteArray(Charsets.US_ASCII) ?: ByteArray(0)
            w.u64(amount.minorUnits).u8(amount.scale).u8(currency.size).bytes(currency)
        }
        return w.u8(name.size).bytes(name).toByteArray()
    }

    override fun equals(other: Any?): Boolean =
        other is DiscoveryRecord &&
            other.sessionIdBytes.contentEquals(sessionIdBytes) &&
            other.amount == amount &&
            other.displayName == displayName

    override fun hashCode(): Int = sessionIdBytes.contentHashCode()

    override fun toString(): String =
        "DiscoveryRecord(name=$displayName, amount=$amount, session=${sessionIdBytes.toHex()})"

    public companion object {
        public const val FLAG_AMOUNT_PRESENT: Int = 0x01

        /** Strict decode: rejects other versions, truncation, trailing bytes and out-of-range fields. */
        @JvmStatic
        public fun decode(data: ByteArray): DiscoveryRecord {
            val r = ByteReader(data)
            if (r.u8() != FluxisBle.PROTOCOL_VERSION) throw FluxisBleProtocolException(ProtocolErrorCode.UNSUPPORTED_VERSION)
            val flags = r.u8()
            val sessionId = r.take(FluxisBle.SESSION_ID_BYTES)
            var amount: FluxisAmount? = null
            if (flags and FLAG_AMOUNT_PRESENT != 0) {
                val minor = r.u64()
                val scale = r.u8()
                val currencyLen = r.u8()
                if (currencyLen > FluxisBle.MAX_CURRENCY_CHARS) {
                    throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_CURRENCY)
                }
                val currencyBytes = r.take(currencyLen)
                if (currencyBytes.any { it < 0 }) throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_CURRENCY)
                val currency = String(currencyBytes, Charsets.US_ASCII)
                amount = FluxisAmount(minor, scale, currency.ifEmpty { null })
            }
            val nameLen = r.u8()
            if (nameLen !in 1..FluxisBle.MAX_DISPLAY_NAME_BYTES) {
                throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_DISPLAY_NAME)
            }
            val name = decodeUtf8Strict(r.take(nameLen))
                ?: throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_DISPLAY_NAME)
            if (r.remaining() != 0) throw FluxisBleProtocolException(ProtocolErrorCode.TRAILING_BYTES)
            return DiscoveryRecord(sessionId, amount, name)
        }

        /**
         * Trims [name] and cuts it to at most 64 UTF-8 bytes on a code point boundary, so a long
         * merchant name never makes `start()` fail. Throws if nothing is left.
         */
        @JvmStatic
        public fun fitDisplayName(name: String): String {
            val trimmed = name.trim()
            val out = StringBuilder()
            var bytes = 0
            var i = 0
            while (i < trimmed.length) {
                val cp = trimmed.codePointAt(i)
                val len = String(Character.toChars(cp)).toByteArray(Charsets.UTF_8).size
                if (bytes + len > FluxisBle.MAX_DISPLAY_NAME_BYTES) break
                out.appendCodePoint(cp)
                bytes += len
                i += Character.charCount(cp)
            }
            if (out.isEmpty()) throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_DISPLAY_NAME)
            return out.toString()
        }
    }
}
