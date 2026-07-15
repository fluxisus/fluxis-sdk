## 1. Dependencies

- [x] 1.1 In `packages/frontend/react/package.json`, add `"qrcode": "^1.5.4"` to `dependencies` and `"@types/qrcode": "^1.5.5"` to `devDependencies`
- [x] 1.2 Run `npm install` in `packages/frontend/react` to update `package-lock.json`

## 2. Rewrite FluxisQrCode

- [x] 2.1 Replace the `import { QRCodeSVG } from 'qrcode.react'` import with `import QRCodeLib from 'qrcode'` in `FluxisQrCode.tsx`
- [x] 2.2 Add a `useMemo` block that calls `QRCodeLib.create(token, { errorCorrectionLevel: level }).modules` to get the raw `BitMatrix`, computing `moduleSize`, `offset`, corner marker positions, data dot positions — only when `isValidNaspipToken(token)` is true
- [x] 2.3 Replace the `<QRCodeSVG>` + `<img>` block with a `<svg>` that renders: corner markers as three nested `<rect>` groups, data modules as `<circle>` elements, and the Fluxis logo as a centered `<image>` element
- [x] 2.4 Remove the `position: relative` wrapper `<div>` that was needed for the absolutely-positioned logo overlay (no longer needed with inline SVG image)

## 3. Build & verify

- [x] 3.1 Run `bun run build` in `packages/frontend/react` — no TypeScript errors
- [x] 3.2 `yalc publish --no-scripts` + `yalc update @fluxisus/react` in checkout-web, clear `.vite` cache, restart dev server
- [x] 3.3 Open `/checkout/mock-created` — confirm QR renders with circular data dots and square corner markers, Fluxis logo centered
