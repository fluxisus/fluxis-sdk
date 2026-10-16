import Foundation

/// START payload: `version | sessionId | payerPublicKey` (spec §5.3).
public struct StartMessage: Equatable {
    public let sessionId: [UInt8]
    public let payerPublicKey: [UInt8]

    public init(sessionId: [UInt8], payerPublicKey: [UInt8]) {
        self.sessionId = sessionId
        self.payerPublicKey = payerPublicKey
    }

    public func encode() throws -> [UInt8] {
        guard sessionId.count == FluxisBLEConstants.sessionIdBytes else { throw FluxisBLEProtocolError.invalidSessionId }
        _ = try P256Keys.validatePublicKey(payerPublicKey)
        return [FluxisBLEConstants.protocolVersion] + sessionId + payerPublicKey
    }

    public static func decode(_ payload: [UInt8]) throws -> StartMessage {
        guard payload.count == FluxisBLEConstants.startBytes else { throw FluxisBLEProtocolError.malformed }
        guard payload[0] == FluxisBLEConstants.protocolVersion else { throw FluxisBLEProtocolError.unsupportedVersion }
        let pub = Array(payload[(1 + FluxisBLEConstants.sessionIdBytes)...])
        _ = try P256Keys.validatePublicKey(pub)
        return StartMessage(sessionId: Array(payload[1..<(1 + FluxisBLEConstants.sessionIdBytes)]), payerPublicKey: pub)
    }
}

/// Keys and transcript hash for one (session, START) pair (spec §5.4).
public struct SessionKeys: Equatable {
    public let sharedSecret: [UInt8]
    public let transcriptHash: [UInt8]
    public let prk: [UInt8]
    public let dataKey: [UInt8]
    public let ackKey: [UInt8]
}

public enum KeySchedule {
    static let labelTranscript = Array("fluxis-ble/3/transcript".utf8)
    static let labelData = Array("fluxis-ble/3/data".utf8)
    static let labelAck = Array("fluxis-ble/3/ack".utf8)

    /// `record` and `start` are the exact wire bytes (RECORD value and START payload).
    public static func derive(own: P256KeyPair, peerPublicKey: [UInt8], record: [UInt8], start: [UInt8]) throws -> SessionKeys {
        let z = try P256Keys.ecdh(own, peerPublicKey)
        let th = Primitives.sha256(labelTranscript, record, start)
        let prk = Primitives.hkdfExtract(salt: th, ikm: z)
        return SessionKeys(
            sharedSecret: z,
            transcriptHash: th,
            prk: prk,
            dataKey: Primitives.hkdfExpand(prk: prk, info: labelData, length: 32),
            ackKey: Primitives.hkdfExpand(prk: prk, info: labelAck, length: 32)
        )
    }
}

/// Plaintext carried in DATA: `contentType | content` (spec §5.5).
public enum Envelope {
    public static let contentNaspip: UInt8 = 0x01

    public static func encodeNaspip(_ token: String) throws -> [UInt8] {
        let content = Array(token.utf8)
        guard !content.isEmpty else { throw FluxisBLEProtocolError.emptyToken }
        guard content.count <= FluxisBLEConstants.maxTokenBytes else { throw FluxisBLEProtocolError.messageTooLarge }
        return [contentNaspip] + content
    }

    /// Returns the NASPIP token.
    public static func decode(_ envelope: [UInt8]) throws -> String {
        guard envelope.count >= 2 else { throw FluxisBLEProtocolError.malformed }
        guard envelope[0] == contentNaspip else { throw FluxisBLEProtocolError.unsupportedContent }
        guard let token = decodeUTF8Strict(Array(envelope[1...])) else { throw FluxisBLEProtocolError.malformed }
        return token
    }
}

/// DATA payload: `nonce | AES-256-GCM(envelope)`, AAD = transcript hash (spec §5.5).
public enum DataMessage {
    public static func seal(keys: SessionKeys, nonce: [UInt8], envelope: [UInt8]) throws -> [UInt8] {
        guard nonce.count == FluxisBLEConstants.nonceBytes else { throw FluxisBLEProtocolError.invalidNonce }
        return nonce + (try Primitives.aesGCMSeal(key: keys.dataKey, nonce: nonce, plaintext: envelope, aad: keys.transcriptHash))
    }

    /// Returns the envelope.
    public static func open(keys: SessionKeys, data: [UInt8]) throws -> [UInt8] {
        guard data.count >= FluxisBLEConstants.nonceBytes + FluxisBLEConstants.tagBytes + 2 else {
            throw FluxisBLEProtocolError.malformed
        }
        let nonce = Array(data[..<FluxisBLEConstants.nonceBytes])
        let body = Array(data[FluxisBLEConstants.nonceBytes...])
        guard let envelope = Primitives.aesGCMOpen(key: keys.dataKey, nonce: nonce, ciphertextAndTag: body, aad: keys.transcriptHash) else {
            throw FluxisBLEProtocolError.decryptFailed
        }
        return envelope
    }
}

/// ACK payload: `HMAC-SHA256(ackKey, TH || SHA-256(envelope))[0..16]` (spec §5.6).
public enum AckMessage {
    public static func compute(keys: SessionKeys, envelope: [UInt8]) -> [UInt8] {
        Array(Primitives.hmacSHA256(key: keys.ackKey, keys.transcriptHash, Primitives.sha256(envelope)).prefix(FluxisBLEConstants.ackBytes))
    }

    /// Constant-time verification.
    public static func verify(keys: SessionKeys, envelope: [UInt8], ack: [UInt8]) -> Bool {
        ack.count == FluxisBLEConstants.ackBytes && Primitives.constantTimeEquals(compute(keys: keys, envelope: envelope), ack)
    }
}
