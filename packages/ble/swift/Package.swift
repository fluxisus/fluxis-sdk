// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "FluxisBLE",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        // Wire format and the transport-independent preview flow. No CoreBluetooth, no deps.
        .library(name: "FluxisBLECore", targets: ["FluxisBLECore"]),
        // CoreBluetooth payer (and the iOS collector scaffold).
        .library(name: "FluxisBLE", targets: ["FluxisBLE"]),
    ],
    targets: [
        .target(name: "FluxisBLECore"),
        .target(name: "FluxisBLE", dependencies: ["FluxisBLECore"]),
        .testTarget(name: "FluxisBLECoreTests", dependencies: ["FluxisBLECore"]),
    ]
)
