## Context

`CopyField` renders `{value}` as the visible text and passes `value` to `navigator.clipboard.writeText`. Replacing the visible text with `AddressFormat` requires decoupling what's shown from what's copied.

## Goals / Non-Goals

**Goals:**
- Bold first 8 / last 8 chars of the address visually.
- Keep full address on clipboard.
- Zero additional dependencies.

**Non-Goals:**
- Truncating the middle with an ellipsis — the full middle section is visible (muted, not hidden).
- Exporting `AddressFormat` from the public SDK index — it's an internal display primitive.
- Applying to the amount field.

## Decisions

**`display?: React.ReactNode` on CopyField**: The cleanest minimal change. `CopyField` already has a `value` (for copy) and a visible span (for display). Adding `display` lets callers pass any React node as the visible content without restructuring the component. When omitted, behaviour is identical to today.

**`boldChars = 8` default**: Matches what the dApp uses. 8 chars is enough to disambiguate addresses visually; 6 is too short for ETH-style addresses.

**Internal-only**: `AddressFormat` is only used in `ManualTransferContent`. No public export needed.

## Risks / Trade-offs

- [Minimal] If `address` is very short (≤ 16 chars), the whole string is rendered bold — acceptable edge case for non-standard addresses.
