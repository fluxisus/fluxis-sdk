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
    INVALID_DISPLAY_NAME("invalid_display_name"),
    INVALID_SESSION_ID("invalid_session_id"),
    PREVIEW_TOO_LARGE("preview_too_large"),
    UNSUPPORTED_CONTENT("unsupported_content"),
    INVALID_TOKEN("invalid_token"),
    INVALID_POS_ID("invalid_pos_id"),
}

public class FluxisBleProtocolException(
    public val code: ProtocolErrorCode,
    message: String? = null,
    cause: Throwable? = null,
) : Exception(message?.let { "${code.wire}: $it" } ?: code.wire, cause)
