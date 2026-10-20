import Foundation

/// Wire constants of the Fluxis BLE Protocol v3, preview only (docs/ble-protocol.md).
public enum FluxisBLEConstants {
    /// SDK version, bumped by release-please.
    public static let sdkVersion = "0.0.0" // x-release-please-version

    public static let protocolVersion: UInt8 = 3

    public static let serviceUUID = UUID(uuidString: "f1b10100-6ff9-4bf4-a699-f9b7aa31119b")!
    /// Unauthenticated hints: sessionId, amount, display name (spec §4.1).
    public static let recordUUID = UUID(uuidString: "f1b10101-6ff9-4bf4-a699-f9b7aa31119b")!
    /// The active sale: NASPIP token, or the POS id as a fallback (spec §4.2).
    public static let previewUUID = UUID(uuidString: "f1b10104-6ff9-4bf4-a699-f9b7aa31119b")!

    public static let defaultMTU = 23

    /// ATT maximum attribute value length; no Fluxis value is longer.
    public static let maxAttributeBytes = 512
    public static let sessionIdBytes = 16
    public static let posIdBytes = 16
    public static let previewHeaderBytes = 1 + sessionIdBytes + 1
    /// Largest NASPIP token (UTF-8 bytes) carried in PREVIEW; longer tokens use the POS id.
    public static let maxPreviewTokenBytes = maxAttributeBytes - previewHeaderBytes

    public static let maxDisplayNameBytes = 64
    public static let maxCurrencyChars = 12
    public static let maxScale = 18
    public static let maxRecordBytes = 1 + 1 + sessionIdBytes + 8 + 1 + 1 + maxCurrencyChars + 1 + maxDisplayNameBytes

    /// The collector disconnects a peer this long after it connected.
    public static let idleTimeout: TimeInterval = 15
    /// Default budget for connect + discovery + both reads on the payer.
    public static let defaultReadTimeout: TimeInterval = 6
}
