## Why

A cross-repo audit of the hosted checkout flow (checkout-web, core-api, fluxis-sdk, payment-dApp) surfaced two gaps in `@fluxisus/react`'s `CheckoutWidget`: (1) the diagram this feature was built against calls for the hosted checkout page to redirect the shopper back to the merchant automatically on completion, but `CompletedScreen` only offers a manual link the shopper must click; (2) core-api is adding payment-link support to the hosted checkout session model (`core-api` change `hosted-checkout-session-api-v2`), which introduces a `selecting_asset` status and a `payment_options` list for sessions where the shopper must choose an asset before a vault is assigned — `CheckoutWidget`/`CheckoutSession` has no representation for this state today.

## What Changes

- `CompletedScreen` (`packages/frontend/react/src/components/checkout/StatusScreens.tsx`) auto-redirects to `session.return_url` after a 5-second countdown; the existing "Volver al comercio" link remains clickable to redirect immediately.
- `CheckoutSession` type (`src/types.ts`) gains `status: 'selecting_asset'` and an optional `payment_options: string[]`.
- New `AssetSelectionScreen` component, rendered by `CheckoutWidget` when `session.status === 'selecting_asset'`, listing `payment_options` and invoking a new `onSelectAsset` callback prop when the shopper picks one.
- `CheckoutWidgetProps` gains `onSelectAsset?: (assetId: string) => void | Promise<void>`. The widget stays a pure display/callback component — it does not fetch anything itself; the consumer (checkout-web) performs the actual `POST /public/checkout/:sessionId/select-asset` call and re-polls, exactly as it already does for session status today. This keeps the package's existing "poll/act via your own calling code, the widget only displays" rule intact.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `checkout-session`: `CheckoutSession` gains `selecting_asset` status and `payment_options` field.

## Impact

- `packages/frontend/react/src/types.ts`
- `packages/frontend/react/src/components/CheckoutWidget.tsx`
- `packages/frontend/react/src/components/checkout/StatusScreens.tsx` (CompletedScreen auto-redirect)
- `packages/frontend/react/src/components/checkout/AssetSelectionScreen.tsx` (new)
- `packages/frontend/react/README.md` — CheckoutSession contract and CheckoutWidget usage docs
- `packages/frontend/CLAUDE.md` — clarify that "poll via your API routes" describes third-party merchant integrations; checkout-web (a first-party Fluxis product) calling core-api's public, credential-free checkout endpoints directly is the accepted pattern and is not a violation of this rule
- Depends on `core-api`'s `hosted-checkout-session-api-v2` change shipping the matching `selecting_asset`/`payment_options`/`select-asset` contract; this change is safe to ship first (backward compatible — existing sessions never report `selecting_asset`) but the asset-selection screen has nothing to call until core-api's change lands.
