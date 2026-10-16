import Foundation

/// What the payer should do after an indication on DATA.
public enum PayerEvent {
    /// More frames are expected.
    case incomplete
    /// Token decrypted. Write `ackFrames` to CONTROL, then hand `token` to the host app.
    case delivered(token: String, ackFrames: [[UInt8]])
    /// The collector is locked to another payer.
    case busy
    /// The collector sent ERROR. `rawCode` keeps unknown codes visible.
    case rejected(code: CollectorErrorCode, rawCode: UInt8)
    /// Local failure. Write `abortFrames` (best effort), then disconnect.
    case failed(reason: AbortReason, cause: FluxisBLEProtocolError, abortFrames: [[UInt8]])
}

/// Payer side of one delivery attempt, independent of any Bluetooth API: feed it the RECORD
/// bytes and the negotiated MTU, write `startFrames` to CONTROL, then pass every DATA
/// indication to `onIndication`. Use a new instance (and so a new ephemeral key) per attempt.
public final class PayerSession {
    public let mtu: Int
    public let record: DiscoveryRecord
    public let startFrames: [[UInt8]]

    private let recordBytes: [UInt8]
    private let keyPair: P256KeyPair
    private let startPayload: [UInt8]
    private let reassembler: Reassembler
    private var finished = false

    public init(recordBytes: [UInt8], mtu: Int, keyPair: P256KeyPair = P256KeyPair()) throws {
        _ = try FluxisBLEConstants.maxFramePayload(mtu: mtu)
        self.mtu = mtu
        self.recordBytes = recordBytes
        self.keyPair = keyPair
        record = try DiscoveryRecord.decode(recordBytes)
        startPayload = try StartMessage(sessionId: record.sessionId, payerPublicKey: keyPair.publicKey).encode()
        startFrames = try Framing.split(.start, startPayload, mtu: mtu)
        reassembler = Reassembler(direction: .toPayer, mtu: mtu)
    }

    public func abortFrames(_ reason: AbortReason) -> [[UInt8]] {
        (try? Framing.split(.abort, [reason.rawValue], mtu: mtu)) ?? []
    }

    public func onIndication(_ frame: [UInt8]) -> PayerEvent {
        guard !finished else { return fail(.protocolError, .unexpectedType) }
        let message: Message
        do {
            guard let m = try reassembler.push(frame) else { return .incomplete }
            message = m
        } catch let e as FluxisBLEProtocolError {
            return fail(.protocolError, e)
        } catch {
            return fail(.protocolError, .malformed)
        }
        finished = true
        switch message.type {
        case .busy:
            return .busy
        case .error:
            let raw = message.payload.first ?? CollectorErrorCode.internal.rawValue
            return .rejected(code: CollectorErrorCode.from(raw), rawCode: raw)
        case .data:
            return openData(message.payload)
        default:
            return fail(.protocolError, .unexpectedType)
        }
    }

    private func openData(_ data: [UInt8]) -> PayerEvent {
        do {
            let keys = try KeySchedule.derive(own: keyPair, peerPublicKey: record.collectorPublicKey, record: recordBytes, start: startPayload)
            let envelope = try DataMessage.open(keys: keys, data: data)
            let token = try Envelope.decode(envelope)
            let ack = AckMessage.compute(keys: keys, envelope: envelope)
            return .delivered(token: token, ackFrames: try Framing.split(.ack, ack, mtu: mtu))
        } catch let e as FluxisBLEProtocolError {
            switch e {
            case .decryptFailed: return fail(.decryptFailed, e)
            case .unsupportedContent: return fail(.unsupportedContent, e)
            default: return fail(.protocolError, e)
            }
        } catch {
            return fail(.protocolError, .malformed)
        }
    }

    private func fail(_ reason: AbortReason, _ cause: FluxisBLEProtocolError) -> PayerEvent {
        finished = true
        return .failed(reason: reason, cause: cause, abortFrames: abortFrames(reason))
    }
}
