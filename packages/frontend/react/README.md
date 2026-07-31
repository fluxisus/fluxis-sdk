# @fluxisus/react

Official React SDK for Fluxis payment UI — hosted checkout widget, QR codes, countdown timer, address copy, payment status badge, and compatible wallet deep links.

## Install

```bash
npm install @fluxisus/react qrcode.react react react-dom
```

## Upgrading

### ⚠️ Breaking in 0.3.0 — `recipient_address` is optional

`CheckoutSession.recipient_address` changed from `string` to `string | undefined`. A session in
the `selecting_asset` status has no recipient address until the shopper picks an asset, so the
previously required typing could not be honoured once that status existed.

If your code reads the field directly, narrow it first:

```ts
if (session.recipient_address) {
  // safe to use
}
```

This is the only breaking change since 0.2.x. Everything else added in 0.3.0 is additive: the
`selecting_asset` member on `status`, the optional `manual_transfer`, `tx_hash`, `receipt_link`
and `payment_options` fields, and the optional `onSelectAsset` prop on `CheckoutWidget`.

### New in 0.4.0 — retry and wallet payment (both optional)

`CheckoutWidget` accepts two further optional callbacks. Omit them and behaviour is unchanged,
with one exception noted below.

| Prop | Purpose |
|---|---|
| `onRetryExpired` / `isRetryingExpired` | Starts a fresh payment attempt from the expired screen |
| `onPayWithWallet` / `isPayingWithWallet` / `payWithWalletError` | Sends the transfer from a connected browser wallet |

Both follow the same contract as `onSelectAsset`: this package never makes network or chain calls
of its own, so the host performs the work and reports progress back.

**Behaviour change:** the expired screen previously always showed a "Reintentar" button that
reloaded the page. Reloading only re-read the same expired payment request, so it appeared to do
nothing. The button now renders only when you pass `onRetryExpired`, since whether a retry is
possible depends on how the session is addressed — a durable code can open a new request, a
payment-request id cannot.

## Quick start

### Drop-in checkout widget

Your backend creates a payment request and returns a `CheckoutSession`. Pass it to `CheckoutWidget` — it handles the full payment UI automatically:

```tsx
import { FluxisProvider, CheckoutWidget } from '@fluxisus/react';
import type { CheckoutSession } from '@fluxisus/react';

function CheckoutPage({ session }: { session: CheckoutSession }) {
  return (
    <FluxisProvider>
      <CheckoutWidget session={session} style={{ maxWidth: 480 }} />
    </FluxisProvider>
  );
}
```

Poll your backend for status updates and pass the refreshed session to keep the widget in sync.

When `session.status === 'completed'`, the widget shows a manual "Volver al comercio" link to `session.return_url` and, if the shopper doesn't click it, redirects automatically after 5 seconds.

### Sessions requiring asset selection

If a session has configured payment options and no vault assigned yet, the backend reports `status: 'selecting_asset'` along with `payment_options: CheckoutPaymentOption[]` — each carrying `unique_asset_id`, `symbol` and `network`, so the picker can label choices rather than show raw asset ids. Pass an `onSelectAsset` callback so `CheckoutWidget` can render the picker — the widget itself never calls your API, it only invokes the callback with the shopper's choice and shows a loading state while it resolves:

```tsx
function CheckoutPage({ session, refetch }: { session: CheckoutSession; refetch: () => void }) {
  async function handleSelectAsset(assetId: string) {
    await fetch(`/api/checkout/${session.id}/select-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unique_asset_id: assetId }),
    });
    refetch();
  }

  return (
    <FluxisProvider>
      <CheckoutWidget session={session} onSelectAsset={handleSelectAsset} style={{ maxWidth: 480 }} />
    </FluxisProvider>
  );
}
```

### Building a custom UI

Use the lower-level components directly with a NASPIP token:

```tsx
import { FluxisProvider, FluxisQrCode, CompatibleApps } from '@fluxisus/react';

