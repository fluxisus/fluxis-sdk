## Context

`CheckoutWidget` routes between four screens based on `session.status`. `ConfirmingScreen` and `CompletedScreen` currently receive no session data — they render static content only. core-api's `GET /public/checkout/:sessionId` is being extended to return `tx_hash` (the on-chain transaction hash) and `receipt_link` (a stable URL to the checkout session). The SDK must expose these fields and pass them through to the relevant screens.

The block explorer map needs to translate network identifiers (from `session.manual_transfer?.network`) to base explorer URLs. These identifiers match what core-api already returns: `polygon`, `base`, `ethereum`, `bsc`, `arbitrum`, `optimism`, `avalanche`.

## Goals / Non-Goals

**Goals:**
- Add `tx_hash?` and `receipt_link?` to `CheckoutSession` type
- Show a "Ver en blockchain →" link in `ConfirmingScreen` when `tx_hash` and a known network are present
- Show a "Ver recibo" secondary button in `CompletedScreen` when `receipt_link` is present
- All changes are additive and backwards-compatible (optional props)

**Non-Goals:**
- Fetching the explorer URL from an external service — static map only
- Displaying a shortened tx hash — link text is fixed "Ver en blockchain →"
- Adding a dedicated receipt page in checkout-web — `receipt_link` points to the checkout session URL itself

## Decisions

**Explorer URL map lives in StatusScreens.tsx (not a separate utility)**
The map is a handful of string constants used in a single file. Extracting it to `utils/` would be premature abstraction. If a third screen ever needs it, move it then.

**`session` prop is optional on both screens**
`ConfirmingScreen` and `CompletedScreen` already have callers that don't pass session. Making it optional avoids breaking any external consumers who render these screens directly and haven't updated their session data shape.

**`receipt_link` rendered as `<a target="_blank">` styled as a button, not a `<button>`**
It navigates to an external URL. A link with button styling is semantically correct and avoids the need to intercept click events for `window.open`.

**No new runtime dependencies**
Both features use only native HTML elements and CSS variables already defined by `FluxisProvider`. No icon libraries needed (arrow → is a text character; "Ver recibo" has no icon).

## Risks / Trade-offs

- [Stale network map] If Fluxis adds a new network not in the map, the explorer link silently disappears rather than showing a broken URL. → Mitigation: `getExplorerUrl` returns `null` when network is unknown; the link is conditionally rendered only when non-null.
- [receipt_link points to the checkout session] The receipt is just the completed checkout screen, not a dedicated print/PDF view. → Accepted for now; a dedicated receipt page is a follow-up.
