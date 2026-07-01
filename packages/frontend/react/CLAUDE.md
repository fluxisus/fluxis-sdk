# CLAUDE.md — @fluxisus/react

> React UI components for Fluxis payment instructions.
> For API details see the root `CLAUDE.md`. For shared frontend rules see `packages/frontend/CLAUDE.md`.

## Project Layout

```
packages/frontend/react/
├── src/
│   ├── components/       # FluxisQrCode, CompatibleApps, PayWithAppButton
│   ├── hooks/            # useCompatibleApps, useIsMobile
│   ├── theme/            # FluxisProvider, default theme, CSS variables
│   ├── assets/           # Bundled SVG logos (QR center image)
│   ├── utils/            # NASPIP helpers, compatible apps normalization
│   ├── types.ts
│   └── index.ts
├── tests/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Components

- **`FluxisQrCode`** — Renders a NASPIP token as a QR code with the Fluxis logo centered.
- **`CompatibleApps`** — Mobile: "Pay with \<app\>" deep-link buttons. Desktop: QR fallback + informational app list.
- **`CompatibleAppsMarquee`** — Horizontal auto-scrolling showcase of compatible app logos (pauses on hover).
- **`PayWithAppButton`** — Single deep-link button for one compatible app.
- **`FluxisProvider`** — Optional global theme via CSS variables (`--fluxis-*`).

## Design Rules

1. **No API credentials** — never call `/auth/token` or embed secrets.
2. **Backend creates, frontend displays** — consumers pass NASPIP tokens from their server.
3. **No PASETO decoding** — validate tokens with `isValidNaspipToken` (`naspip;` prefix check only).
4. **Peer deps** — `react` and `react-dom` are peers, not bundled.
5. **Minimal deps** — only `qrcode.react` at runtime.
6. **Theming** — prop override > CSS var from provider > `defaultTheme`.

## Build & Test

```bash
npm run build --workspace=packages/frontend/react
npm run test --workspace=packages/frontend/react
npm run lint --workspace=packages/frontend/react
```

## What NOT to Do

- Do NOT bundle React
- Do NOT fetch Fluxis API with credentials from the browser
- Do NOT decode NASPIP/PASETO tokens locally
- Do NOT add heavy UI frameworks as dependencies
