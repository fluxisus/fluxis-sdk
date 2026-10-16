#if canImport(CoreBluetooth)
import Foundation
import FluxisBLECore

public enum FluxisBLECollectorError: Error, Sendable {
    /// The iOS collector is not implemented yet; use the Android collector for POS devices.
    case notImplemented
}

/// Collector (POS) role on iOS — scaffold only.
///
/// A real implementation needs a `CBPeripheralManager` GATT server with the RECORD, CONTROL
/// and DATA characteristics (docs/ble-protocol.md §3) and a Swift port of the Kotlin
/// `CollectorEngine` state machine (§6). Platform limits to plan for:
/// - iOS advertises the service UUID only while the app is in the foreground; in the background
///   it moves to the "overflow area", which Android payers filtering by UUID do not see.
/// - The advertised local name and TX power cannot be controlled.
///
/// The API mirrors the Android `FluxisBleCollector.start(token, amount, displayName, ttl)`
/// so callers can be written against it today.
public final class FluxisBLECollector {
    public init() {}

    public func start(
        token: String,
        amount: FluxisAmount?,
        displayName: String,
        ttlSeconds: Int = FluxisBLEConstants.defaultTTLSeconds
    ) throws {
        throw FluxisBLECollectorError.notImplemented
    }

    public func stop() {}
}
#endif
