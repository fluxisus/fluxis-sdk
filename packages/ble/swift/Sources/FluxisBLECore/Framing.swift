import Foundation

public enum Direction {
    case toCollector
    case toPayer
}

public enum MessageType: UInt8, CaseIterable {
    case start = 0x01
    case data = 0x02
    case ack = 0x03
    case abort = 0x04
    case busy = 0x7E
    case error = 0x7F

    public var direction: Direction {
        switch self {
        case .start, .ack, .abort: return .toCollector
        case .data, .busy, .error: return .toPayer
        }
    }
}

public struct Message: Equatable {
    public let type: MessageType
    public let payload: [UInt8]
}

/// Splits messages into `type | seq | total | payload` frames (spec §4).
public enum Framing {
    public static func split(_ type: MessageType, _ payload: [UInt8], mtu: Int) throws -> [[UInt8]] {
        guard payload.count <= FluxisBLEConstants.maxMessageBytes else { throw FluxisBLEProtocolError.messageTooLarge }
        let chunk = try FluxisBLEConstants.maxFramePayload(mtu: mtu)
        let count = max(1, (payload.count + chunk - 1) / chunk)
        guard count <= FluxisBLEConstants.maxFrames else { throw FluxisBLEProtocolError.tooManyFrames }
        return (0..<count).map { i in
            let from = i * chunk
            let to = min(payload.count, from + chunk)
            return [type.rawValue, UInt8(i), UInt8(count)] + payload[from..<to]
        }
    }
}

/// Reassembles frames received on one connection in one direction. Any violation throws and
/// resets the buffer; per spec the caller then drops the link.
///
/// `mtu` enables the `frame ≤ MTU − 3` check; pass `nil` when the receiver can't know the MTU.
public final class Reassembler {
    private let direction: Direction
    public var mtu: Int?
    private var type: MessageType?
    private var total = 0
    private var nextSeq = 0
    private var buffer: [UInt8] = []

    public init(direction: Direction, mtu: Int? = nil) {
        self.direction = direction
        self.mtu = mtu
    }

    /// True while a multi-frame message is partially received.
    public var inProgress: Bool { type != nil }

    /// Returns the completed message, or `nil` if more frames are expected.
    public func push(_ frame: [UInt8]) throws -> Message? {
        do {
            return try pushInternal(frame)
        } catch {
            reset()
            throw error
        }
    }

    public func reset() {
        type = nil
        total = 0
        nextSeq = 0
        buffer = []
    }

    private func pushInternal(_ frame: [UInt8]) throws -> Message? {
        guard frame.count >= FluxisBLEConstants.frameHeaderBytes else { throw FluxisBLEProtocolError.frameTooShort }
        if let mtu = mtu, frame.count > mtu - 3 { throw FluxisBLEProtocolError.frameTooLong }
        let seq = Int(frame[1])
        let tot = Int(frame[2])
        let payload = frame[FluxisBLEConstants.frameHeaderBytes...]
        guard let t = MessageType(rawValue: frame[0]), t.direction == direction else {
            throw FluxisBLEProtocolError.unexpectedType
        }
        guard tot != 0, seq < tot else { throw FluxisBLEProtocolError.badSequence }
        if let current = type {
            guard seq != 0 else { throw FluxisBLEProtocolError.interleavedMessage }
            guard t == current, tot == total else { throw FluxisBLEProtocolError.inconsistentFrame }
        } else {
            guard seq == 0 else { throw FluxisBLEProtocolError.badSequence }
            type = t
            total = tot
        }
        guard seq == nextSeq else { throw FluxisBLEProtocolError.badSequence }
        guard !(payload.isEmpty && tot > 1) else { throw FluxisBLEProtocolError.emptyFrame }
        guard buffer.count + payload.count <= FluxisBLEConstants.maxMessageBytes else {
            throw FluxisBLEProtocolError.messageTooLarge
        }
        buffer += payload
        nextSeq += 1
        guard nextSeq == total else { return nil }
        let message = Message(type: t, payload: buffer)
        reset()
        return message
    }
}
