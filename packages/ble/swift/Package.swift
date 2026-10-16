// swift-tools-version:5.9
import PackageDescription

// Apple platforms use CryptoKit. Linux (CI and local core tests) uses swift-crypto, which has
// the same API; the dependency is only declared when the manifest is evaluated on Linux, so
// iOS apps never fetch it.
#if os(Linux)
let cryptoDependencies: [Package.Dependency] = [
    .package(url: "https://github.com/apple/swift-crypto.git", "3.0.0"..<"5.0.0"),
]
let coreDependencies: [Target.Dependency] = [.product(name: "Crypto", package: "swift-crypto")]
#else
let cryptoDependencies: [Package.Dependency] = []
let coreDependencies: [Target.Dependency] = []
#endif

let package = Package(
    name: "FluxisBLE",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        // Protocol, crypto and the transport-independent payer flow. No CoreBluetooth.
        .library(name: "FluxisBLECore", targets: ["FluxisBLECore"]),
        // CoreBluetooth payer (and the iOS collector scaffold).
        .library(name: "FluxisBLE", targets: ["FluxisBLE"]),
    ],
    dependencies: cryptoDependencies,
    targets: [
        .target(name: "FluxisBLECore", dependencies: coreDependencies),
        .target(name: "FluxisBLE", dependencies: ["FluxisBLECore"]),
        .testTarget(name: "FluxisBLECoreTests", dependencies: ["FluxisBLECore"]),
    ]
)
