package us.fluxis.ble.core

import java.util.UUID

/** Wire constants of the Fluxis BLE Protocol v3, preview only (docs/ble-protocol.md). */
public object FluxisBle {
    public const val PROTOCOL_VERSION: Int = 3

    public val SERVICE_UUID: UUID = UUID.fromString("f1b10100-6ff9-4bf4-a699-f9b7aa31119b")
    /** Unauthenticated hints: sessionId, amount, display name (spec §4.1). */
    public val RECORD_UUID: UUID = UUID.fromString("f1b10101-6ff9-4bf4-a699-f9b7aa31119b")
    /** The active sale: NASPIP token, or the POS id as a fallback (spec §4.2). */
    public val PREVIEW_UUID: UUID = UUID.fromString("f1b10104-6ff9-4bf4-a699-f9b7aa31119b")

    public const val DEFAULT_MTU: Int = 23

    /** ATT maximum attribute value length; no Fluxis value is longer. */
    public const val MAX_ATTRIBUTE_BYTES: Int = 512
    public const val SESSION_ID_BYTES: Int = 16
    public const val POS_ID_BYTES: Int = 16
    public const val PREVIEW_HEADER_BYTES: Int = 1 + SESSION_ID_BYTES + 1

    /** Largest NASPIP token (UTF-8 bytes) carried in PREVIEW; longer tokens use the POS id. */
    public const val MAX_PREVIEW_TOKEN_BYTES: Int = MAX_ATTRIBUTE_BYTES - PREVIEW_HEADER_BYTES

    public const val MAX_DISPLAY_NAME_BYTES: Int = 64
    public const val MAX_CURRENCY_CHARS: Int = 12
    public const val MAX_SCALE: Int = 18
    public const val MAX_RECORD_BYTES: Int = 1 + 1 + SESSION_ID_BYTES + 8 + 1 + 1 + MAX_CURRENCY_CHARS + 1 + MAX_DISPLAY_NAME_BYTES

    /** The collector disconnects a peer this long after it connected. */
    public const val T_IDLE_MS: Long = 15_000
}
