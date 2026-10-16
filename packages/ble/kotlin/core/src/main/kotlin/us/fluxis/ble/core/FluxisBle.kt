package us.fluxis.ble.core

import java.util.UUID

/** Wire constants of the Fluxis BLE Handoff Protocol v3 (docs/ble-protocol.md). */
public object FluxisBle {
    public const val PROTOCOL_VERSION: Int = 3

    public val SERVICE_UUID: UUID = UUID.fromString("f1b10100-6ff9-4bf4-a699-f9b7aa31119b")
    public val RECORD_UUID: UUID = UUID.fromString("f1b10101-6ff9-4bf4-a699-f9b7aa31119b")
    public val CONTROL_UUID: UUID = UUID.fromString("f1b10102-6ff9-4bf4-a699-f9b7aa31119b")
    public val DATA_UUID: UUID = UUID.fromString("f1b10103-6ff9-4bf4-a699-f9b7aa31119b")
    public val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    public const val DEFAULT_MTU: Int = 23
    public const val FRAME_HEADER_BYTES: Int = 3
    public const val MAX_MESSAGE_BYTES: Int = 4096
    public const val MAX_FRAMES: Int = 255

    public const val SESSION_ID_BYTES: Int = 16
    public const val PUBLIC_KEY_BYTES: Int = 65
    public const val NONCE_BYTES: Int = 12
    public const val TAG_BYTES: Int = 16
    public const val ACK_BYTES: Int = 16
    public const val START_BYTES: Int = 1 + SESSION_ID_BYTES + PUBLIC_KEY_BYTES

    public const val MAX_DISPLAY_NAME_BYTES: Int = 64
    public const val MAX_CURRENCY_CHARS: Int = 12
    public const val MAX_SCALE: Int = 18

    /** Largest NASPIP token (UTF-8 bytes) that fits in one DATA message. */
    public const val MAX_TOKEN_BYTES: Int = MAX_MESSAGE_BYTES - NONCE_BYTES - TAG_BYTES - 1

    public const val DEFAULT_TTL_SECONDS: Int = 120
    public const val MAX_TTL_SECONDS: Int = 300

    public const val T_IDLE_MS: Long = 15_000
    public const val T_FRAME_MS: Long = 3_000
    public const val T_ACK_MS: Long = 5_000
    public const val T_LINGER_MS: Long = 250
    public const val T_FIRST_RESPONSE_MS: Long = 5_000

    /** Payers hide records that expired more than this long ago by their own clock. */
    public const val EXPIRY_TOLERANCE_SECONDS: Long = 60

    /** Largest frame payload for an ATT MTU: frame = MTU − 3, payload = frame − 3. */
    public fun maxFramePayload(mtu: Int): Int {
        if (mtu < DEFAULT_MTU) throw FluxisBleProtocolException(ProtocolErrorCode.MTU_TOO_SMALL)
        return mtu - 3 - FRAME_HEADER_BYTES
    }
}
