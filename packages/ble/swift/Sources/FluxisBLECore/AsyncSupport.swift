import Foundation

/// A one-shot result that delegate callbacks resolve and async code awaits with a timeout.
/// Thread-safe; the first `resolve` wins. Used by the CoreBluetooth layer.
public final class FluxisBLEPending<Value: Sendable>: @unchecked Sendable {
    private let lock = NSLock()
    private var result: Result<Value, Error>?
    private var waiter: CheckedContinuation<Value, Error>?

    public init() {}

    public func resolve(_ value: Value) { complete(.success(value)) }

    public func fail(_ error: Error) { complete(.failure(error)) }

    /// Waits for the result. Throws `timeoutError` after `timeout` seconds, or
    /// `CancellationError` if the task is cancelled.
    public func wait(timeout: TimeInterval, timeoutError: @autoclosure @escaping @Sendable () -> Error) async throws -> Value {
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (c: CheckedContinuation<Value, Error>) in
                lock.lock()
                if let r = result {
                    lock.unlock()
                    c.resume(with: r)
                    return
                }
                waiter = c
                lock.unlock()
                DispatchQueue.global().asyncAfter(deadline: .now() + timeout) { [weak self] in
                    self?.complete(.failure(timeoutError()))
                }
            }
        } onCancel: {
            self.complete(.failure(CancellationError()))
        }
    }

    private func complete(_ r: Result<Value, Error>) {
        lock.lock()
        guard result == nil else {
            lock.unlock()
            return
        }
        result = r
        let w = waiter
        waiter = nil
        lock.unlock()
        w?.resume(with: r)
    }
}

public enum FluxisBLEAsync {
    /// Runs `body`, throwing `timeoutError` and cancelling it if it takes longer than `seconds`.
    public static func withDeadline<T: Sendable>(
        _ seconds: TimeInterval,
        timeoutError: @autoclosure @escaping @Sendable () -> Error,
        _ body: @escaping @Sendable () async throws -> T
    ) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask { try await body() }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(max(0, seconds) * 1_000_000_000))
                throw timeoutError()
            }
            defer { group.cancelAll() }
            guard let value = try await group.next() else { throw CancellationError() }
            return value
        }
    }
}
