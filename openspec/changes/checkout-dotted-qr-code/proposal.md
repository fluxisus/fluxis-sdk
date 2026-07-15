## Why

`FluxisQrCode` renders square modules via `qrcode.react`'s `QRCodeSVG`, which looks dated compared to the payment-dApp's dotted SVG style. Switching to circles for data modules gives the QR a modern, on-brand appearance consistent with the rest of the Fluxis UI.

## What Changes

- `FluxisQrCode.tsx` — replace `QRCodeSVG` internals with a custom SVG renderer that draws data modules as `<circle>` elements and corner markers as nested `<rect>` elements
- `package.json` — add `qrcode` (runtime) and `@types/qrcode` (devDep) for raw matrix generation; `qrcode.react` stays for use in `ManualTransferContent`

## Capabilities

### New Capabilities

- `dotted-qr-renderer`: Custom SVG rendering logic that separates corner-detection markers from data modules and renders data modules as circles

### Modified Capabilities

_(none — `FluxisQrCodeProps` API is unchanged; existing behavior is preserved except visual style)_

## Impact

- `packages/frontend/react/src/components/FluxisQrCode.tsx` — full rewrite of render body
- `packages/frontend/react/package.json` — one new runtime dep (`qrcode`), one new devDep (`@types/qrcode`)
- No breaking changes to exported API or types
- `ManualTransferContent.tsx` is unaffected — continues to use `qrcode.react` directly
