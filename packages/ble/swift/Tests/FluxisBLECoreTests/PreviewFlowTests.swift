import Foundation
import XCTest
@testable import FluxisBLECore

private struct FakeLink: FluxisBLEReadLink {
    var hasPreview = true
    var record: [UInt8]
    var preview: [UInt8]

    func discover() async throws -> Bool { hasPreview }
    func readRecord() async throws -> [UInt8] { record }
    func readPreview() async throws -> [UInt8] { preview }
}

final class PreviewFlowTests: XCTestCase {
    private let session: [UInt8] = Array(0..<16)
    private let token = "naspip;fluxis.us;fluxis.qr.dyn.1;v4.public." + String(repeating: "a", count: 388) // 431 bytes

    private func record(_ sid: [UInt8]? = nil) throws -> [UInt8] {
        try DiscoveryRecord(sessionId: sid ?? session, amount: FluxisAmount.parse("10.50", currency: "ARS"), displayName: "Casa Áureo").encode()
    }

    func testReadsNaspipPreview() async throws {
        let value = try PreviewValue(sessionId: session, content: .naspip(token)).encode()
        XCTAssertEqual(value.count, 449)
        let id = UUID()
        let p = try await PreviewFlow.read(over: FakeLink(record: try record(), preview: value), identifier: id, rssi: -48)
        XCTAssertEqual(p.token, token)
        XCTAssertNil(p.posId)
        XCTAssertEqual(p.record.displayName, "Casa Áureo")
        XCTAssertEqual(p.record.amount?.decimalString, "10.50")
        XCTAssertEqual(p.identifier, id)
        XCTAssertEqual(p.rssi, -48)
        XCTAssertFalse(p.description.contains(token), "description must not print the token")
    }

    func testReadsPosIdFallback() async throws {
        let pos = UUID(uuidString: "d2929894-2582-4877-8f92-ebe861f60987")!
        let value = try PreviewValue.forToken(sessionId: session, token: String(repeating: "t", count: 495), posId: pos).encode()
        let p = try await PreviewFlow.read(over: FakeLink(record: try record(), preview: value))
        XCTAssertEqual(p.posId, pos)
        XCTAssertNil(p.token)
    }

    func testMissingPreviewIsNotSupported() async throws {
        do {
            _ = try await PreviewFlow.read(over: FakeLink(hasPreview: false, record: try record(), preview: []))
            XCTFail("expected notSupported")
        } catch let e as FluxisBLEPayerError {
            XCTAssertEqual(e.reason, .notSupported)
        }
    }

    func testSessionMismatchIsInvalid() async throws {
        let value = try PreviewValue(sessionId: session, content: .naspip(token)).encode()
        do {
            _ = try await PreviewFlow.read(over: FakeLink(record: try record(Array(repeating: 9, count: 16)), preview: value))
            XCTFail("expected invalid")
        } catch let e as FluxisBLEPayerError {
            XCTAssertEqual(e.reason, .invalid)
            XCTAssertNil(e.protocolError)
        }
    }

    func testMalformedPreviewIsInvalidWithCode() async throws {
        do {
            _ = try await PreviewFlow.read(over: FakeLink(record: try record(), preview: [3] + session + [7]))
            XCTFail("expected invalid")
        } catch let e as FluxisBLEPayerError {
            XCTAssertEqual(e.reason, .invalid)
            XCTAssertEqual(e.protocolError, .unsupportedContent)
        }
    }
}
