import Foundation
#if canImport(CryptoKit)
import CryptoKit
#else
import Crypto
#endif

/// Ephemeral P-256 key pair; `publicKey` is the 65-byte uncompressed SEC1 encoding.
public struct P256KeyPair {
    let privateKey: P256.KeyAgreement.PrivateKey
    public let publicKey: [UInt8]

    public init() {
        let key = P256.KeyAgreement.PrivateKey()
        privateKey = key
        publicKey = Array(key.publicKey.x963Representation)
    }

    /// Builds a key pair from a known 32-byte scalar (test vectors, fixtures).
    public init(privateScalar: [UInt8]) throws {
        let key = try P256.KeyAgreement.PrivateKey(rawRepresentation: privateScalar)
        privateKey = key
        publicKey = Array(key.publicKey.x963Representation)
    }
}

enum P256Keys {
    /// Rejects anything but an uncompressed point on P-256 (spec §5.4).
    static func validatePublicKey(_ encoded: [UInt8]) throws -> P256.KeyAgreement.PublicKey {
        guard encoded.count == FluxisBLEConstants.publicKeyBytes, encoded[0] == 0x04 else {
            throw FluxisBLEProtocolError.invalidKey
        }
        do {
            return try P256.KeyAgreement.PublicKey(x963Representation: encoded)
        } catch {
            throw FluxisBLEProtocolError.invalidKey
        }
    }

    /// ECDH shared secret: the 32-byte X coordinate.
    static func ecdh(_ own: P256KeyPair, _ peerPublicKey: [UInt8]) throws -> [UInt8] {
        let peer = try validatePublicKey(peerPublicKey)
        let secret = try own.privateKey.sharedSecretFromKeyAgreement(with: peer)
        return secret.withUnsafeBytes { Array($0) }
    }
}

enum Primitives {
    static func sha256(_ parts: [UInt8]...) -> [UInt8] {
        var h = SHA256()
        parts.forEach { h.update(data: $0) }
        return Array(h.finalize())
    }

    static func hmacSHA256(key: [UInt8], _ parts: [UInt8]...) -> [UInt8] {
        var h = HMAC<SHA256>(key: SymmetricKey(data: key))
        parts.forEach { h.update(data: $0) }
        return Array(h.finalize())
    }

    static func hkdfExtract(salt: [UInt8], ikm: [UInt8]) -> [UInt8] { hmacSHA256(key: salt, ikm) }

    static func hkdfExpand(prk: [UInt8], info: [UInt8], length: Int) -> [UInt8] {
        var out: [UInt8] = []
        var t: [UInt8] = []
        var counter: UInt8 = 1
        while out.count < length {
            t = hmacSHA256(key: prk, t, info, [counter])
            out += t
            counter += 1
        }
        return Array(out.prefix(length))
    }

    static func aesGCMSeal(key: [UInt8], nonce: [UInt8], plaintext: [UInt8], aad: [UInt8]) throws -> [UInt8] {
        let box = try AES.GCM.seal(plaintext, using: SymmetricKey(data: key), nonce: AES.GCM.Nonce(data: nonce), authenticating: aad)
        return Array(box.ciphertext) + Array(box.tag)
    }

    static func aesGCMOpen(key: [UInt8], nonce: [UInt8], ciphertextAndTag: [UInt8], aad: [UInt8]) -> [UInt8]? {
        let tagStart = ciphertextAndTag.count - FluxisBLEConstants.tagBytes
        guard tagStart >= 0,
              let n = try? AES.GCM.Nonce(data: nonce),
              let box = try? AES.GCM.SealedBox(nonce: n, ciphertext: ciphertextAndTag[..<tagStart], tag: ciphertextAndTag[tagStart...]),
              let plain = try? AES.GCM.open(box, using: SymmetricKey(data: key), authenticating: aad)
        else { return nil }
        return Array(plain)
    }

    static func constantTimeEquals(_ a: [UInt8], _ b: [UInt8]) -> Bool {
        guard a.count == b.count else { return false }
        var diff: UInt8 = 0
        for i in 0..<a.count { diff |= a[i] ^ b[i] }
        return diff == 0
    }
}
