package us.fluxis.ble.core

/**
 * Validation failures. [wire] matches the error strings in the shared test vectors, so every
 * SDK reports the same code for the same malformed input.
 */
public enum class ProtocolErrorCode(public val wire: String) {
    INVALID_DECIMAL("invalid_decimal"),
    SCALE_OUT_OF_RANGE("scale_out_of_range"),
    AMOUNT_OUT_OF_RANGE("amount_out_of_range"),
    INVALID_CURRENCY("invalid_currency"),
    UNSUPPORTED_VERSION("unsupported_version"),
    TRUNCATED("truncated"),
    TRAILING_BYTES("trailing_bytes"),
    INVALID_KEY("invalid_key"),
    INVALID_DISPLAY_NAME("invalid_display_name"),
    INVALID_SESSION_ID("invalid_session_id"),
    EXPIRES_AT_OUT_OF_RANGE("expires_at_out_of_range"),
    FRAME_TOO_SHORT("frame_too_short"),
    FRAME_TOO_LONG("frame_too_long"),
    UNEXPECTED_TYPE("unexpected_type"),
    BAD_SEQUENCE("bad_sequence"),
    INTERLEAVED_MESSAGE("interleaved_message"),
    INCONSISTENT_FRAME("inconsistent_frame"),
    EMPTY_FRAME("empty_frame"),
    MESSAGE_TOO_LARGE("message_too_large"),
    TOO_MANY_FRAMES("too_many_frames"),
    MTU_TOO_SMALL("mtu_too_small"),
    MALFORMED("malformed"),
    EMPTY_TOKEN("empty_token"),
    INVALID_NONCE("invalid_nonce"),
    DECRYPT_FAILED("decrypt_failed"),
    UNSUPPORTED_CONTENT("unsupported_content"),
}

public class FluxisBleProtocolException(
    public val code: ProtocolErrorCode,
    message: String? = null,
    cause: Throwable? = null,
) : Exception(message?.let { "${code.wire}: $it" } ?: code.wire, cause)

/** ERROR codes sent by the collector to the payer (spec §5.7). */
public enum class CollectorErrorCode(public val code: Int) {
    MALFORMED(0x01),
    UNSUPPORTED_VERSION(0x02),
    SESSION_MISMATCH(0x03),
    EXPIRED(0x04),
    INVALID_KEY(0x05),
    BAD_ACK(0x06),
    TIMEOUT(0x07),
    INTERNAL(0x08),
    ;

    public companion object {
        /** Unknown codes map to [INTERNAL], as the spec requires. */
        public fun fromCode(code: Int): CollectorErrorCode = entries.firstOrNull { it.code == code } ?: INTERNAL
    }
}

/** ABORT reasons sent by the payer to the collector (spec §5.7). */
public enum class AbortReason(public val code: Int) {
    USER_CANCELLED(0x00),
    DECRYPT_FAILED(0x01),
    UNSUPPORTED_CONTENT(0x02),
    PROTOCOL_ERROR(0x03),
    TIMEOUT(0x04),
    OTHER(0xFF),
    ;

    public companion object {
        public fun fromCode(code: Int): AbortReason = entries.firstOrNull { it.code == code } ?: OTHER
    }
}
