## Why

`ManualTransferContent` shows the full wallet address as a plain monospace string. Users can't quickly verify they're sending to the right address without reading every character. Bolding the first 8 and last 8 characters — a standard crypto-wallet UX pattern — lets users spot-check the address endpoints at a glance.

## What Changes

- Add internal `AddressFormat` component: renders `<bold first-8><muted middle><bold last-8>` in monospace.
- Add optional `display?: React.ReactNode` prop to `CopyField` so the visible text can differ from the clipboard value.
- Apply `AddressFormat` to the "Dirección" field in `ManualTransferContent`. The "Importe" field stays unchanged (plain number, no truncation needed).

## Capabilities

### New Capabilities

- `address-format`: Renders a blockchain address with bold endpoint characters and a muted middle section for visual scannability, while keeping the full address available for clipboard copy.

### Modified Capabilities

## Impact

- **`packages/frontend/react/src/components/checkout/AddressFormat.tsx`** — new internal component
- **`packages/frontend/react/src/components/checkout/CopyField.tsx`** — optional `display` prop
- **`packages/frontend/react/src/components/checkout/ManualTransferContent.tsx`** — dirección field uses `AddressFormat`
- No public API changes, no breaking changes
