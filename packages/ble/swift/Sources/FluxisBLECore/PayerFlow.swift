import Foundation

/// One connected collector, as seen by the payer flow. `FluxisBLE` implements it on
/// CoreBluetooth; tests implement it in memory. Methods throw `FluxisBLEPayerError` for link
/// failures.
public protocol FluxisBLELink: AnyObject {
    /// Largest ATT value the link can carry in one write or indication (`MTU − 3`). On iOS
    /// this is `maximumWriteValueLength(for: .withoutResponse)`.
    var maximumValueLength: Int { get }

    func readRecord() async throws -> [UInt8]

    /// Enables indications on DATA (CCCD = 0x0002) and returns once the descriptor write is acknowledged.
    func subscribeToData() async throws

    /// One CONTROL write, with response.
    func writeControl(_ frame: [UInt8]) async throws

    /// Next DATA indication, or `nil` if none arrives within `timeout` seconds.
    func nextIndication(timeout: TimeInterval) async throws -> [UInt8]?
}

/// A delivered NASPIP token. Resolve it with the Fluxis API and show the merchant and amount
/// the API returns; `record` only says which POS it came from.
public struct FluxisBLEDelivery: Sendable {
    public let token: String
    public let record: DiscoveryRecord
}

/// The payer side of spec §7, steps 2 and 4–7, over any `FluxisBLELink`.
public enum PayerFlow {
    public static func deliver(over link: FluxisBLELink, now: Date = Date()) async throws -> FluxisBLEDelivery {
        let recordBytes = try await link.readRecord()
        let mtu = max(FluxisBLEConstants.defaultMTU, link.maximumValueLength + 3)
        let session: PayerSession
        do {
            session = try PayerSession(recordBytes: recordBytes, mtu: mtu)
        } catch let e as FluxisBLEProtocolError {
            throw FluxisBLEPayerError(.protocolError, "invalid discovery record: \(e.rawValue)")
        }
        if session.record.isExpired(now: now, toleranceSeconds: FluxisBLEConstants.expiryToleranceSeconds) {
            throw FluxisBLEPayerError(.expired, "collector session expired")
        }
        try await link.subscribeToData()
        for frame in session.startFrames { try await link.writeControl(frame) }

        var wait = FluxisBLEConstants.firstResponseTimeout
        while true {
            guard let frame = try await link.nextIndication(timeout: wait) else {
                await writeBestEffort(link, session.abortFrames(.timeout))
                throw FluxisBLEPayerError(.timeout, "collector stopped responding")
            }
            wait = FluxisBLEConstants.frameTimeout
            switch session.onIndication(frame) {
            case .incomplete:
                continue
            case let .delivered(token, ackFrames):
                for f in ackFrames { try await link.writeControl(f) }
                return FluxisBLEDelivery(token: token, record: session.record)
            case .busy:
                throw FluxisBLEPayerError(.busy, "collector is busy with another payer")
            case let .rejected(code, _):
                throw FluxisBLEPayerError(code == .expired ? .expired : .rejected,
                                          "collector rejected the request: \(code.wireName)", collectorError: code)
            case let .failed(reason, cause, abortFrames):
                await writeBestEffort(link, abortFrames)
                throw FluxisBLEPayerError(reason == .decryptFailed ? .decryptFailed : .protocolError, cause.rawValue)
            }
        }
    }

    private static func writeBestEffort(_ link: FluxisBLELink, _ frames: [[UInt8]]) async {
        for f in frames { try? await link.writeControl(f) }
    }
}
