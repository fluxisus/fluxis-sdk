import Foundation
import XCTest
@testable import FluxisBLECore

/// Runs every section of the shared test vectors against the Swift implementation.
final class VectorConformanceTests: XCTestCase {
    func testConstants() {
        XCTAssertEqual(Int(FluxisBLEConstants.protocolVersion), (Vectors.root["protocolVersion"] as! NSNumber).intValue)
        let uuids = Vectors.section("uuids") as! [String: Any]
        XCTAssertEqual(uuids.count, 3)
        XCTAssertEqual(FluxisBLEConstants.serviceUUID.uuidString.lowercased(), uuids.str("service"))
        XCTAssertEqual(FluxisBLEConstants.recordUUID.uuidString.lowercased(), uuids.str("record"))
        XCTAssertEqual(FluxisBLEConstants.previewUUID.uuidString.lowercased(), uuids.str("preview"))

        let limits = Vectors.section("limits") as! [String: Any]
        XCTAssertEqual(FluxisBLEConstants.maxAttributeBytes, limits.int("maxAttributeBytes"))
        XCTAssertEqual(FluxisBLEConstants.maxPreviewTokenBytes, limits.int("maxPreviewTokenBytes"))
        XCTAssertEqual(FluxisBLEConstants.maxRecordBytes, limits.int("maxRecordBytes"))
        XCTAssertEqual(FluxisBLEConstants.sessionIdBytes, limits.int("sessionIdBytes"))
        XCTAssertEqual(FluxisBLEConstants.maxDisplayNameBytes, limits.int("maxDisplayNameBytes"))
        XCTAssertEqual(Int(FluxisBLEConstants.idleTimeout * 1000), limits.int("idleTimeoutMs"))

        let kinds = Vectors.section("previewKinds") as! [String: Any]
        XCTAssertEqual(Int(FluxisBLEPreviewContent.kindNaspip), kinds.int("naspip"))
        XCTAssertEqual(Int(FluxisBLEPreviewContent.kindPosId), kinds.int("pos_id"))

        let known = Set(FluxisBLEProtocolError.allCases.map(\.rawValue))
        var used = Set<String>()
        for path in [["amounts", "invalid"], ["records", "invalid"], ["previews", "invalid"], ["previews", "choiceErrors"]] {
            for v in Vectors.list(path[0], path[1]) { used.insert(v.str("error")) }
        }
        XCTAssertEqual(used.subtracting(known), [], "error codes in vectors missing from FluxisBLEProtocolError")
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
            XCTAssertEqual(r.sessionId, v.hex("sessionId"), name)
            XCTAssertEqual(r.displayName, v.str("displayName"), name)
            if v.isNull("amount") {
                XCTAssertNil(r.amount, name)
            } else {
                let a = v.obj("amount")
                let cur = a.str("currency")
                XCTAssertEqual(r.amount, try FluxisAmount(minorUnits: Int64(a.str("minor"))!, scale: a.int("scale"), currency: cur.isEmpty ? nil : cur), name)
            }
            if !v.flag("decodeOnly") { XCTAssertEqual(try r.encode().hexString, v.str("hex"), "\(name) (re-encode)") }
        }
        for v in Vectors.list("records", "invalid") {
            assertProtocolError(v.str("error"), "record: \(v.str("name"))") { _ = try DiscoveryRecord.decode(v.hex("hex")) }
        }
    }

    func testPreviews() throws {
        for v in Vectors.list("previews", "valid") {
            let name = v.str("name")
            let p = try PreviewValue.decode(v.hex("hex"))
            XCTAssertEqual(p.sessionId, v.hex("sessionId"), name)
            XCTAssertEqual(v.hex("hex").count, v.int("length"), name)
            let expected: FluxisBLEPreviewContent = v.str("kind") == "pos_id" ? .posId(UUID(uuidString: v.str("posId"))!) : .naspip(v.str("token"))
            XCTAssertEqual(p.content, expected, name)
            XCTAssertEqual(try PreviewValue(sessionId: v.hex("sessionId"), content: expected).encode().hexString, v.str("hex"), "\(name) (re-encode)")
        }
        for v in Vectors.list("previews", "choice") {
            let p = try PreviewValue.forToken(sessionId: v.hex("sessionId"), token: v.str("token"), posId: UUID(uuidString: v.str("posId")))
            XCTAssertEqual(try p.encode().hexString, v.str("hex"), v.str("name"))
            XCTAssertEqual(p.content.isPosId ? "pos_id" : "naspip", v.str("kind"), v.str("name"))
        }
        for v in Vectors.list("previews", "choiceErrors") {
            let posId = (v["posId"] as? String).flatMap(UUID.init(uuidString:))
            assertProtocolError(v.str("error"), "choice: \(v.str("name"))") {
                _ = try PreviewValue.forToken(sessionId: v.hex("sessionId"), token: v.str("token"), posId: posId)
            }
        }
        for v in Vectors.list("previews", "invalid") {
            assertProtocolError(v.str("error"), "preview: \(v.str("name"))") { _ = try PreviewValue.decode(v.hex("hex")) }
        }
    }
}

private extension FluxisBLEPreviewContent {
    var isPosId: Bool {
        if case .posId = self { return true }
        return false
    }
}
