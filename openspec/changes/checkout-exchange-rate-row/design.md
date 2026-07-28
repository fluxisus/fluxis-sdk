## Context

`ManualTransferData` is the leaf type that flows into `ManualTransferContent`. `CheckoutSession` owns `amount` (fiat) and `currency`, but these are only available in `PendingScreen`. The component chain is: `PendingScreen → ManualTransferSection → ManualTransferContent`.

## Goals / Non-Goals

**Goals:**
- Show implied rate without a new API call.
- Keep rate computation simple: `parseFloat(reference_amount) / parseFloat(crypto_amount)`.
- Reuse `formatFiatAmount` for consistent locale formatting.

**Non-Goals:**
- Real-time rate from an external price feed.
- Storing the rate anywhere; it is always computed on render.
- Showing rate when `reference_amount` is absent (graceful omission).

## Decisions

**Extend `ManualTransferData` rather than adding props to `ManualTransferSection`/`ManualTransferContent`**: `ManualTransferData` is already the carrier of payment details. Adding two optional fields keeps the prop surface of the intermediate component (`ManualTransferSection`) unchanged and avoids a drilling chain of new props.

**Merge in `PendingScreen`**: The spread happens at the one place that has both the session and the manual transfer data — `PendingScreen`. The SDK consumer (checkout-web) doesn't need to know about this; it passes the session as before and `PendingScreen` does the merge.

**Rate direction — fiat per crypto**: `reference_amount / crypto_amount` gives "how many fiat units per 1 crypto unit". This is the most intuitive direction: "1 USDT = $ 1.570,32 ARS". The inverse ("0.000637 USDT per ARS") is confusing for large-rate currencies like ARS.

**Placement**: Above the copy fields, below the token pills — the user sees the rate before they copy the amounts, so they can do the mental check before transferring.

## Risks / Trade-offs

- [Minor] `parseFloat` will silently return `NaN` on malformed input. Guard with `Number.isFinite(rate)` before rendering; if rate is not finite, omit the row.
