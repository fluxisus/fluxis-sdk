#if canImport(CoreBluetooth)
@preconcurrency import CoreBluetooth
import Foundation
import FluxisBLECore

/// A collector whose discovery record was read. `displayName` and `amount` are hints only.
public struct FluxisBLECandidate: @unchecked Sendable {
    /// CoreBluetooth peripheral identifier (stable per device pair, not a MAC address).
    public let identifier: UUID
    public let rssi: Int
    public let record: DiscoveryRecord
    let peripheral: CBPeripheral

    public var displayName: String { record.displayName }
    public var amount: FluxisAmount? { record.amount }
}

/// Payer (wallet) role on iOS: finds Fluxis collectors and reads the active sale they publish
/// (docs/ble-protocol.md §7). Read-only and host-agnostic: it never claims or locks the POS
/// and never calls the Fluxis API.
///
/// ```swift
/// let payer = FluxisBLEPayer()
/// let preview = try await payer.readNearestPreview()   // or: discover() + readPreview(_:)
/// switch preview.content {
/// case .naspip(let token): merchant = try await api.readQR(token)        // POST /public/qr/read
/// case .posId(let posId):  break                                          // build the checkout URL
/// }
/// let sale = try await api.checkout(posId)                                // GET /public/checkout/pos/{posId}
/// // Show the API's merchant + amount; re-check the request is pending right before signing.
/// ```
///
/// Cancel the calling `Task` to abort; errors are `FluxisBLEPayerError` (cancellation surfaces
/// as `.cancelled`). The app's Info.plist needs `NSBluetoothAlwaysUsageDescription`; the system
/// prompt appears on the first call.
public final class FluxisBLEPayer: NSObject, @unchecked Sendable {
    public struct Options: Sendable {
        /// Lets iOS show its "Turn on Bluetooth" alert. Off by default so the wallet can show
        /// its own UI for `.bluetoothOff`.
        public var showPowerAlert: Bool
        public var connectTimeout: TimeInterval

        public init(showPowerAlert: Bool = false, connectTimeout: TimeInterval = 6) {
            self.showPowerAlert = showPowerAlert
            self.connectTimeout = connectTimeout
        }
    }

    private static let readyTimeout: TimeInterval = 5
    private static let settleWindow: TimeInterval = 0.8

    private let options: Options
    private let queue = DispatchQueue(label: "us.fluxis.ble.payer")

    // Queue-confined state.
    private var central: CBCentralManager?
    private var readyWaiters: [FluxisBLEPending<Void>] = []
    private var links: [UUID: PeripheralLink] = [:]
    private var scanSinks: [UUID: (CBPeripheral, Int) -> Void] = [:]

    public init(options: Options = Options()) {
        self.options = options
        super.init()
    }

    /// Scans for `scanTimeout` seconds, then reads the record of up to `maxCandidates`
    /// collectors (strongest signal first). Unreadable collectors are skipped.
    public func discover(scanTimeout: TimeInterval = 4, maxCandidates: Int = 5) async throws -> [FluxisBLECandidate] {
        try await mapErrors {
            let central = try await self.readyCentral()
            let seen = try await self.scan(central, until: .elapsed(scanTimeout))
            var candidates: [FluxisBLECandidate] = []
            for (peripheral, rssi) in seen.sorted(by: { $0.rssi > $1.rssi }).prefix(maxCandidates) {
                let record: DiscoveryRecord
                do {
                    record = try await self.readRecord(peripheral, central)
                } catch is CancellationError {
                    throw CancellationError()
                } catch {
                    continue
                }
                candidates.append(FluxisBLECandidate(identifier: peripheral.identifier, rssi: rssi, record: record, peripheral: peripheral))
            }
            return candidates
        }
    }

    /// Short connection to `candidate`: reads RECORD and PREVIEW (long read), then disconnects.
    /// Errors: `.notSupported` (no PREVIEW), `.timeout`, `.invalid`, `.connectionFailed`, …
    public func readPreview(_ candidate: FluxisBLECandidate, timeout: TimeInterval = FluxisBLEConstants.defaultReadTimeout) async throws -> FluxisBLEPreview {
        try await mapErrors {
            let central = try await self.readyCentral()
            return try await self.preview(candidate.peripheral, rssi: candidate.rssi, central, timeout: timeout)
        }
    }

