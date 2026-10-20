import Foundation

/// An amount in minor units with an explicit number of decimal places:
/// `value = minorUnits × 10^(−scale)`. `FluxisAmount(minorUnits: 1250, scale: 2, currency: "ARS")`
/// is ARS 12.50.
///
/// `currency` is an upper-case ISO 4217 code or asset ticker (`[A-Z0-9]{1,12}`), or `nil` when
/// unspecified. The scale is kept as given, so `12.50` and `12.5` stay distinct for display.
public struct FluxisAmount: Hashable, Sendable, CustomStringConvertible {
    public let minorUnits: Int64
    public let scale: Int
    public let currency: String?

    public init(minorUnits: Int64, scale: Int, currency: String? = nil) throws {
        guard minorUnits >= 0 else { throw FluxisBLEProtocolError.amountOutOfRange }
        guard (0...FluxisBLEConstants.maxScale).contains(scale) else { throw FluxisBLEProtocolError.scaleOutOfRange }
        if let currency = currency, !FluxisAmount.isValidCurrency(currency) {
            throw FluxisBLEProtocolError.invalidCurrency
        }
        self.minorUnits = minorUnits
        self.scale = scale
        self.currency = currency
    }

    /// Parses a plain decimal string (`"12.50"`, `"1500"`, `"0.000001"`). Signs, exponents,
    /// separators, whitespace and leading zeros are rejected. `nil` or empty currency = unspecified.
    public static func parse(_ decimal: String, currency: String? = nil) throws -> FluxisAmount {
        let bytes = Array(decimal.utf8)
        let isDigit: (UInt8) -> Bool = { $0 >= 0x30 && $0 <= 0x39 }
        let dot = bytes.firstIndex(of: 0x2E)
        let whole = dot.map { Array(bytes[..<$0]) } ?? bytes
        let fraction = dot.map { Array(bytes[($0 + 1)...]) } ?? []
        guard !whole.isEmpty, whole.allSatisfy(isDigit), whole.count == 1 || whole[0] != 0x30 else {
            throw FluxisBLEProtocolError.invalidDecimal
        }
        if dot != nil {
            guard !fraction.isEmpty, fraction.allSatisfy(isDigit) else { throw FluxisBLEProtocolError.invalidDecimal }
        }
        guard fraction.count <= FluxisBLEConstants.maxScale else { throw FluxisBLEProtocolError.scaleOutOfRange }
        guard let minor = Int64(String(decoding: whole + fraction, as: UTF8.self)) else {
            throw FluxisBLEProtocolError.amountOutOfRange
        }
        return try FluxisAmount(minorUnits: minor, scale: fraction.count, currency: currency?.isEmpty == true ? nil : currency)
    }

    /// Plain decimal string with exactly `scale` fractional digits, e.g. `"12.50"`.
    public var decimalString: String {
        let digits = String(minorUnits)
        guard scale > 0 else { return digits }
        let padded = String(repeating: "0", count: max(0, scale + 1 - digits.count)) + digits
        let split = padded.index(padded.endIndex, offsetBy: -scale)
        return "\(padded[..<split]).\(padded[split...])"
    }

    public var decimalValue: Decimal { Decimal(string: decimalString, locale: Locale(identifier: "en_US_POSIX")) ?? 0 }

    public var description: String { currency.map { "\($0) \(decimalString)" } ?? decimalString }

    static func isValidCurrency(_ currency: String) -> Bool {
        let bytes = Array(currency.utf8)
        return (1...FluxisBLEConstants.maxCurrencyChars).contains(bytes.count)
            && bytes.allSatisfy { ($0 >= 0x41 && $0 <= 0x5A) || ($0 >= 0x30 && $0 <= 0x39) }
    }
}
