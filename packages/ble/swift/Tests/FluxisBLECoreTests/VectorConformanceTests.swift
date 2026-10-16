import Foundation
import XCTest
@testable import FluxisBLECore

/// Runs every section of the shared test vectors against the Swift implementation.
final class VectorConformanceTests: XCTestCase {
    func testConstants() {
        XCTAssertEqual(Int(FluxisBLEConstants.protocolVersion), (Vectors.root["protocolVersion"] as! NSNumber).intValue)
        let uuids = Vectors.section("uuids") as! [String: Any]
        XCTAssertEqual(FluxisBLEConstants.serviceUUID.uuidString.lowercased(), uuids.str("service"))
        XCTAssertEqual(FluxisBLEConstants.recordUUID.uuidString.lowercased(), uuids.str("record"))
        XCTAssertEqual(FluxisBLEConstants.controlUUID.uuidString.lowercased(), uuids.str("control"))
        XCTAssertEqual(FluxisBLEConstants.dataUUID.uuidString.lowercased(), uuids.str("data"))
        XCTAssertEqual(FluxisBLEConstants.cccdUUID.uuidString.lowercased(), uuids.str("cccd"))

        let types = Vectors.section("messageTypes") as! [String: Any]
        XCTAssertEqual(types.count, MessageType.allCases.count)
        for t in MessageType.allCases { XCTAssertEqual(Int(t.rawValue), types.int("\(t)")) }

        let reasons = Vectors.section("messages", "abortReasons") as! [String: Any]
        XCTAssertEqual(reasons.count, AbortReason.allCases.count)
        for r in AbortReason.allCases { XCTAssertEqual(Int(r.rawValue), reasons.int(r.wireName), r.wireName) }

        let codes = Vectors.section("messages", "errorCodes") as! [String: Any]
        XCTAssertEqual(codes.count, CollectorErrorCode.allCases.count)
        for c in CollectorErrorCode.allCases { XCTAssertEqual(Int(c.rawValue), codes.int(c.wireName), c.wireName) }
    }

    func testAmounts() throws {
        for v in Vectors.list("amounts", "valid") {
            let a = try FluxisAmount.parse(v.str("decimal"), currency: v.str("currency"))
            XCTAssertEqual(a.minorUnits, Int64(v.str("minor"))!, v.str("decimal"))
            XCTAssertEqual(a.scale, v.int("scale"), v.str("decimal"))
            XCTAssertEqual(a.currency, v.str("currency").isEmpty ? nil : v.str("currency"))
            XCTAssertEqual(a.decimalString, v.str("decimal"))
        }
        for v in Vectors.list("amounts", "invalid") {
            assertProtocolError(v.str("error"), "amount '\(v.str("decimal"))' \(v.str("currency"))") {
                _ = try FluxisAmount.parse(v.str("decimal"), currency: v.str("currency"))
            }
        }
    }

    func testRecords() throws {
        for v in Vectors.list("records", "valid") {
            let name = v.str("name")
            let r = try DiscoveryRecord.decode(v.hex("hex"))
            XCTAssertEqual(Int(r.expiresAt), v.int("expiresAt"), name)
            XCTAssertEqual(r.sessionId, v.hex("sessionId"), name)
            XCTAssertEqual(r.collectorPublicKey, v.hex("collectorPublicKey"), name)
            XCTAssertEqual(r.displayName, v.str("displayName"), name)
            if v.isNull("amount") {
                XCTAssertNil(r.amount, name)
            } else {
                let a = v.obj("amount")
                let currency = a.str("currency")
                XCTAssertEqual(r.amount, try FluxisAmount(minorUnits: Int64(a.str("minor"))!, scale: a.int("scale"), currency: currency.isEmpty ? nil : currency), name)
            }
            if !v.flag("decodeOnly") { XCTAssertEqual(try r.encode().hexString, v.str("hex"), "\(name) (re-encode)") }
        }
        for v in Vectors.list("records", "invalid") {
            assertProtocolError(v.str("error"), "record: \(v.str("name"))") { _ = try DiscoveryRecord.decode(v.hex("hex")) }
        }
    }

    func testFramingSplit() throws {
        for v in Vectors.list("framing", "split") {
            let type = MessageType(rawValue: UInt8(v.int("type")))!
            let frames = try Framing.split(type, v.hex("payload"), mtu: v.int("mtu"))
            XCTAssertEqual(hexes(frames), hexes(v.hexList("frames")), v.str("name"))
            let r = Reassembler(direction: type.direction, mtu: v.int("mtu"))
            for f in frames.dropLast() { XCTAssertNil(try r.push(f)) }
            XCTAssertEqual(try r.push(frames.last!), Message(type: type, payload: v.hex("payload")), v.str("name"))
        }
        for v in Vectors.list("framing", "splitErrors") {
            assertProtocolError(v.str("error"), v.str("name")) {
                _ = try Framing.split(MessageType(rawValue: UInt8(v.int("type")))!, [UInt8](repeating: 0, count: v.int("payloadLength")), mtu: v.int("mtu"))
            }
        }
    }

