# CLAUDE.md — Fluxis Frontend SDKs

> Conventions for browser/UI packages under `packages/frontend/`.
> For API details, authentication, and schemas see the root `CLAUDE.md`.
> For server-side TypeScript, see `packages/backend/sdk/CLAUDE.md`.

## Monorepo layout

```
packages/frontend/
├── README.md
├── CLAUDE.md              # This file — shared frontend rules
└── <package>/             # One npm package per framework (e.g. react/)
    ├── src/
    ├── tests/
    ├── package.json
    ├── tsconfig.json
    ├── tsup.config.ts     # or vite library mode — ESM + CJS dual output
    └── CLAUDE.md          # Framework-specific notes
```

Each subdirectory with a `package.json` is picked up by the root workspace (`packages/frontend/*`).

## Naming

- **Scope**: `@fluxisus/<framework>` (e.g. `@fluxisus/react`)
- **Properties / hooks**: camelCase (`usePaymentStatus`, `checkoutUrl`)
- **Components**: PascalCase (`FluxisCheckout`, `NaspipQrCode`)

## Design rules

1. **No API credentials in the browser** — never ship `apiSecret`, webhook secrets, or `FluxisClient` from `@fluxisus/sdk`.
2. **Backend creates, frontend displays** — payment requests, checkout URLs, and NASPIP tokens are created server-side; frontend packages render UI and poll status via your API routes if needed.
3. **Peer dependencies** — declare `react`, `react-dom`, etc. as peers; do not bundle framework runtimes.
4. **Minimal runtime deps** — prefer zero or tiny deps; reuse types from `@fluxisus/sdk` as devDependency for parity only (re-export public types if useful).
5. **Dual module output** — ESM + CJS via `tsup` (match backend TS SDK).
6. **Strict TypeScript** — `strict: true`, no `any`.
7. **Testing** — `vitest` + `@testing-library/react` (or framework equivalent); mock your backend, not Fluxis API directly with secrets.

## Build & test

From repo root:

```bash
./scripts/frontend.sh build
./scripts/frontend.sh test
./scripts/frontend.sh lint
```

From a single package:

```bash
npm run build --workspace=packages/frontend/react
```

## What NOT to do

- Do NOT call `POST /auth/token` from browser code
- Do NOT embed `api_key` / `api_secret` in frontend bundles
- Do NOT implement PASETO decoding locally — use backend `/naspip/read` if needed
- Do NOT add heavy UI kits as dependencies — consumers bring their own styling
