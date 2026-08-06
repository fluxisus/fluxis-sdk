## Context

`CompletedScreen` (`packages/frontend/react/src/components/checkout/StatusScreens.tsx`) is the
terminal screen for every Fluxis hosted checkout. It is consumed through `CheckoutWidget`, which
selects it on `session.status === 'completed'` and passes `returnUrl={session.return_url}`.

Two facts collide there. `CheckoutSession.return_url` is declared `string` (required) in
`types.ts`, but core-api serializes it `json:"return_url,omitempty"` from `posConfig.ReturnURL` —
so a point of sale with no configured return URL omits the key entirely. The redirect effect has
no guard, so it executes `window.location.href = undefined` and the browser navigates to a
relative `undefined` path five seconds after a successful payment.

The screen is also flow-blind. Both hosted-checkout entry points render it: point-of-sale
sessions, which a merchant integration typically *does* give a return URL, and payment links,
which have no merchant page to return to at all. Today both get the same "Volver al comercio"
primary button and the same countdown.

Separately, `ConfirmingScreen` shows the transaction hash and a block-explorer link; the moment
the status flips to `completed`, that disappears — the durable evidence vanishes exactly when
the payment becomes final.

## Goals / Non-Goals

**Goals:**

- A shopper who has paid is never navigated to a dead page.
- The screen adapts to whether a return destination actually exists.
- The transaction hash and explorer link survive the transition into `completed`.
- Consumers that already pass a real return URL see no behavioural change beyond the longer
  countdown.

**Non-Goals:**

- Changing what `receipt_link` points at. That string is built by core-api and is wrong for
  payment links today; correcting it is core-api's `checkout-receipt-endpoints` change, not this
  one. This change only decides how the link is *presented*.
- Adding data fetching to the SDK. `CheckoutWidget` is presentational by requirement — it renders
  what the `session` prop already carries and makes no network calls.
- Building a receipt page in the SDK. The hosted receipt page lives in `checkout-web`.

## Decisions

**Guard the effect rather than defaulting `returnUrl`.** The obvious shortcut is to default the
prop to `'/'` or `window.location.href` and keep the effect unconditional. Rejected: both invent
a destination the merchant never configured, and redirecting a paid shopper to an arbitrary page
is the bug in a quieter form. Absence of a return URL is meaningful information — it means *stay
here* — so the screen honours it rather than papering over it.

**Widen the type instead of asserting at the call site.** `return_url` could be left required
with `CompletedScreen` doing a runtime check, but the type would still be lying and every other
consumer would inherit the same trap. Widening `string` → `string | undefined` on a value the
backend already omits is non-breaking for callers that pass one, and it makes the compiler
enforce the guard at every future use.

**12 seconds, not 5 and not never.** Five seconds is not enough to read a confirmation and decide
to open a receipt; removing the redirect entirely would break merchant integrations that
legitimately expect the shopper back on their own order page. Twelve keeps the contract while
making the receipt reachable. The countdown remains visible in the button label so the behaviour
stays predictable.

**Promote the receipt link rather than rendering both actions unconditionally.** When there is no
return URL, "Volver al comercio" has no target and must not render at all — an anchor to nowhere
is the same defect. The receipt then becomes the screen's only action and is styled accordingly.
This is presentation only; the anchor's `href`, `target` and `rel` are identical in both cases.

**Render inline detail in addition to the receipt link, not instead of it.** The receipt link may
be absent (no `receipt_link`), and even when present it costs a navigation. The session object
already carries amount, currency, `manual_transfer` and `tx_hash`, so the screen can show the
substance for free. `getExplorerUrl` (already in this file, already used by `ConfirmingScreen`)
is reused rather than duplicated — it returns `null` for unknown networks, which the plain-text
fallback relies on.

## Risks / Trade-offs

**Archive ordering** → The `MODIFIED` delta targets *"CompletedScreen auto-redirects after a
countdown"*, which currently lives in the unarchived change `checkout-widget-v2` rather than in
`openspec/specs/checkout-session/spec.md`. `checkout-widget-v2` must be archived first. The
OpenSpec CLI aborts rather than corrupting the spec, so this fails loudly, but it must be
sequenced deliberately. The `checkout-receipt-button` delta is unaffected — that requirement is
already synced.

**Merchants relying on a fast bounce-back** → A merchant whose flow assumes the shopper returns
in ~5s now waits 12. Mitigated by the manual button being unchanged and immediate; and the
countdown is visible, so the delay is never a mystery. No merchant can depend on the redirect for
correctness — it is a convenience, and the shopper can always close the tab.

**Duplicated presentation of receipt data** → The inline detail overlaps what the hosted receipt
page shows. Accepted: the receipt page is authoritative and richer (exchange rate, order id,
timestamps, live status), while the inline block is a summary that must work when no receipt link
exists at all. They are allowed to differ in depth.

**A session in `completed` with no `tx_hash`** → Possible when the status is reached by a path
that never recorded a hash. The detail block renders what it has; every field is independently
conditional, so a missing hash degrades to no transaction row rather than an empty or broken one.

## Migration Plan

Type-level change only; no data migration. Rollout is the standard SDK path: develop
yalc-linked against `checkout-web`, then release `@fluxisus/react` as a minor bump
(`bump-minor-pre-major`), which publishes under the `next` dist-tag. Promote to `latest`
deliberately with `npm dist-tag add`. Rollback is pinning `checkout-web` back to `0.4.0`.

## Open Questions

None blocking. The `receipt_link` value itself being wrong for payment links is known, tracked
in core-api's `checkout-receipt-endpoints`, and deliberately out of scope here.