    func testFramingReassembly() throws {
        for v in Vectors.list("framing", "reassemble") {
            let name = v.str("name")
            let r = Reassembler(direction: v.str("direction") == "toPayer" ? .toPayer : .toCollector, mtu: v.int("mtu"))
            let frames = v.hexList("frames")
            for f in frames.dropLast() { XCTAssertNil(try r.push(f), name) }
            if v["error"] != nil {
                assertProtocolError(v.str("error"), name) { _ = try r.push(frames.last!) }
                XCTAssertFalse(r.inProgress, "\(name): buffer reset after error")
            } else {
                let expect = v.obj("expect")
                let m = try r.push(frames.last!)
                XCTAssertEqual(Int(m!.type.rawValue), expect.int("type"), name)
                XCTAssertEqual(m!.payload, expect.hex("payload"), name)
            }
        }
    }

    func testMessages() throws {
        let start = Vectors.section("messages", "start") as! [String: Any]
        XCTAssertEqual(try StartMessage(sessionId: start.hex("sessionId"), payerPublicKey: start.hex("payerPublicKey")).encode(), start.hex("hex"))
        XCTAssertEqual(try StartMessage.decode(start.hex("hex")), StartMessage(sessionId: start.hex("sessionId"), payerPublicKey: start.hex("payerPublicKey")))
        for v in Vectors.list("messages", "startInvalid") {
            assertProtocolError(v.str("error"), "start: \(v.str("name"))") { _ = try StartMessage.decode(v.hex("hex")) }
        }
        for v in Vectors.list("messages", "envelope") {
            XCTAssertEqual(try Envelope.encodeNaspip(v.str("token")), v.hex("hex"))
            XCTAssertEqual(try Envelope.decode(v.hex("hex")), v.str("token"))
        }
        for v in Vectors.list("messages", "envelopeInvalid") {
            assertProtocolError(v.str("error"), "envelope: \(v.str("name"))") { _ = try Envelope.decode(v.hex("hex")) }
        }
    }

    func testHandshakes() throws {
        for v in Vectors.list("handshakes") {
            let name = v.str("name")
            let collector = try P256KeyPair(privateScalar: v.hex("collectorPrivateKey"))
            let payer = try P256KeyPair(privateScalar: v.hex("payerPrivateKey"))
            XCTAssertEqual(collector.publicKey, v.hex("collectorPublicKey"), name)
            XCTAssertEqual(payer.publicKey, v.hex("payerPublicKey"), name)
            let record = v.hex("record")
            let start = v.hex("start")
            XCTAssertEqual(try StartMessage(sessionId: try DiscoveryRecord.decode(record).sessionId, payerPublicKey: payer.publicKey).encode(), start)

            let ck = try KeySchedule.derive(own: collector, peerPublicKey: payer.publicKey, record: record, start: start)
            let pk = try KeySchedule.derive(own: payer, peerPublicKey: collector.publicKey, record: record, start: start)
            for (label, keys) in [("collector", ck), ("payer", pk)] {
                XCTAssertEqual(keys.sharedSecret, v.hex("sharedSecret"), "\(name) \(label) Z")
                XCTAssertEqual(keys.transcriptHash, v.hex("transcriptHash"), "\(name) \(label) TH")
                XCTAssertEqual(keys.prk, v.hex("prk"), "\(name) \(label) PRK")
                XCTAssertEqual(keys.dataKey, v.hex("dataKey"), "\(name) \(label) dataKey")
                XCTAssertEqual(keys.ackKey, v.hex("ackKey"), "\(name) \(label) ackKey")
            }

            let envelope = try Envelope.encodeNaspip(v.str("token"))
            XCTAssertEqual(envelope, v.hex("envelope"), name)
            let data = try DataMessage.seal(keys: ck, nonce: v.hex("nonce"), envelope: envelope)
            XCTAssertEqual(data, v.hex("data"), "\(name) data")
            XCTAssertEqual(try DataMessage.open(keys: pk, data: data), envelope)
            assertProtocolError("decrypt_failed", "\(name) tampered") { _ = try DataMessage.open(keys: pk, data: v.hex("tamperedData")) }

            let ack = AckMessage.compute(keys: pk, envelope: envelope)
            XCTAssertEqual(ack, v.hex("ack"), "\(name) ack")
            XCTAssertTrue(AckMessage.verify(keys: ck, envelope: envelope, ack: ack))
            XCTAssertFalse(AckMessage.verify(keys: ck, envelope: envelope, ack: v.hex("tamperedAck")))

            for f in (v["frames"] as! [[String: Any]]) {
                let mtu = f.int("mtu")
                XCTAssertEqual(hexes(try Framing.split(.start, start, mtu: mtu)), hexes(f.hexList("start")), "\(name) start@\(mtu)")
                XCTAssertEqual(hexes(try Framing.split(.data, data, mtu: mtu)), hexes(f.hexList("data")), "\(name) data@\(mtu)")
                XCTAssertEqual(hexes(try Framing.split(.ack, ack, mtu: mtu)), hexes(f.hexList("ack")), "\(name) ack@\(mtu)")

                let session = try PayerSession(recordBytes: record, mtu: mtu, keyPair: payer)
                XCTAssertEqual(hexes(session.startFrames), hexes(f.hexList("start")), "\(name) session start@\(mtu)")
                let frames = f.hexList("data")
                for frame in frames.dropLast() {
                    guard case .incomplete = session.onIndication(frame) else { return XCTFail("\(name): expected incomplete") }
                }
                guard case let .delivered(token, ackFrames) = session.onIndication(frames.last!) else {
                    return XCTFail("\(name): expected delivery")
                }
                XCTAssertEqual(token, v.str("token"))
                XCTAssertEqual(hexes(ackFrames), hexes(f.hexList("ack")), "\(name) session ack@\(mtu)")
            }
        }
    }
}
