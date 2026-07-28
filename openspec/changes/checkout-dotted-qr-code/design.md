## Context

`FluxisQrCode` delegates all SVG generation to `qrcode.react`'s `QRCodeSVG`, which has no public API for custom module shapes — it always renders squares. The payment-dApp already solved this by using the lower-level `qrcode` npm package to extract the raw bit matrix and building a custom SVG renderer, drawing circles for data modules and nested rects for corner markers.

## Goals / Non-Goals

**Goals:**
- Replace `QRCodeSVG` internals in `FluxisQrCode` with a dotted SVG renderer
- Preserve all existing props and the outer wrapper card appearance
- Use `qrcode` package (already in the ecosystem via payment-dApp) for matrix generation

**Non-Goals:**
- Converting `ManualTransferContent`'s small wallet-address QR (separate concern)
- Removing `qrcode.react` from deps (still needed by `ManualTransferContent`)
- Exporting a generic `DottedQrCode` primitive — internal implementation only

## Decisions

### Use `qrcode` package for matrix generation
`qrcode.react` exposes no public matrix API; the only way to get raw module data is via the `qrcode` package's `QRCode.create(value, opts).modules` (a `BitMatrix` with `.data: Uint8Array` and `.size: number`).

Adding `qrcode` as a runtime dep is justified — it's small (~30 KB), battle-tested, and already used in the dApp.

### `useMemo` over re-computing in render
Matrix generation (`QRCode.create`) is synchronous but not free. Memoizing on `[token, size, level]` avoids recomputing on unrelated re-renders.

### Corner marker rendering: nested rects, not circles
QR scanner firmware relies on the solid square geometry of the three position-detection patterns. Making them circular would break reliable detection. Data modules can be any shape (circles, rounded squares) — corner markers must stay square.

Corner marker layout (in module units, relative to top-left of each marker):
- Outer rect: 0,0 — 7×7 modules, foreground color
- White rect: 1,1 — 5×5 modules, background color
- Center rect: 2,2 — 3×3 modules, foreground color

### Radius: `moduleSize * 0.45`
This keeps dots clearly circular without touching adjacent cells. The dApp uses a fixed `dotSize` prop; here we derive it from `moduleSize` so it scales correctly at any `size` prop value.

### Quiet zone: 4 modules when `marginSize === 0`
The `marginSize` prop defaults to 0 in the current `FluxisQrCode` API. To maintain scannable padding without breaking the existing zero-default, we map: `effectiveMargin = marginSize === 0 ? 4 : marginSize`. The offset applied to all coordinates = `effectiveMargin * moduleSize`.

The total SVG canvas accounts for the margin on both sides: `size` stays fixed, so `moduleSize = size / (matrix.size + 2 * effectiveMargin)`.

### Logo: SVG `<image>` element
The current implementation overlays the logo as an absolutely positioned `<img>` on top of the `<div>` wrapper. The new implementation embeds it directly as an SVG `<image>` inside the `<svg>`, which is cleaner and avoids a separate DOM element. Logo position: `(svgSize - logoSize) / 2` on both axes.

## Risks / Trade-offs

- **`qrcode` API surface is narrow** — `QRCode.create` is the stable public API; we only use `.modules.data` and `.modules.size`, both stable since v1. Risk is low.
- **Logo without excavation** — we don't clear modules behind the logo. The `level="H"` default (30% error correction) handles this; it's what the dApp does too. Risk: very low.
- **`useMemo` dependency on `imageSettings`** — the dApp memoizes on `imageSettings` too; we exclude it since logo is always the same object ref. If consumers change logo dynamically the SVG regenerates via the token/size deps anyway.