function Checkout({ token }: { token: string }) {
  return (
    <FluxisProvider theme={{ colorPrimary: '#2563eb' }}>
      <FluxisQrCode token={token} size={280} />
      <CompatibleApps token={token} />
    </FluxisProvider>
  );
}
```

## Components

### `CheckoutWidget`

All-in-one hosted checkout UI. Renders the correct screen based on `session.status`:

| Status | UI |
|--------|----|
| `pending` | Amount · countdown · QR (desktop) or wallet buttons (mobile) · copy address |
| `confirming` | Animated spinner + confirmation message |
| `completed` | Success icon + return link |
| `expired` | Clock icon + restart button |

```tsx
<CheckoutWidget session={session} style={{ width: '100%', maxWidth: 480 }} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `session` | `CheckoutSession` | required | Payment session from your backend |
| `className` | `string` | — | Wrapper class |
| `style` | `CSSProperties` | — | Wrapper style |

### `CountdownTimer`

Counts down in real time to a payment expiration timestamp. Changes color to amber at ≤ 2 min and red at ≤ 1 min. Calls `onExpire` exactly once at zero.

```tsx
<CountdownTimer expiresAt={session.expires_at} onExpire={() => setExpired(true)} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `expiresAt` | `string` | required | ISO 8601 expiration timestamp |
| `onExpire` | `() => void` | — | Called once when timer reaches zero |
| `className` | `string` | — | Wrapper class |

### `AddressCopyButton`

Renders a truncated crypto address with a copy-to-clipboard button. Shows a checkmark confirmation for 2 seconds after copying.

```tsx
<AddressCopyButton address="0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `address` | `string` | required | Wallet address to copy |
| `className` | `string` | — | Wrapper class |

### `PaymentStatusBadge`

Inline colored badge mapping a payment status to a readable label.

```tsx
<PaymentStatusBadge status={session.status} />
```

| Status | Label | Color |
|--------|-------|-------|
| `pending` | Pending | Blue |
| `confirming` | Confirming | Amber |
| `completed` | Completed | Green |
| `expired` | Expired | Gray |

### `AmountDisplay`

Formats and renders a payment amount with its currency code.

```tsx
<AmountDisplay amount={session.amount} currency={session.currency} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `amount` | `string \| number` | required | Payment amount |
| `currency` | `string` | required | Currency code (e.g. `USD`) |
| `className` | `string` | — | Wrapper class |

### `FluxisQrCode`

Renders a QR code encoding the NASPIP token with the Fluxis logo in the center.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `token` | `string` | required | NASPIP token (`naspip;…`) |
| `size` | `number` | `280` | QR size in pixels |
| `level` | `'L' \| 'M' \| 'Q' \| 'H'` | `'H'` | Error correction (H recommended with logo) |
| `logo` | `string` | bundled Fluxis logo | Center image URL or data URI (overlaid on QR) |
| `logoSize` | `number` | `21.4%` of size | Logo dimensions |
| `fgColor` | `string` | theme | Foreground color |
| `bgColor` | `string` | theme | Background color |
| `className` | `string` | — | Wrapper class |
| `style` | `CSSProperties` | — | Wrapper style |

### `CompatibleApps`

On **mobile**, shows "Pay with \<app\>" buttons that open wallet deep links. On **desktop**, shows the QR code and an informational list of compatible apps.

Fetches app metadata from `https://assets.fluxis.us/sdk-assets/compatible-apps.json` by default.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `token` | `string` | required | NASPIP token for deep links |
| `apps` | `CompatibleApp[]` | fetch | Override the apps list |
| `include` | `string[]` | — | Filter by app `name` |
| `exclude` | `string[]` | — | Exclude by app `name` |
| `forcePlatform` | `'mobile' \| 'desktop'` | auto-detect | Override platform behavior |
| `renderApp` | `(app, button) => ReactNode` | — | Custom render per app |

### `CompatibleAppsMarquee`

