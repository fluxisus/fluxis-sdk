# CLAUDE.md — @fluxisus/react-wallet

> React hook that wires `@fluxisus/wallet-core` into `HostedCheckoutWidget`'s wallet-connection
> props. For the framework-agnostic primitives, see `packages/frontend/wallet-core/CLAUDE.md`. For
> shared frontend rules see `packages/frontend/CLAUDE.md`.

## Purpose

`HostedCheckoutWidget` (in `@fluxisus/react`) exposes wallet-connection as injected props
(`onPayWithWallet`, `onSelectWalletConnect`, `onPrepareWalletConnect`, `onLaunchExtension`,
`installedWalletNames`, `walletConnectUri`) precisely so it never has to implement wallet logic
itself. This package is the (optional) reference implementation of that seam: one hook,
`useHostedCheckoutWallet`, that returns exactly the props needed:

```tsx
const wallet = useHostedCheckoutWallet(session, { walletConnectProjectId, resolveErc20 });
<HostedCheckoutWidget session={session} checkoutUrl={checkoutUrl} {...wallet} />
```

Nothing about `@fluxisus/react`'s public API changes because this package exists — an integrator
who never installs `@fluxisus/react-wallet` keeps the exact same manual-transfer-only checkout as
before.

## Design rules

1. **Every returned callback must have a stable identity across renders.** `HostedPendingScreen`
   and `DefiWalletPanel` (in `@fluxisus/react`) put `onPrepareWalletConnect`/`onSelectWalletConnect`
   in their own `useEffect` dependency arrays — a new function reference every render re-fires
   those effects, which can spiral into "Maximum update depth exceeded" if the effect itself causes
   a re-render (this actually happened once in `examples/demo-checkout/react`'s hand-rolled fakes —
   see the fix there for the exact failure mode). Always wrap handlers in `useCallback` with correct
   deps, the way `useHostedCheckoutWallet.ts` does.
2. **This package owns the chain/network calls `@fluxisus/react` explicitly refuses to make.** Keep
   that logic in `@fluxisus/wallet-core` (framework-agnostic, testable headless); this package
   should stay a thin React adapter — state plumbing and memoization, not business logic.
3. **No UI components.** This package only exports a hook. If a prebuilt "Connect wallet" button or
   similar becomes useful later, it belongs in a new export, not by making the hook render anything.
4. **Peer dep on React only** — `@fluxisus/wallet-core` is a regular dependency (it has no React of
   its own to peer against). `@fluxisus/react` is a devDependency for types only, per
   `packages/frontend/CLAUDE.md` rule 4 — never import its runtime code.

## What NOT to do

- Do NOT return a new function identity from `useHostedCheckoutWallet` on every render (see rule 1).
- Do NOT put wallet/chain logic here that belongs in `@fluxisus/wallet-core` — keep this package a
  thin binding so a future non-React framework binding doesn't have to reimplement it.
- Do NOT render any UI from this package.

## Release status

Not yet registered in `release-please-config.json` / `.release-please-manifest.json` / the
`publish-*` jobs in `.github/workflows/release-please.yml` — `package.json` is `"private": true`
until the team decides to publish it. See `packages/frontend/README.md` for the registration steps.

## Build & Test

```bash
npm run build --workspace=packages/frontend/react-wallet
npm run test --workspace=packages/frontend/react-wallet
npm run lint --workspace=packages/frontend/react-wallet
```
