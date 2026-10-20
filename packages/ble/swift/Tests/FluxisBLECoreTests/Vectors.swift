import Foundation
import XCTest
@testable import FluxisBLECore

/// Loads the shared vectors: `$FLUXIS_BLE_VECTORS`, else the nearest `test-vectors/vectors.json`
/// walking up from this file (monorepo: packages/ble/test-vectors; mirror repo: ./test-vectors).
enum Vectors {
    static let root: [String: Any] = {
        let url = locate()
        let data = try! Data(contentsOf: url)
        return try! JSONSerialization.jsonObject(with: data) as! [String: Any]
    }()

    private static func locate() -> URL {
        if let env = ProcessInfo.processInfo.environment["FLUXIS_BLE_VECTORS"] {
            return URL(fileURLWithPath: env)
        }
        var dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        for _ in 0..<8 {
            let candidate = dir.appendingPathComponent("test-vectors/vectors.json")
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
            dir.deleteLastPathComponent()
        }
        fatalError("test-vectors/vectors.json not found; set FLUXIS_BLE_VECTORS")
    }

    static func section(_ path: String...) -> Any {
        var node: Any = root
        for key in path { node = (node as! [String: Any])[key]! }
        return node
    }

    static func list(_ path: String...) -> [[String: Any]] {
        var node: Any = root
        for key in path { node = (node as! [String: Any])[key]! }
        return node as! [[String: Any]]
    }
}

extension Dictionary where Key == String, Value == Any {
    func str(_ k: String) -> String { self[k] as! String }
    func int(_ k: String) -> Int { (self[k] as! NSNumber).intValue }
    func hex(_ k: String) -> [UInt8] { [UInt8](hex: str(k))! }
    func hexList(_ k: String) -> [[UInt8]] { (self[k] as! [String]).map { [UInt8](hex: $0)! } }
    func obj(_ k: String) -> [String: Any] { self[k] as! [String: Any] }
    func isNull(_ k: String) -> Bool { self[k] == nil || self[k] is NSNull }
    func flag(_ k: String) -> Bool { (self[k] as? NSNumber)?.boolValue ?? false }
}

func assertProtocolError(_ expected: String, _ label: String, file: StaticString = #filePath, line: UInt = #line, _ block: () throws -> Void) {
    do {
        try block()
        XCTFail("\(label): expected protocol error \(expected)", file: file, line: line)
    } catch let e as FluxisBLEProtocolError {
        XCTAssertEqual(e.rawValue, expected, label, file: file, line: line)
    } catch {
        XCTFail("\(label): unexpected error \(error)", file: file, line: line)
    }
}

