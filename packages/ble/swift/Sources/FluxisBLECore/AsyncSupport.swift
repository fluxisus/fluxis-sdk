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

/// FIFO of DATA indications with a timeout-aware `next`. Thread-safe.
public final class FluxisBLEInbox: @unchecked Sendable {
    private let lock = NSLock()
    private var buffer: [[UInt8]] = []
    private var failure: Error?
    private var waiter: (id: UInt64, continuation: CheckedContinuation<[UInt8]?, Error>)?
    private var nextId: UInt64 = 0

    public init() {}

    public func push(_ frame: [UInt8]) {
        lock.lock()
        if let w = waiter {
            waiter = nil
            lock.unlock()
            w.continuation.resume(returning: frame)
        } else {
            buffer.append(frame)
            lock.unlock()
        }
    }

    /// Fails the current and every later `next` call (e.g. on disconnect).
    public func fail(_ error: Error) {
        lock.lock()
        if failure == nil { failure = error }
        let w = waiter
        waiter = nil
        lock.unlock()
        w?.continuation.resume(throwing: error)
    }

    /// Next frame, or `nil` after `timeout` seconds without one.
    public func next(timeout: TimeInterval) async throws -> [UInt8]? {
        let id = allocateWaiterId()
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (c: CheckedContinuation<[UInt8]?, Error>) in
                lock.lock()
                if !buffer.isEmpty {
                    let f = buffer.removeFirst()
                    lock.unlock()
                    c.resume(returning: f)
                    return
                }
                if let e = failure {
                    lock.unlock()
                    c.resume(throwing: e)
                    return
                }
                waiter = (id, c)
                lock.unlock()
                DispatchQueue.global().asyncAfter(deadline: .now() + timeout) { [weak self] in
                    self?.resolveWaiter(id, .success(nil))
                }
            }
        } onCancel: {
            self.resolveWaiter(id, .failure(CancellationError()))
        }
    }

    private func allocateWaiterId() -> UInt64 {
        lock.lock()
        defer { lock.unlock() }
        nextId &+= 1
        return nextId
    }

    private func resolveWaiter(_ id: UInt64, _ r: Result<[UInt8]?, Error>) {
        lock.lock()
        guard let w = waiter, w.id == id else {
            lock.unlock()
            return
        }
        waiter = nil
        lock.unlock()
        w.continuation.resume(with: r)
    }
}