Horizontal showcase that scrolls compatible app logos continuously from right to left. Pauses on hover.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number \| string` | `'100%'` | Viewport width |
| `height` | `number` | `56` | Viewport height in pixels |
| `speed` | `number` | `24` | Seconds per full scroll loop |
| `gap` | `number` | `12` | Gap between app cards (px) |
| `showAppName` | `boolean` | `true` | Show app name next to logo |
| `include` / `exclude` | `string[]` | — | Filter by app `name` |
| `onAppClick` | `(app) => void` | — | Optional click handler per app |

```tsx
<CompatibleAppsMarquee width={480} height={56} speed={18} />
```

### `PayWithAppButton`

Single "Pay with \<display_name\>" button with app icon and deep link.

### `FluxisProvider`

Optional wrapper that injects CSS variables (`--fluxis-*`) for global theming.

```tsx
<FluxisProvider theme={{ colorPrimary: '#7c3aed', buttonBg: '#1e1b4b' }}>
  {children}
</FluxisProvider>
```

## Theming

Override priority: **component prop** > **CSS variable from provider** > **default theme**.

Available CSS variables:

- `--fluxis-color-bg`, `--fluxis-color-fg`, `--fluxis-color-primary`
- `--fluxis-color-border`, `--fluxis-color-muted`
- `--fluxis-radius`, `--fluxis-font-family`
- `--fluxis-qr-fg`, `--fluxis-qr-bg`
- `--fluxis-button-bg`, `--fluxis-button-fg`, `--fluxis-button-hover-bg`

## Hooks

### `usePaymentStatus`

Polls **your own backend route** for live payment status — it never calls the Fluxis API directly and accepts no credentials. Your backend is expected to proxy `pointOfSale.getPaymentRequest()` from `@fluxisus/sdk`.

```tsx
import { usePaymentStatus } from '@fluxisus/react';

function CheckoutStatus({ paymentRequestId }: { paymentRequestId: string }) {
  const { status, data, error, isPolling, refetch } = usePaymentStatus(
    `/api/payment-status/${paymentRequestId}`,
  );

  if (status === 'completed') return <p>Payment received!</p>;
  return (
    <div>
      <p>Status: {status ?? 'loading…'}</p>
      <button onClick={refetch}>I already paid — check now</button>
    </div>
  );
}
```

Your route (e.g. `GET /api/payment-status/:id`) should call `fluxis.pointOfSale.getPaymentRequest(posId, id)` server-side and return the result as JSON — `usePaymentStatus` reads the `status` field from whatever your route returns.

| Option | Type | Default | Description |
|---|---|---|---|
| `statusUrl` | `string` | required | Your backend route to poll |
| `pollInterval` | `number` | `5000` | Poll cadence in ms |
| `enabled` | `boolean` | `true` | Pause/resume polling without unmounting |

Returns `{ status, data, error, isPolling, refetch }`. Polling stops automatically once `status` reaches a terminal state (`completed`, `expired`, `failed`, `overpaid`, `underpaid`). On fetch errors, polling backs off exponentially (capped) and resets once a request succeeds again. Call `refetch()` for an on-demand check (e.g. an "I already paid" button) — it fetches immediately and resets the poll timer so it doesn't double-fire right after.

**Clock-skew offset.** On every successful response, the hook reads the `Date` response header and stores `serverDate - Date.now()` in `FluxisProvider`'s shared context, for use by other components doing skew-corrected countdowns. This degrades silently: if your route is same-origin, no extra config is needed; if it's cross-origin, the browser hides the `Date` header by default unless you add:

```
Access-Control-Expose-Headers: Date
```

Without that header, the offset simply stays `0` — nothing breaks, it's advisory only.

## Utilities

```ts
import { isValidNaspipToken, buildDeepLink } from '@fluxisus/react';

isValidNaspipToken('naspip;fluxis.us;abc'); // true
buildDeepLink('https://wallet.app/pay?token=[NASPIP_TOKEN]', token);
```

## Security

- Never expose API keys or secrets in frontend code.
- NASPIP tokens are safe to display client-side when created by your server.
- Webhook verification is server-only.

## License

MIT
