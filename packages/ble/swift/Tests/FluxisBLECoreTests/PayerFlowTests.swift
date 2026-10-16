import Foundation
import XCTest
@testable import FluxisBLECore

/// A scripted collector over an in-memory link, built from the first handshake vector.
private final class ScriptedCollector: FluxisBLELink {
    enum Behaviour { case deliver, busy, reject(CollectorErrorCode), silent, tamper }

    let maximumValueLength: Int
    let record: [UInt8]
    private let collectorKey: P256KeyPair
    private let token: String
    private let nonce: [UInt8]
    private let behaviour: Behaviour
    private let inbox = FluxisBLEInbox()
    private let reassembler = Reassembler(direction: .toCollector)
    private var keys: SessionKeys?
    private(set) var subscribed = false
    private(set) var ackVerified = false
    private(set) var abortReason: AbortReason?

    init(mtu: Int, behaviour: Behaviour, recordOverride: [UInt8]? = nil) throws {
        let v = Vectors.list("handshakes")[0]
        maximumValueLength = mtu - 3
        record = recordOverride ?? v.hex("record")
        collectorKey = try P256KeyPair(privateScalar: v.hex("collectorPrivateKey"))
        token = v.str("token")
        nonce = v.hex("nonce")
        self.behaviour = behaviour
    }

    func readRecord() async throws -> [UInt8] { record }

    func subscribeToData() async throws { subscribed = true }

    func writeControl(_ frame: [UInt8]) async throws {
        guard let message = try reassembler.push(frame) else { return }
        let mtu = maximumValueLength + 3
        switch message.type {
        case .start:
            XCTAssertTrue(subscribed, "payer must subscribe before START")
            let start = try StartMessage.decode(message.payload)
            switch behaviour {
            case .busy:
                try Framing.split(.busy, [], mtu: mtu).forEach(inbox.push)
            case let .reject(code):
                try Framing.split(.error, [code.rawValue], mtu: mtu).forEach(inbox.push)
            case .silent:
                break
            case .deliver, .tamper:
                let k = try KeySchedule.derive(own: collectorKey, peerPublicKey: start.payerPublicKey, record: record, start: message.payload)
                keys = k
                var data = try DataMessage.seal(keys: k, nonce: nonce, envelope: try Envelope.encodeNaspip(token))
                if case .tamper = behaviour { data[20] ^= 0x01 }
                try Framing.split(.data, data, mtu: mtu).forEach(inbox.push)
            }
        case .ack:
            ackVerified = AckMessage.verify(keys: keys!, envelope: try Envelope.encodeNaspip(token), ack: message.payload)
        case .abort:
            abortReason = AbortReason.from(message.payload[0])
        default:
            XCTFail("unexpected \(message.type)")
        }
    }

    func nextIndication(timeout: TimeInterval) async throws -> [UInt8]? {
        try await inbox.next(timeout: min(timeout, 0.2))
    }
}

final class PayerFlowTests: XCTestCase {
    private let validNow = Date(timeIntervalSince1970: 1_792_799_000)

    func testDeliversAtEveryMtu() async throws {
        for mtu in [23, 185, 517] {
            let link = try ScriptedCollector(mtu: mtu, behaviour: .deliver)
            let delivery = try await PayerFlow.deliver(over: link, now: validNow)
            XCTAssertEqual(delivery.token, Vectors.list("handshakes")[0].str("token"))
            XCTAssertEqual(delivery.record.amount?.description, "ARS 12.50")
            XCTAssertTrue(link.ackVerified, "collector must accept the ACK at MTU \(mtu)")
        }
    }

    func testBusy() async throws {
        try await expect(.busy, .busy)
    }

    func testRejected() async throws {
        let error = try await expect(.reject(.sessionMismatch), .rejected)
        XCTAssertEqual(error.collectorError, .sessionMismatch)
    }

    func testRejectedExpiredMapsToExpired() async throws {
        try await expect(.reject(.expired), .expired)
    }

    func testSilentCollectorTimesOutAndAborts() async throws {
        let link = try ScriptedCollector(mtu: 23, behaviour: .silent)
        await assertPayerError(.timeout) { _ = try await PayerFlow.deliver(over: link, now: self.validNow) }
        XCTAssertEqual(link.abortReason, .timeout)
    }

    func testTamperedDataAbortsWithDecryptFailed() async throws {
        let link = try ScriptedCollector(mtu: 185, behaviour: .tamper)
        await assertPayerError(.decryptFailed) { _ = try await PayerFlow.deliver(over: link, now: self.validNow) }
        XCTAssertEqual(link.abortReason, .decryptFailed)
    }