    /// Scans until a collector is seen (keeping the strongest one found within a short settle
    /// window) and reads its preview. For the common "hold the phone near the POS" flow.
    public func readNearestPreview(scanTimeout: TimeInterval = 6, timeout: TimeInterval = FluxisBLEConstants.defaultReadTimeout) async throws -> FluxisBLEPreview {
        try await mapErrors {
            let central = try await self.readyCentral()
            let seen = try await self.scan(central, until: .firstSeen(within: scanTimeout, settle: Self.settleWindow))
            guard let nearest = seen.max(by: { $0.rssi < $1.rssi }) else {
                throw FluxisBLEPayerError(.notFound, "no Fluxis collector in range")
            }
            return try await self.preview(nearest.peripheral, rssi: nearest.rssi, central, timeout: timeout)
        }
    }

    // MARK: Central lifecycle

    private func readyCentral() async throws -> CBCentralManager {
        let pending = FluxisBLEPending<Void>()
        let central: CBCentralManager = queue.sync {
            let c = self.central ?? CBCentralManager(
                delegate: self,
                queue: queue,
                options: [CBCentralManagerOptionShowPowerAlertKey: options.showPowerAlert]
            )
            self.central = c
            switch Self.readiness(c.state) {
            case .some(.success): pending.resolve(())
            case let .some(.failure(error)): pending.fail(error)
            case .none: readyWaiters.append(pending)
            }
            return c
        }
        try await pending.wait(
            timeout: Self.readyTimeout,
            timeoutError: FluxisBLEPayerError(.bluetoothUnavailable, "Bluetooth did not become ready")
        )
        return central
    }

    private static func readiness(_ state: CBManagerState) -> Result<Void, FluxisBLEPayerError>? {
        switch state {
        case .poweredOn: return .success(())
        case .poweredOff: return .failure(FluxisBLEPayerError(.bluetoothOff, "Bluetooth is off"))
        case .unauthorized: return .failure(FluxisBLEPayerError(.unauthorized, "Bluetooth permission denied"))
        case .unsupported: return .failure(FluxisBLEPayerError(.bluetoothUnavailable, "Bluetooth LE is not supported"))
        case .unknown, .resetting: return nil
        @unknown default: return nil
        }
    }

    // MARK: Scanning

    private enum ScanStop {
        case elapsed(TimeInterval)
        case firstSeen(within: TimeInterval, settle: TimeInterval)
    }

    private final class ScanResults: @unchecked Sendable {
        private let lock = NSLock()
        private var best: [UUID: (peripheral: CBPeripheral, rssi: Int)] = [:]
        let first = FluxisBLEPending<Void>()

        func add(_ peripheral: CBPeripheral, _ rssi: Int) {
            lock.lock()
            if (best[peripheral.identifier]?.rssi ?? Int.min) < rssi { best[peripheral.identifier] = (peripheral, rssi) }
            lock.unlock()
            first.resolve(())
        }

        var snapshot: [(peripheral: CBPeripheral, rssi: Int)] {
            lock.lock()
            defer { lock.unlock() }
            return Array(best.values)
        }
    }

    private func scan(_ central: CBCentralManager, until stop: ScanStop) async throws -> [(peripheral: CBPeripheral, rssi: Int)] {
        let results = ScanResults()
        let token = UUID()
        queue.sync {
            let wasScanning = !scanSinks.isEmpty
            scanSinks[token] = { results.add($0, $1) }
            if !wasScanning {
                // Duplicates keep RSSI fresh while the user brings the phone closer.
                central.scanForPeripherals(
                    withServices: [CBUUID(nsuuid: FluxisBLEConstants.serviceUUID)],
                    options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
                )
            }
        }
        defer {
            queue.async { [weak self] in
                guard let self = self else { return }
                self.scanSinks[token] = nil
                if self.scanSinks.isEmpty, central.state == .poweredOn { central.stopScan() }
            }
        }
        switch stop {
        case let .elapsed(seconds):
            try await Task.sleep(nanoseconds: Self.nanoseconds(seconds))
        case let .firstSeen(within, settle):
            try await results.first.wait(
                timeout: within,
                timeoutError: FluxisBLEPayerError(.notFound, "no Fluxis collector in range")
            )
            try await Task.sleep(nanoseconds: Self.nanoseconds(settle))
        }
        return results.snapshot
    }

