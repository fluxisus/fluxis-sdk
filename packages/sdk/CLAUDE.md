# CLAUDE.md — Fluxis TypeScript SDK

> Language-specific conventions for the TypeScript SDK.
> For API details, authentication flow, schemas, and endpoints see the root `CLAUDE.md`.

## Project Layout

```
packages/sdk/
├── src/
│   ├── client.ts              # FluxisClient class — auth, config, HTTP, token refresh
│   ├── resources/
│   │   ├── accounts.ts        # /account CRUD + settlement addresses
│   │   ├── organization.ts    # /organization/settlement-addresses
│   │   ├── pointOfSale.ts     # /pos CRUD + notifications + payment requests
│   │   ├── naspip.ts          # /naspip/create and /naspip/read
│   │   ├── refunds.ts         # /refunds/*
│   │   └── transactions.ts    # /transactions (list with pagination)
│   ├── types/
│   │   ├── common.ts          # APIResponse, APIError, enums
│   │   ├── auth.ts            # Auth request/response types
│   │   ├── accounts.ts        # Account types
│   │   ├── pointOfSale.ts     # PoS, PaymentRequest, Notification types
│   │   ├── naspip.ts          # NASPIP create/read types
│   │   ├── refunds.ts         # Refund types
│   │   └── transactions.ts    # Transaction types
│   ├── errors.ts              # FluxisError, FluxisAuthError, etc.
│   ├── utils.ts               # Case conversion helpers
│   ├── webhooks.ts            # verifyWebhookSignature()
│   └── index.ts               # Main export
├── tests/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── CLAUDE.md                  # This file
```

## Naming Conventions

- **camelCase** for all method names and properties (SDK auto-converts to/from snake_case for API)
- Class name: `FluxisClient`
- Package name: `@fluxisus/sdk`

## Design Rules

1. **Zero external deps**: Uses native `fetch` (Node 18+). No axios.
2. **Bundling**: `tsup` producing ESM + CJS dual output.
3. **Testing**: `vitest` against staging sandbox.
4. **Strict TypeScript**: `strict: true`, no `any`.
5. **snake_case <-> camelCase**: Automatic conversion in `utils.ts`.

## Build & Test

```bash
npm run build    # tsup
npm run test     # vitest
npm run lint     # tsc --noEmit
```

## What NOT to Do

- Do NOT use `any` types
- Do NOT add runtime dependencies
- Do NOT use axios — native fetch only
