## Why

`CompletedScreen` strands shoppers who just paid. It starts a 5-second countdown on mount and
then runs `window.location.href = returnUrl` with no guard on whether a return URL exists. The
`CheckoutSession` type declares `return_url: string` as required, but core-api emits the field
`omitempty` — a point of sale with no configured return URL sends nothing at all. The effect
therefore navigates to `undefined`, dumping the shopper on a dead page five seconds after a
successful payment, with the receipt button visible just long enough to be useless.

The same screen serves both entry points. A payment link has no merchant to return to, so
"Volver al comercio" is meaningless there — yet it renders as the primary action and the
countdown behind it is what causes the dead page. The screen also drops the transaction hash
and explorer link that `ConfirmingScreen` displayed moments earlier, so the one durable piece
of evidence a shopper wants disappears exactly when the payment becomes final.

## What Changes

- `CheckoutSession.return_url` becomes optional (`return_url?: string`), matching what the
  backend actually sends. The current required typing is the direct cause of the dead-page bug.
- `CompletedScreen`'s `returnUrl` prop becomes optional. The auto-redirect countdown runs
  **only** when `returnUrl` is a non-empty string; otherwise there is no countdown and no
  navigation.
- The countdown duration goes from 5 seconds to 12, so a shopper can read the confirmation and
  open the receipt before being sent back.
- When there is no `returnUrl`, the receipt link is promoted to the primary action — it becomes
  the screen's destination rather than a secondary escape hatch.
- `CompletedScreen` gains inline receipt detail: amount and currency, the crypto amount, asset
  and network from `manual_transfer`, and `tx_hash` rendered as a block-explorer link. This
  reuses the `getExplorerUrl` helper already present in `StatusScreens.tsx` and already used by
  `ConfirmingScreen`.

Not breaking: both prop and field changes widen `string` to `string | undefined` on values the
backend already omitted, so existing callers that do pass a return URL are unaffected.

## Capabilities

### New Capabilities

None. Both affected behaviours belong to capabilities that already exist.

### Modified Capabilities

- `checkout-session`: the auto-redirect requirement changes from an unconditional 5-second
  countdown to a 12-second countdown that runs only when a return URL is present, and the
  `CheckoutSession` type gains an optional `return_url`.
- `checkout-receipt-button`: the receipt link's placement stops being fixed as secondary and
  becomes conditional on whether a return URL exists; the completed screen additionally renders
  inline receipt detail.

## Impact

**Code** — `packages/frontend/react/src/types.ts` (`CheckoutSession.return_url`) and
`packages/frontend/react/src/components/checkout/StatusScreens.tsx` (`CompletedScreen`).
`CheckoutWidget.tsx` needs no change beyond the widened type.

**Consumers** — `checkout-web` renders this screen for both its entry points and is the reason
this change exists; it will consume the fix yalc-linked first, then from the published package.
`payment-dApp` does not use `CheckoutWidget` and is unaffected.

**Release** — requires a `@fluxisus/react` release. The package sets `bump-minor-pre-major`, so
this lands as a minor bump and publishes under the `next` dist-tag; promoting to `latest` is a
deliberate follow-up step.

**Archive ordering — read before archiving.** The requirement being modified here, *"CompletedScreen
auto-redirects after a countdown"*, currently lives in the **unarchived** change
`checkout-widget-v2` (`specs/checkout-session/spec.md`), not in `openspec/specs/checkout-session/spec.md`.
A `MODIFIED` delta cannot apply to a requirement that has not been synced yet, so
**`checkout-widget-v2` must be archived before this change**. The CLI aborts rather than
corrupting the spec, so getting this wrong fails loudly — but it does need to be sequenced.
The `checkout-receipt-button` delta has no such constraint: that requirement is already synced.