    // MARK: Connections

    private func readRecord(_ peripheral: CBPeripheral, _ central: CBCentralManager) async throws -> DiscoveryRecord {
        try await FluxisBLEAsync.withDeadline(FluxisBLEConstants.defaultReadTimeout, timeoutError: FluxisBLEPayerError(.timeout, "record read timed out")) {
            let link = try await self.connect(peripheral, central)
            defer { self.disconnect(link) }
            _ = try await link.discover()
            do {
                return try DiscoveryRecord.decode(try await link.readRecord())
            } catch let e as FluxisBLEProtocolError {
                throw FluxisBLEPayerError(.invalid, "invalid discovery record: \(e.rawValue)", protocolError: e)
            }
        }
    }

    private func preview(_ peripheral: CBPeripheral, rssi: Int, _ central: CBCentralManager, timeout: TimeInterval) async throws -> FluxisBLEPreview {
        try await FluxisBLEAsync.withDeadline(timeout, timeoutError: FluxisBLEPayerError(.timeout, "preview read timed out")) {
            let link = try await self.connect(peripheral, central)
            defer { self.disconnect(link) }
            return try await PreviewFlow.read(over: link, identifier: peripheral.identifier, rssi: rssi)
        }
    }

    private func connect(_ peripheral: CBPeripheral, _ central: CBCentralManager) async throws -> PeripheralLink {
        let link = PeripheralLink(peripheral: peripheral, queue: queue)
        queue.sync {
            links[peripheral.identifier]?.close(FluxisBLEPayerError(.connectionFailed, "superseded by a new connection"))
            links[peripheral.identifier] = link
            central.connect(peripheral, options: nil)
        }
        do {
            // CoreBluetooth never times out a connect on its own.
            try await link.connected.wait(
                timeout: options.connectTimeout,
                timeoutError: FluxisBLEPayerError(.connectionFailed, "connection timed out")
            )
            return link
        } catch {
            disconnect(link)
            throw error
        }
    }

    private func disconnect(_ link: PeripheralLink) {
        queue.async { [weak self] in
            link.close(FluxisBLEPayerError(.connectionFailed, "disconnected"))
            guard let self = self else { return }
            if self.links[link.peripheral.identifier] === link { self.links[link.peripheral.identifier] = nil }
            if let central = self.central, central.state == .poweredOn {
                central.cancelPeripheralConnection(link.peripheral)
            }
        }
    }

    private func mapErrors<T>(_ body: () async throws -> T) async throws -> T {
        do {
            return try await body()
        } catch let e as FluxisBLEPayerError {
            throw e
        } catch is CancellationError {
            throw FluxisBLEPayerError(.cancelled, "cancelled")
        } catch {
            throw FluxisBLEPayerError(.connectionFailed, String(describing: error))
        }
    }

    private static func nanoseconds(_ seconds: TimeInterval) -> UInt64 { UInt64(max(0, seconds) * 1_000_000_000) }
}

extension FluxisBLEPayer: CBCentralManagerDelegate {
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        guard let readiness = Self.readiness(central.state) else { return }
        let waiters = readyWaiters
        readyWaiters.removeAll()
        switch readiness {
        case .success:
            waiters.forEach { $0.resolve(()) }
        case let .failure(error):
            waiters.forEach { $0.fail(error) }
            // Powering off drops connections without didDisconnectPeripheral.
            links.values.forEach { $0.close(error) }
            links.removeAll()
        }
    }

    public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        // 127 means "RSSI unavailable".
        let rssi = RSSI.intValue == 127 ? -127 : RSSI.intValue
        scanSinks.values.forEach { $0(peripheral, rssi) }
    }

    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        links[peripheral.identifier]?.connected.resolve(())
    }

    public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        let reason = error?.localizedDescription ?? "unknown error"
        links.removeValue(forKey: peripheral.identifier)?.close(FluxisBLEPayerError(.connectionFailed, "connect failed: \(reason)"))
    }

    public func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        let reason = error?.localizedDescription ?? "disconnected by collector"
        links.removeValue(forKey: peripheral.identifier)?.close(FluxisBLEPayerError(.connectionFailed, reason))
    }
}
#endif
