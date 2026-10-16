import Foundation

struct ByteReader {
    private let data: [UInt8]
    private var pos = 0

    init(_ data: [UInt8]) { self.data = data }

    mutating func take(_ n: Int) throws -> [UInt8] {
        guard n >= 0, pos + n <= data.count else { throw FluxisBLEProtocolError.truncated }
        defer { pos += n }
        return Array(data[pos..<(pos + n)])
    }

    mutating func u8() throws -> UInt8 { try take(1)[0] }

    mutating func u32() throws -> UInt32 { try take(4).reduce(0) { ($0 << 8) | UInt32($1) } }

    mutating func u64() throws -> UInt64 { try take(8).reduce(0) { ($0 << 8) | UInt64($1) } }

    var remaining: Int { data.count - pos }
}

struct ByteWriter {
    private(set) var bytes: [UInt8] = []

    mutating func u8(_ v: UInt8) { bytes.append(v) }

    mutating func u32(_ v: UInt32) { for shift in stride(from: 24, through: 0, by: -8) { bytes.append(UInt8((v >> UInt32(shift)) & 0xFF)) } }

    mutating func u64(_ v: UInt64) { for shift in stride(from: 56, through: 0, by: -8) { bytes.append(UInt8((v >> UInt64(shift)) & 0xFF)) } }

    mutating func append(_ b: [UInt8]) { bytes.append(contentsOf: b) }
}

/// Strict UTF-8 decode: `nil` if `bytes` is not valid UTF-8 (no replacement characters).
func decodeUTF8Strict(_ bytes: [UInt8]) -> String? {
    let s = String(decoding: bytes, as: UTF8.self)
    return Array(s.utf8) == bytes ? s : nil
}

public extension Array where Element == UInt8 {
    /// Lower-case hex, handy for logs and tests.
    var hexString: String { map { String(format: "%02x", $0) }.joined() }

    /// Parses lower- or upper-case hex; `nil` on odd length or invalid digits.
    init?(hex: String) {
        let chars = Array(hex.utf8)
        guard chars.count % 2 == 0 else { return nil }
        var out = [UInt8]()
        out.reserveCapacity(chars.count / 2)
        func nibble(_ c: UInt8) -> UInt8? {
            switch c {
            case 0x30...0x39: return c - 0x30
            case 0x41...0x46: return c - 0x41 + 10
            case 0x61...0x66: return c - 0x61 + 10
            default: return nil
            }
        }
        var i = 0
        while i < chars.count {
            guard let hi = nibble(chars[i]), let lo = nibble(chars[i + 1]) else { return nil }
            out.append(hi << 4 | lo)
            i += 2
        }
        self = out
    }
}
