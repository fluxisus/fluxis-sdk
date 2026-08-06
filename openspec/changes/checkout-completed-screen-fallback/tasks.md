## 1. Type contract

- [x] 1.1 In `packages/frontend/react/src/types.ts`, change `CheckoutSession.return_url` from
      `return_url: string` to `return_url?: string`
- [x] 1.2 Run `npm run build --workspace=packages/frontend/react` and fix any call site the
      widened type now flags. Expect `CheckoutWidget.tsx` (passes `session.return_url` into
      `CompletedScreen`) to be the only one

## 2. CompletedScreen redirect behaviour

- [x] 2.1 In `StatusScreens.tsx`, change `CompletedScreen`'s prop to `returnUrl?: string`
- [x] 2.2 Raise `AUTO_REDIRECT_SECONDS` from 5 to 12
- [x] 2.3 Guard the countdown effect so it neither starts a timer nor assigns
      `window.location.href` unless `returnUrl` is a non-empty string. Keep the existing
      unmount cleanup intact
- [x] 2.4 Render the "Volver al comercio" anchor only when `returnUrl` is a non-empty string,
      so no anchor-to-nowhere is produced

## 3. Receipt link placement

- [x] 3.1 Style the "Ver recibo" anchor as the primary action when `returnUrl` is absent or
      empty, and as the secondary action below "Volver al comercio" when it is present. Keep
      `href`, `target="_blank"` and `rel="noopener noreferrer"` identical in both cases
- [x] 3.2 Confirm the anchor is still omitted entirely when `session?.receipt_link` is absent

## 4. Inline receipt detail

- [x] 4.1 Add a detail block to `CompletedScreen` rendering the reference amount and currency
      from `session`
- [x] 4.2 Render crypto amount, asset and network from `session.manual_transfer` when that
      field is present, and omit the row entirely when it is not
- [x] 4.3 Render `session.tx_hash` when present, as an anchor built with the existing
      `getExplorerUrl` helper (line 26 — do not write a second one), falling back to plain text
      when `getExplorerUrl` returns `null`
- [x] 4.4 Verify every field is independently conditional, so a `completed` session with no
      `tx_hash` and no `manual_transfer` still renders without an empty or broken row

## 5. Tests

- [x] 5.1 Update the four existing cases in `tests/CompletedScreen.test.tsx` — they hardcode the
      5-second countdown and the `Volver al comercio (5)` label; both become 12
- [x] 5.2 Add a case: no `returnUrl` → no navigation after advancing timers well past 12s, and
      no "Volver al comercio" link in the DOM. This is the regression test for the dead page
- [x] 5.3 Add a case: no `returnUrl` with a `receipt_link` → the "Ver recibo" anchor is present
      and is the only action on screen
- [x] 5.4 Add cases for the detail block: `tx_hash` on a known network renders an explorer
      anchor; `tx_hash` on an unknown network renders plain text with no anchor; a session
      without `manual_transfer` still renders amount and currency
- [x] 5.5 Run `npm run test --workspace=packages/frontend/react` — all green
- [x] 5.6 Run `npm run lint --workspace=packages/frontend/react` — clean

## 6. Consumer verification

- [x] 6.1 `npm run build --workspace=packages/frontend/react`, then `yalc publish` from
      `packages/frontend/react`
- [ ] 6.2 `yalc add @fluxisus/react` in `checkout-web` and confirm both completed states render
      correctly there against MSW fixtures — with and without `return_url`
- [ ] 6.3 Before committing `checkout-web`: `yalc remove @fluxisus/react && bun install`, so no
      `file:.yalc/...` link reaches the lockfile and breaks CI at `bun install --frozen-lockfile`

## 7. Fluxis destination when there is no merchant return URL

- [x] 7.1 Add a `FLUXIS_HOME_URL` constant and render it as an anchor in `CompletedScreen` when
      `returnUrl` is absent — secondary when a receipt link exists, primary when it does not
- [x] 7.2 Do **not** auto-redirect to it. The shopper keeps the completed screen, and the receipt
      with it, indefinitely
- [x] 7.3 Cover it: both links present with a receipt, primary without one, suppressed when a
      merchant return URL exists, and no navigation after 20s
- [x] 7.4 Confirmed the counterpart decision in core-api: `return_url` is omitted rather than
      defaulted, so the SDK can distinguish "merchant wants them back" from "nowhere to return to".
      Defaulting it server-side was implemented first and reverted — it erased the distinction the
      no-redirect branch depends on
