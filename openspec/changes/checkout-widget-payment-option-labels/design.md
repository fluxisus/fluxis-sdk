## Context

`AssetSelectionScreen`'s original design note explicitly said: "There is no client-side symbol
registry, so the token address is shown (truncated) rather than a resolved symbol like 'USDC'."
That was a reasonable stance when the backend only ever sent raw ids — but it meant the picker
literally couldn't tell two same-network options apart in any useful way, which live verification
confirmed is a real, current bug (the local test POS has exactly this case). core-api's
`checkout-session-payment-option-labels` change removes the need for a client-side registry at all
by resolving symbol + network server-side (reusing `utils.GetSymbolAndNetworkByID`, the same
resolution already used for `manual_transfer`) and sending it down per option.

## Goals / Non-Goals

**Goals:**
- Let the shopper tell two same-network options apart by symbol.
- Remove the id-string-parsing logic entirely now that it's unnecessary — the backend is the
  source of truth for what each id resolves to.

**Non-Goals:**
- No client-side symbol registry — deliberately not adding one, since the backend now provides
  this.
- No visual redesign of the picker buttons beyond swapping what text renders where.

## Decisions

### 1. Drop `parseAssetOption` and the truncated-address display

**Decision:** `AssetSelectionScreen` now reads `option.symbol`/`option.network` directly off each
`CheckoutPaymentOption`, rendering symbol (bold, primary) and network (muted, secondary) — no more
regex parsing of `unique_asset_id`, no more truncated token-contract-address display (which wasn't
meaningful to a shopper anyway — it's the token contract, not any address they'd ever need to
compare against).

**Alternative considered:** Keep the address as a tertiary detail alongside the new symbol/network.
Rejected — it added visual noise without giving the shopper anything actionable; the symbol +
network pair is sufficient to distinguish any two configured options.

## Risks / Trade-offs

- **Breaking type change**: `payment_options` moves from `string[]` to
  `CheckoutPaymentOption[]` — any code consuming the old shape directly (rather than through
  `AssetSelectionScreen`) breaks. The only known consumer, `checkout-web`, is updated in the same
  round (see the coordinated core-api/checkout-web changes).

## Migration Plan

1. Ship alongside core-api's `checkout-session-payment-option-labels` — the two must land together.
2. `yalc publish`/`yalc add` to pick up in `checkout-web`, along with updating `checkout-web`'s own
   local `CheckoutSession` type mirror in `src/lib/api.ts`.
3. Rollback: revert to `string[]` + `parseAssetOption`; safe to roll back together with the
   core-api counterpart.
