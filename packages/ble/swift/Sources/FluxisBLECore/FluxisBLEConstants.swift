import Foundation

/// Wire constants of the Fluxis BLE Handoff Protocol v3 (docs/ble-protocol.md).
public enum FluxisBLEConstants {
    /// SDK version, bumped by release-please.
    public static let sdkVersion = "0.0.0" // x-release-please-version

    public static let protocolVersion: UInt8 = 3

    public static let serviceUUID = UUID(uuidString: "f1b10100-6ff9-4bf4-a699-f9b7aa31119b")!
    public static let recordUUID = UUID(uuidString: "f1b10101-6ff9-4bf4-a699-f9b7aa31119b")!
    public static let controlUUID = UUID(uuidString: "f1b10102-6ff9-4bf4-a699-f9b7aa31119b")!
    public static let dataUUID = UUID(uuidString: "f1b10103-6ff9-4bf4-a699-f9b7aa31119b")!
    public static let cccdUUID = UUID(uuidString: "00002902-0000-1000-8000-00805f9b34fb")!

    public static let defaultMTU = 23
    public static let frameHeaderBytes = 3
    public static let maxMessageBytes = 4096
    public static let maxFrames = 255

    public static let sessionIdBytes = 16
    public static let publicKeyBytes = 65
    public static let nonceBytes = 12
    public static let tagBytes = 16
    public static let ackBytes = 16
    public static let startBytes = 1 + sessionIdBytes + publicKeyBytes

    public static let maxDisplayNameBytes = 64
    public static let maxCurrencyChars = 12
    public static let maxScale = 18
    /// Largest NASPIP token (UTF-8 bytes) that fits in one DATA message.
    public static let maxTokenBytes = maxMessageBytes - nonceBytes - tagBytes - 1

    public static let defaultTTLSeconds = 120
    public static let maxTTLSeconds = 300

    public static let idleTimeout: TimeInterval = 15
    public static let frameTimeout: TimeInterval = 3
    public static let ackTimeout: TimeInterval = 5
    public static let lingerDelay: TimeInterval = 0.25
    public static let firstResponseTimeout: TimeInterval = 5
    /// Payers hide records that expired more than this long ago by their own clock.
    public static let expiryToleranceSeconds: UInt32 = 60

    /// Largest frame payload for an ATT MTU: frame = MTU − 3, payload = frame − 3.
    public static func maxFramePayload(mtu: Int) throws -> Int {
        guard mtu >= defaultMTU else { throw FluxisBLEProtocolError.mtuTooSmall }
        return mtu - 3 - frameHeaderBytes
    }
}
