# Frontend SDKs

Browser and UI framework bindings for Fluxis. Each package lives in its own subdirectory and is registered automatically via the root npm workspace (`packages/frontend/*`).

## Planned packages

| Package | Directory | Status |
|---------|-----------|--------|
| `@fluxisus/react` | `react/` | Available |

## Adding a new frontend package

1. Create `packages/frontend/<name>/` with a `package.json` (`"private": false` when ready to publish).
2. Add a `CLAUDE.md` with framework-specific conventions.
3. Run `npm install` from the repo root so the workspace is linked.
4. Register the package in `release-please-config.json` when it is ready for independent versioning.

```bash
# From repo root — runs all frontend packages that define the script
./scripts/frontend.sh build
./scripts/frontend.sh test
./scripts/frontend.sh lint
```

## Design constraints (all frontend packages)

- **Never expose API secrets** — frontend code runs in the browser; use your backend + `@fluxisus/sdk` for authenticated calls.
- **Checkout URLs and NASPIP tokens** are safe to handle client-side when created by your server.
- **Webhooks** are server-only; do not implement signature verification in browser bundles.
- Prefer **peer dependencies** on framework runtimes (React, Vue, etc.) instead of bundling them.

See [`CLAUDE.md`](./CLAUDE.md) for shared frontend SDK conventions.
