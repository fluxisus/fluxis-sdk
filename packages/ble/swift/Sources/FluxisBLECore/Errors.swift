import Foundation

/// Validation failures. Raw values match the error strings in the shared test vectors, so
/// every SDK reports the same code for the same malformed input.
public enum FluxisBLEProtocolError: String, Error, CaseIterable, CustomStringConvertible {
    case invalidDecimal = "invalid_decimal"
    case scaleOutOfRange = "scale_out_of_range"
    case amountOutOfRange = "amount_out_of_range"
    case invalidCurrency = "invalid_currency"
    case unsupportedVersion = "unsupported_version"
    case truncated = "truncated"
    case trailingBytes = "trailing_bytes"
    case invalidKey = "invalid_key"
    case invalidDisplayName = "invalid_display_name"
    case invalidSessionId = "invalid_session_id"
    case expiresAtOutOfRange = "expires_at_out_of_range"
    case frameTooShort = "frame_too_short"
    case frameTooLong = "frame_too_long"
    case unexpectedType = "unexpected_type"
    case badSequence = "bad_sequence"
    case interleavedMessage = "interleaved_message"
    case inconsistentFrame = "inconsistent_frame"
    case emptyFrame = "empty_frame"
    case messageTooLarge = "message_too_large"
    case tooManyFrames = "too_many_frames"
    case mtuTooSmall = "mtu_too_small"
    case malformed = "malformed"
    case emptyToken = "empty_token"
    case invalidNonce = "invalid_nonce"
    case decryptFailed = "decrypt_failed"
    case unsupportedContent = "unsupported_content"

    public var description: String { rawValue }
}

/// ERROR codes sent by the collector to the payer (spec §5.7).
public enum CollectorErrorCode: UInt8, CaseIterable, Sendable {
    case malformed = 0x01
    case unsupportedVersion = 0x02
    case sessionMismatch = 0x03
    case expired = 0x04
    case invalidKey = 0x05
    case badAck = 0x06
    case timeout = 0x07
    case `internal` = 0x08

    /// Unknown codes map to `.internal`, as the spec requires.
    public static func from(_ raw: UInt8) -> CollectorErrorCode { CollectorErrorCode(rawValue: raw) ?? .internal }

    /// snake_case name used by the spec and the test vectors.
    public var wireName: String {
        switch self {
        case .malformed: return "malformed"
        case .unsupportedVersion: return "unsupported_version"
        case .sessionMismatch: return "session_mismatch"
        case .expired: return "expired"
        case .invalidKey: return "invalid_key"
        case .badAck: return "bad_ack"
        case .timeout: return "timeout"
        case .internal: return "internal"
        }
    }
}

/// ABORT reasons sent by the payer to the collector (spec §5.7).
public enum AbortReason: UInt8, CaseIterable, Sendable {
    case userCancelled = 0x00
    case decryptFailed = 0x01
    case unsupportedContent = 0x02
    case protocolError = 0x03
    case timeout = 0x04
    case other = 0xFF

    public static func from(_ raw: UInt8) -> AbortReason { AbortReason(rawValue: raw) ?? .other }

    public var wireName: String {
        switch self {
        case .userCancelled: return "user_cancelled"
        case .decryptFailed: return "decrypt_failed"
        case .unsupportedContent: return "unsupported_content"
        case .protocolError: return "protocol_error"
        case .timeout: return "timeout"
        case .other: return "other"
        }
    }
}

/// Errors surfaced to wallet apps by the payer flow.
public struct FluxisBLEPayerError: Error, Sendable, CustomStringConvertible {
    public enum Reason: String, Sendable {
        case bluetoothUnavailable = "bluetooth_unavailable"
        case bluetoothOff = "bluetooth_off"
        case unauthorized = "unauthorized"
        case notFound = "not_found"
        case connectionFailed = "connection_failed"
        /// The POS is serving another payer; retrying shortly usually works.
        case busy = "busy"
        /// The POS answered with ERROR; see `collectorError`.
        case rejected = "rejected"
        case expired = "expired"
        case protocolError = "protocol_error"
        case decryptFailed = "decrypt_failed"
        case timeout = "timeout"
        case cancelled = "cancelled"
    }

    public let reason: Reason
    public let message: String
    public let collectorError: CollectorErrorCode?

    public init(_ reason: Reason, _ message: String, collectorError: CollectorErrorCode? = nil) {
        self.reason = reason
        self.message = message
        self.collectorError = collectorError
    }

    public var description: String { "\(reason.rawValue): \(message)" }
}