    func testExpiredRecordIsRefusedBeforeStart() async throws {
        let link = try ScriptedCollector(mtu: 23, behaviour: .deliver)
        await assertPayerError(.expired) { _ = try await PayerFlow.deliver(over: link, now: Date(timeIntervalSince1970: 1_792_800_061)) }
        XCTAssertFalse(link.subscribed)
    }

    func testInvalidRecordIsAProtocolError() async throws {
        var bad = Vectors.list("handshakes")[0].hex("record")
        bad[0] = 0x02
        let link = try ScriptedCollector(mtu: 23, behaviour: .deliver, recordOverride: bad)
        await assertPayerError(.protocolError) { _ = try await PayerFlow.deliver(over: link, now: self.validNow) }
    }

    func testInboxTimeoutAndFailure() async throws {
        let inbox = FluxisBLEInbox()
        let none = try await inbox.next(timeout: 0.05)
        XCTAssertNil(none)
        inbox.push([1])
        let one = try await inbox.next(timeout: 1)
        XCTAssertEqual(one, [1])
        inbox.fail(FluxisBLEPayerError(.connectionFailed, "gone"))
        do {
            _ = try await inbox.next(timeout: 1)
            XCTFail("expected failure")
        } catch let e as FluxisBLEPayerError {
            XCTAssertEqual(e.reason, .connectionFailed)
        }
    }

    func testPendingResolvesTimesOutAndCancels() async throws {
        let p = FluxisBLEPending<Int>()
        DispatchQueue.global().asyncAfter(deadline: .now() + 0.02) { p.resolve(7) }
        let seven = try await p.wait(timeout: 1, timeoutError: FluxisBLEPayerError(.timeout, "t"))
        XCTAssertEqual(seven, 7)

        let slow = FluxisBLEPending<Int>()
        await assertPayerError(.timeout) { _ = try await slow.wait(timeout: 0.05, timeoutError: FluxisBLEPayerError(.timeout, "t")) }

        let cancelled = FluxisBLEPending<Int>()
        let task = Task { try await cancelled.wait(timeout: 5, timeoutError: FluxisBLEPayerError(.timeout, "t")) }
        task.cancel()
        do {
            _ = try await task.value
            XCTFail("expected cancellation")
        } catch is CancellationError {}
    }

    func testDeadline() async throws {
        let fast = try await FluxisBLEAsync.withDeadline(1, timeoutError: FluxisBLEPayerError(.timeout, "t")) { 42 }
        XCTAssertEqual(fast, 42)

        let started = Date()
        let pending = FluxisBLEPending<Int>()
        await assertPayerError(.timeout) {
            _ = try await FluxisBLEAsync.withDeadline(0.05, timeoutError: FluxisBLEPayerError(.timeout, "t")) {
                try await pending.wait(timeout: 10, timeoutError: FluxisBLEPayerError(.connectionFailed, "slow"))
            }
        }
        XCTAssertLessThan(Date().timeIntervalSince(started), 2)
    }

    func testAmountAndNameHelpers() throws {
        XCTAssertEqual(try FluxisAmount(minorUnits: 5, scale: 2, currency: "USD").decimalString, "0.05")
        XCTAssertEqual(try FluxisAmount.parse("12.50", currency: "ARS").decimalValue, Decimal(string: "12.5"))
        XCTAssertEqual(try DiscoveryRecord.fitDisplayName("  " + String(repeating: "é", count: 40)).utf8.count, 64)
        XCTAssertEqual(try DiscoveryRecord.fitDisplayName(String(repeating: "€", count: 30)).utf8.count, 63)
        XCTAssertThrowsError(try DiscoveryRecord.fitDisplayName("   "))
    }

    @discardableResult
    private func expect(_ behaviour: ScriptedCollector.Behaviour, _ reason: FluxisBLEPayerError.Reason) async throws -> FluxisBLEPayerError {
        let link = try ScriptedCollector(mtu: 23, behaviour: behaviour)
        do {
            _ = try await PayerFlow.deliver(over: link, now: validNow)
        } catch let e as FluxisBLEPayerError {
            XCTAssertEqual(e.reason, reason)
            return e
        }
        XCTFail("expected \(reason)")
        return FluxisBLEPayerError(reason, "")
    }

    private func assertPayerError(_ reason: FluxisBLEPayerError.Reason, file: StaticString = #filePath, line: UInt = #line, _ block: () async throws -> Void) async {
        do {
            try await block()
            XCTFail("expected \(reason)", file: file, line: line)
        } catch let e as FluxisBLEPayerError {
            XCTAssertEqual(e.reason, reason, e.message, file: file, line: line)
        } catch {
            XCTFail("unexpected \(error)", file: file, line: line)
        }
    }
}
