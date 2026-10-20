import Foundation

/// The value of the RECORD characteristic (spec §4.1): unauthenticated hints that a payer can
/// show in a picker of nearby POS. `sessionId` ties it to the PREVIEW value of the same session.
///
/// `amount` and `displayName` are informational only: wallets must show the merchant and amount
/// that the Fluxis API returns for the preview.
public struct DiscoveryRecord: Hashable, Sendable {
    public static let flagAmountPresent: UInt8 = 0x01

    public let sessionId: [UInt8]
    public let amount: FluxisAmount?
    public let displayName: String

    public init(sessionId: [UInt8], amount: FluxisAmount?, displayName: String) {
        self.sessionId = sessionId
        self.amount = amount
        self.displayName = displayName
    }

    public func encode() throws -> [UInt8] {
        guard sessionId.count == FluxisBLEConstants.sessionIdBytes else { throw FluxisBLEProtocolError.invalidSessionId }
        let name = Array(displayName.utf8)
        guard (1...FluxisBLEConstants.maxDisplayNameBytes).contains(name.count) else {
            throw FluxisBLEProtocolError.invalidDisplayName
        }
        var w = ByteWriter()
        w.u8(FluxisBLEConstants.protocolVersion)
        w.u8(amount == nil ? 0 : DiscoveryRecord.flagAmountPresent)
        w.append(sessionId)
        if let amount = amount {
            let currency = Array((amount.currency ?? "").utf8)
            w.u64(UInt64(amount.minorUnits))
            w.u8(UInt8(amount.scale))
            w.u8(UInt8(currency.count))
            w.append(currency)
        }
        w.u8(UInt8(name.count))
        w.append(name)
        return w.bytes
    }

    /// Strict decode: rejects other versions, truncation, trailing bytes and out-of-range fields.
    public static func decode(_ bytes: [UInt8]) throws -> DiscoveryRecord {
        var r = ByteReader(bytes)
        guard try r.u8() == FluxisBLEConstants.protocolVersion else { throw FluxisBLEProtocolError.unsupportedVersion }
        let flags = try r.u8()
        let sessionId = try r.take(FluxisBLEConstants.sessionIdBytes)
        var amount: FluxisAmount?
        if flags & flagAmountPresent != 0 {
            let minor = try r.u64()
            let scale = try r.u8()
            let currencyLen = Int(try r.u8())
            guard currencyLen <= FluxisBLEConstants.maxCurrencyChars else { throw FluxisBLEProtocolError.invalidCurrency }
            let currencyBytes = try r.take(currencyLen)
            guard currencyBytes.allSatisfy({ $0 < 0x80 }) else { throw FluxisBLEProtocolError.invalidCurrency }
            guard minor <= UInt64(Int64.max) else { throw FluxisBLEProtocolError.amountOutOfRange }
            let currency = String(decoding: currencyBytes, as: UTF8.self)
            amount = try FluxisAmount(minorUnits: Int64(minor), scale: Int(scale), currency: currency.isEmpty ? nil : currency)
        }
        let nameLen = Int(try r.u8())
        guard (1...FluxisBLEConstants.maxDisplayNameBytes).contains(nameLen) else {
            throw FluxisBLEProtocolError.invalidDisplayName
        }
        guard let name = decodeUTF8Strict(try r.take(nameLen)) else { throw FluxisBLEProtocolError.invalidDisplayName }
        guard r.remaining == 0 else { throw FluxisBLEProtocolError.trailingBytes }
        return DiscoveryRecord(sessionId: sessionId, amount: amount, displayName: name)
    }

    /// Trims `name` and cuts it to at most 64 UTF-8 bytes on a character boundary.
    public static func fitDisplayName(_ name: String) throws -> String {
        var out = ""
        var used = 0
        for ch in name.trimmingCharacters(in: .whitespacesAndNewlines) {
            let len = String(ch).utf8.count
            if used + len > FluxisBLEConstants.maxDisplayNameBytes { break }
            out.append(ch)
            used += len
        }
        guard !out.isEmpty else { throw FluxisBLEProtocolError.invalidDisplayName }
        return out
    }
}
