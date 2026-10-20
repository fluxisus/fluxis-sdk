#if canImport(CoreBluetooth)
@preconcurrency import CoreBluetooth
import Foundation
import FluxisBLECore

/// `FluxisBLEReadLink` over one connected `CBPeripheral`. All CoreBluetooth calls and delegate
/// callbacks run on the payer's serial queue; async callers wait on `FluxisBLEPending`.
/// `readValue(for:)` performs ATT long reads by itself (values up to 512 bytes).
final class PeripheralLink: NSObject, FluxisBLEReadLink, CBPeripheralDelegate, @unchecked Sendable {
    static let operationTimeout: TimeInterval = 5

    let peripheral: CBPeripheral
    let connected = FluxisBLEPending<Void>()
    private let queue: DispatchQueue

    // Queue-confined state.
    private var closedError: Error?
    private var recordCharacteristic: CBCharacteristic?
    private var previewCharacteristic: CBCharacteristic?
    private var discoveryPending: FluxisBLEPending<Bool>?
    private var readPending: (uuid: CBUUID, pending: FluxisBLEPending<[UInt8]>)?

    private static let serviceUUID = CBUUID(nsuuid: FluxisBLEConstants.serviceUUID)
    private static let recordUUID = CBUUID(nsuuid: FluxisBLEConstants.recordUUID)
    private static let previewUUID = CBUUID(nsuuid: FluxisBLEConstants.previewUUID)

    init(peripheral: CBPeripheral, queue: DispatchQueue) {
        self.peripheral = peripheral
        self.queue = queue
        super.init()
        peripheral.delegate = self
    }

    // MARK: FluxisBLEReadLink

    /// Discovers `SERVICE`, RECORD and PREVIEW. Throws if RECORD is missing; returns whether
    /// PREVIEW exists.
    func discover() async throws -> Bool {
        try await perform("service discovery") { link, pending in
            link.discoveryPending = pending
            link.peripheral.discoverServices([Self.serviceUUID])
        }
    }

    func readRecord() async throws -> [UInt8] {
        try await read("RECORD", Self.recordUUID) { $0.recordCharacteristic }
    }

    func readPreview() async throws -> [UInt8] {
        try await read("PREVIEW", Self.previewUUID) { $0.previewCharacteristic }
    }

    /// Fails every pending and future operation. Called on the queue.
    func close(_ error: Error) {
        guard closedError == nil else { return }
        closedError = error
        connected.fail(error)
        discoveryPending?.fail(error)
        readPending?.pending.fail(error)
    }

    // MARK: CBPeripheralDelegate

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let pending = discoveryPending else { return }
        if let error = error { return pending.fail(Self.gattError("service discovery", error)) }
        guard let service = peripheral.services?.first(where: { $0.uuid == Self.serviceUUID }) else {
            return pending.fail(FluxisBLEPayerError(.notSupported, "Fluxis service missing"))
        }
        peripheral.discoverCharacteristics([Self.recordUUID, Self.previewUUID], for: service)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let pending = discoveryPending else { return }
        discoveryPending = nil
        if let error = error { return pending.fail(Self.gattError("characteristic discovery", error)) }
        let characteristics = service.characteristics ?? []
        recordCharacteristic = characteristics.first { $0.uuid == Self.recordUUID }
        previewCharacteristic = characteristics.first { $0.uuid == Self.previewUUID }
        guard recordCharacteristic != nil else {
            return pending.fail(FluxisBLEPayerError(.notSupported, "RECORD characteristic missing"))
        }
        pending.resolve(previewCharacteristic != nil)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard let current = readPending, characteristic.uuid == current.uuid else { return }
        readPending = nil
        let pending = current.pending
        if let error = error { return pending.fail(Self.gattError("\(current.uuid) read", error)) }
        pending.resolve(characteristic.value.map { [UInt8]($0) } ?? [])
    }

    // MARK: Helpers

    private func read(_ name: String, _ uuid: CBUUID, _ characteristic: @escaping @Sendable (PeripheralLink) -> CBCharacteristic?) async throws -> [UInt8] {
        try await perform("\(name) read") { link, pending in
            guard let c = characteristic(link) else { throw FluxisBLEPayerError(.notSupported, "\(name) characteristic not discovered") }
            link.readPending = (uuid, pending)
            link.peripheral.readValue(for: c)
        }
    }

    /// Runs `start` on the queue with a fresh pending result for it to install, and waits. One
    /// operation is in flight at a time.
    private func perform<T: Sendable>(
        _ what: String,
        _ start: @escaping @Sendable (PeripheralLink, FluxisBLEPending<T>) throws -> Void
    ) async throws -> T {
        let pending = FluxisBLEPending<T>()
        queue.async {
            if let error = self.closedError { return pending.fail(error) }
            do { try start(self, pending) } catch { pending.fail(error) }
        }
        return try await pending.wait(
            timeout: Self.operationTimeout,
            timeoutError: FluxisBLEPayerError(.timeout, "\(what) timed out")
        )
    }

    private static func gattError(_ what: String, _ error: Error) -> FluxisBLEPayerError {
        FluxisBLEPayerError(.connectionFailed, "\(what) failed: \(error.localizedDescription)")
    }
}
#endif
