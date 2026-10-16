#if canImport(CoreBluetooth)
@preconcurrency import CoreBluetooth
import Foundation
import FluxisBLECore

/// `FluxisBLELink` over one connected `CBPeripheral`. All CoreBluetooth calls and delegate
/// callbacks run on the payer's serial queue; async callers wait on `FluxisBLEPending`.
final class PeripheralLink: NSObject, FluxisBLELink, CBPeripheralDelegate, @unchecked Sendable {
    static let operationTimeout: TimeInterval = 5

    let peripheral: CBPeripheral
    let connected = FluxisBLEPending<Void>()
    private let queue: DispatchQueue
    private let inbox = FluxisBLEInbox()

    // Queue-confined state.
    private var closedError: Error?
    private var recordCharacteristic: CBCharacteristic?
    private var controlCharacteristic: CBCharacteristic?
    private var dataCharacteristic: CBCharacteristic?
    private var discoveryPending: FluxisBLEPending<Void>?
    private var readPending: FluxisBLEPending<[UInt8]>?
    private var notifyPending: FluxisBLEPending<Void>?
    private var writePending: FluxisBLEPending<Void>?

    init(peripheral: CBPeripheral, queue: DispatchQueue) {
        self.peripheral = peripheral
        self.queue = queue
        super.init()
        peripheral.delegate = self
    }

    // MARK: FluxisBLELink

    /// ATT_MTU − 3. iOS negotiates the MTU itself; this is read after discovery, by which time
    /// the exchange has completed.
    var maximumValueLength: Int {
        queue.sync { peripheral.maximumWriteValueLength(for: .withoutResponse) }
    }

    func discoverService() async throws {
        try await perform("service discovery") { link, pending in
            link.discoveryPending = pending
            link.peripheral.discoverServices([CBUUID(nsuuid: FluxisBLEConstants.serviceUUID)])
        }
    }

    func readRecord() async throws -> [UInt8] {
        try await perform("record read") { link, pending in
            guard let c = link.recordCharacteristic else { throw Self.missing("RECORD") }
            link.readPending = pending
            link.peripheral.readValue(for: c)
        }
    }

    func subscribeToData() async throws {
        try await perform("DATA subscription") { link, pending in
            guard let c = link.dataCharacteristic else { throw Self.missing("DATA") }
            link.notifyPending = pending
            link.peripheral.setNotifyValue(true, for: c)
        }
    }

    func writeControl(_ frame: [UInt8]) async throws {
        try await perform("CONTROL write") { link, pending in
            guard let c = link.controlCharacteristic else { throw Self.missing("CONTROL") }
            link.writePending = pending
            // Frames never exceed ATT_MTU − 3, so this is a plain Write Request; collectors
            // reject prepared (long) writes.
            link.peripheral.writeValue(Data(frame), for: c, type: .withResponse)
        }
    }

    func nextIndication(timeout: TimeInterval) async throws -> [UInt8]? {
        try await inbox.next(timeout: timeout)
    }

    /// Fails every pending and future operation. Called on the queue.
    func close(_ error: Error) {
        guard closedError == nil else { return }
        closedError = error
        connected.fail(error)
        discoveryPending?.fail(error)
        readPending?.fail(error)
        notifyPending?.fail(error)
        writePending?.fail(error)
        inbox.fail(error)
    }

    // MARK: CBPeripheralDelegate

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let pending = discoveryPending else { return }
        if let error = error { return pending.fail(Self.gattError("service discovery", error)) }
        guard let service = peripheral.services?.first(where: { $0.uuid == CBUUID(nsuuid: FluxisBLEConstants.serviceUUID) }) else {
            return pending.fail(FluxisBLEPayerError(.protocolError, "Fluxis service missing"))
        }
        peripheral.discoverCharacteristics(
            [FluxisBLEConstants.recordUUID, FluxisBLEConstants.controlUUID, FluxisBLEConstants.dataUUID].map { CBUUID(nsuuid: $0) },
            for: service
        )
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let pending = discoveryPending else { return }
        if let error = error { return pending.fail(Self.gattError("characteristic discovery", error)) }
        let characteristics = service.characteristics ?? []
        func find(_ uuid: UUID) -> CBCharacteristic? { characteristics.first { $0.uuid == CBUUID(nsuuid: uuid) } }
        recordCharacteristic = find(FluxisBLEConstants.recordUUID)
        controlCharacteristic = find(FluxisBLEConstants.controlUUID)
        dataCharacteristic = find(FluxisBLEConstants.dataUUID)
        guard recordCharacteristic != nil, controlCharacteristic != nil, dataCharacteristic != nil else {
            return pending.fail(FluxisBLEPayerError(.protocolError, "Fluxis characteristics missing"))
        }
        pending.resolve(())
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        let bytes = characteristic.value.map { [UInt8]($0) } ?? []
        if characteristic.uuid == CBUUID(nsuuid: FluxisBLEConstants.dataUUID) {
            if error == nil { inbox.push(bytes) }
        } else if characteristic.uuid == CBUUID(nsuuid: FluxisBLEConstants.recordUUID), let pending = readPending {
            if let error = error { return pending.fail(Self.gattError("record read", error)) }
            pending.resolve(bytes)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        guard characteristic.uuid == CBUUID(nsuuid: FluxisBLEConstants.dataUUID), let pending = notifyPending else { return }
        if let error = error { return pending.fail(Self.gattError("DATA subscription", error)) }
        guard characteristic.isNotifying else {
            return pending.fail(FluxisBLEPayerError(.protocolError, "collector refused DATA indications"))
        }
        pending.resolve(())
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        guard characteristic.uuid == CBUUID(nsuuid: FluxisBLEConstants.controlUUID), let pending = writePending else { return }
        if let error = error { return pending.fail(Self.gattError("CONTROL write", error)) }
        pending.resolve(())
    }

    // MARK: Helpers

    /// Runs `start` on the queue with a fresh pending result for it to install, and waits. The
    /// protocol is strictly request/response, so one operation of each kind is in flight at most.
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

    private static func missing(_ name: String) -> FluxisBLEPayerError {
        FluxisBLEPayerError(.protocolError, "\(name) characteristic not discovered")
    }

    private static func gattError(_ what: String, _ error: Error) -> FluxisBLEPayerError {
        FluxisBLEPayerError(.connectionFailed, "\(what) failed: \(error.localizedDescription)")
    }
}
#endif
