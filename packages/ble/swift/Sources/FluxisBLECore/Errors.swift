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
    case invalidDisplayName = "invalid_display_name"
    case invalidSessionId = "invalid_session_id"
    case previewTooLarge = "preview_too_large"
    case unsupportedContent = "unsupported_content"
    case invalidToken = "invalid_token"
    case invalidPosId = "invalid_pos_id"

    public var description: String { rawValue }
}

/// Errors surfaced to wallet apps by the payer.
public struct FluxisBLEPayerError: Error, Sendable, CustomStringConvertible {
    public enum Reason: String, Sendable {
        case bluetoothUnavailable = "bluetooth_unavailable"
        case bluetoothOff = "bluetooth_off"
        case unauthorized = "unauthorized"
        case notFound = "not_found"
        case connectionFailed = "connection_failed"
        /// The collector has no PREVIEW characteristic.
        case notSupported = "not_supported"
        /// RECORD or PREVIEW failed strict decoding, or their session ids differ.
        case invalid = "invalid"
        case timeout = "timeout"
        case cancelled = "cancelled"
    }

    public let reason: Reason
    public let message: String
    /// Set when `reason` is `.invalid` because of a wire-format error.
    public let protocolError: FluxisBLEProtocolError?

    public init(_ reason: Reason, _ message: String, protocolError: FluxisBLEProtocolError? = nil) {
        self.reason = reason
        self.message = message
        self.protocolError = protocolError
    }

    public var description: String { "\(reason.rawValue): \(message)" }
}
