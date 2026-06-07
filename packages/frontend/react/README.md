# @fluxisus/react

Official React SDK for Fluxis payment UI — standardized QR codes with the Fluxis logo and compatible wallet deep links.

## Install

```bash
npm install @fluxisus/react qrcode.react react react-dom
```

## Quick start

Your backend creates a payment request and returns a NASPIP token. Pass it to the components:

```tsx
import { FluxisProvider, FluxisQrCode, CompatibleApps } from '@fluxisus/react';

const token = 'naspip;fluxis.us;...'; // from your backend

function Checkout({ token }: { token: string }) {
  return (
    <FluxisProvider
      theme={{
        colorPrimary: '#2563eb',
        qrFg: '#0f172a',
        qrBg: '#ffffff',
      }}
    >
      <FluxisQrCode token={token} size={280} />
      <CompatibleApps token={token} />
    </FluxisProvider>
  );
}
```

## Components

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
