import Foundation

/// What a PREVIEW value carries (spec §4.2).
public enum FluxisBLEPreviewContent: Hashable, Sendable, CustomStringConvertible {
    /// The NASPIP token of the active sale, as core-api returned it. Opaque to the SDK.
    /// Resolve it with `POST /public/qr/read`.
    case naspip(String)
    /// Fallback when the token doesn't fit in 512 bytes: resolve
    /// `GET /public/checkout/pos/{posId}` for the configured Fluxis environment.
    case posId(UUID)

    public static let kindNaspip: UInt8 = 0x01
    public static let kindPosId: UInt8 = 0x02

    /// Never prints the token itself.
    public var description: String {
        switch self {
        case let .naspip(token): return "naspip(\(token.utf8.count) bytes)"
        case let .posId(id): return "posId(\(id.uuidString.lowercased()))"
        }
    }
}

/// The value of the PREVIEW characteristic: `version | sessionId | kind | content`, at most
/// 512 bytes (spec §4.2). Decoding is strict.
public struct PreviewValue: Hashable, Sendable {
    public let sessionId: [UInt8]
    public let content: FluxisBLEPreviewContent

    public init(sessionId: [UInt8], content: FluxisBLEPreviewContent) {
        self.sessionId = sessionId
        self.content = content
    }

    /// The collector's choice: the token when it fits, else `posId`. Throws `previewTooLarge`
    /// when the token doesn't fit and there is no `posId`.
    public static func forToken(sessionId: [UInt8], token: String, posId: UUID?) throws -> PreviewValue {
        let size = token.utf8.count
        guard size > 0 else { throw FluxisBLEProtocolError.invalidToken }
        if size <= FluxisBLEConstants.maxPreviewTokenBytes {
            return PreviewValue(sessionId: sessionId, content: .naspip(token))
        }
        guard let posId = posId else { throw FluxisBLEProtocolError.previewTooLarge }
        return PreviewValue(sessionId: sessionId, content: .posId(posId))
    }

    public func encode() throws -> [UInt8] {
        guard sessionId.count == FluxisBLEConstants.sessionIdBytes else { throw FluxisBLEProtocolError.invalidSessionId }
        var w = ByteWriter()
        w.u8(FluxisBLEConstants.protocolVersion)
        w.append(sessionId)
        switch content {
        case let .posId(id):
            w.u8(FluxisBLEPreviewContent.kindPosId)
            let u = id.uuid
            w.append([u.0, u.1, u.2, u.3, u.4, u.5, u.6, u.7, u.8, u.9, u.10, u.11, u.12, u.13, u.14, u.15])
        case let .naspip(token):
            let bytes = Array(token.utf8)
            guard !bytes.isEmpty else { throw FluxisBLEProtocolError.invalidToken }
            guard bytes.count <= FluxisBLEConstants.maxPreviewTokenBytes else { throw FluxisBLEProtocolError.previewTooLarge }
            w.u8(FluxisBLEPreviewContent.kindNaspip)
            w.append(bytes)
        }
        return w.bytes
    }

    public static func decode(_ bytes: [UInt8]) throws -> PreviewValue {
        guard bytes.count <= FluxisBLEConstants.maxAttributeBytes else { throw FluxisBLEProtocolError.previewTooLarge }
        var r = ByteReader(bytes)
        guard try r.u8() == FluxisBLEConstants.protocolVersion else { throw FluxisBLEProtocolError.unsupportedVersion }
        let sessionId = try r.take(FluxisBLEConstants.sessionIdBytes)
        let kind = try r.u8()
        let rest = try r.take(r.remaining)
        switch kind {
        case FluxisBLEPreviewContent.kindNaspip:
            guard !rest.isEmpty, let token = decodeUTF8Strict(rest) else { throw FluxisBLEProtocolError.invalidToken }
            return PreviewValue(sessionId: sessionId, content: .naspip(token))
        case FluxisBLEPreviewContent.kindPosId:
            guard rest.count == FluxisBLEConstants.posIdBytes else { throw FluxisBLEProtocolError.invalidPosId }
            let b = rest
            let id = UUID(uuid: (b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15]))
            return PreviewValue(sessionId: sessionId, content: .posId(id))
        default:
            throw FluxisBLEProtocolError.unsupportedContent
        }
    }
}

/// The active sale of a nearby POS. Resolve `content` with the Fluxis API and show the merchant
/// and amount the API returns; `record` only holds unauthenticated hints.
///
/// Several payers may see the same sale: re-check that the payment request is still pending
/// right before signing (docs/ble-protocol.md §7).
public struct FluxisBLEPreview: Sendable, CustomStringConvertible {
    public let record: DiscoveryRecord
    public let sessionId: [UInt8]
    public let content: FluxisBLEPreviewContent
    /// CoreBluetooth peripheral identifier (stable per device pair, not a MAC address).
    public let identifier: UUID?
    public let rssi: Int?

    public init(record: DiscoveryRecord, sessionId: [UInt8], content: FluxisBLEPreviewContent, identifier: UUID? = nil, rssi: Int? = nil) {
        self.record = record
        self.sessionId = sessionId
        self.content = content
        self.identifier = identifier
        self.rssi = rssi
    }

    /// The NASPIP token, or nil when the POS published its id instead.
    public var token: String? {
        if case let .naspip(t) = content { return t }
        return nil
    }

    /// The POS id, when the POS published it instead of the token.
    public var posId: UUID? {
        if case let .posId(id) = content { return id }
        return nil
    }

    public var description: String {
        "FluxisBLEPreview(name: \(record.displayName), session: \(sessionId.hexString), content: \(content))"
    }

    /// Strictly decodes both values read on one connection and checks that they belong to the
    /// same session. Errors are `FluxisBLEPayerError(.invalid)`.
    public static func parse(record recordBytes: [UInt8], preview previewBytes: [UInt8], identifier: UUID? = nil, rssi: Int? = nil) throws -> FluxisBLEPreview {
        do {
            let record = try DiscoveryRecord.decode(recordBytes)
            let value = try PreviewValue.decode(previewBytes)
            guard record.sessionId == value.sessionId else {
                throw FluxisBLEPayerError(.invalid, "RECORD and PREVIEW session ids differ")
            }
            return FluxisBLEPreview(record: record, sessionId: value.sessionId, content: value.content, identifier: identifier, rssi: rssi)
        } catch let e as FluxisBLEProtocolError {
            throw FluxisBLEPayerError(.invalid, "invalid preview: \(e.rawValue)", protocolError: e)
        }
    }
}

/// A connected collector, as the preview flow needs it. The CoreBluetooth layer implements it;
/// tests use a fake.
public protocol FluxisBLEReadLink: Sendable {
    /// Discovers `SERVICE` and its characteristics. Returns false if PREVIEW is missing.
    func discover() async throws -> Bool
    /// Full (long) read of RECORD.
    func readRecord() async throws -> [UInt8]
    /// Full (long) read of PREVIEW.
    func readPreview() async throws -> [UInt8]
}

/// The payer's read sequence (spec §7.3), independent of CoreBluetooth.
public enum PreviewFlow {
    public static func read(over link: FluxisBLEReadLink, identifier: UUID? = nil, rssi: Int? = nil) async throws -> FluxisBLEPreview {
        guard try await link.discover() else {
            throw FluxisBLEPayerError(.notSupported, "collector has no PREVIEW characteristic")
        }
        let record = try await link.readRecord()
        let preview = try await link.readPreview()
        return try FluxisBLEPreview.parse(record: record, preview: preview, identifier: identifier, rssi: rssi)
    }
}
