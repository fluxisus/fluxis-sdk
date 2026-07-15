## Why

`CopyField` currently shows a "Copiado" text label for 2 seconds after copying — this breaks button sizing and leaks Spanish into a UI primitive that should be locale-agnostic. Swapping to a `CheckIcon` SVG keeps the button footprint constant and is universally understood.

## What Changes

- Add `CheckIcon` inline SVG to `icons.tsx` (14×14, same stroke style as `CopyIcon`).
- Replace the `<span>Copiado</span>` branch in `CopyField.tsx` with `<CheckIcon />`.

## Capabilities

### New Capabilities

- `copy-field-checkmark`: `CopyField` copy-feedback uses a check-circle icon instead of the "Copiado" text label, keeping button size constant and removing hard-coded Spanish.

### Modified Capabilities

## Impact

- **`packages/frontend/react/src/components/checkout/icons.tsx`** — one new export `CheckIcon`
- **`packages/frontend/react/src/components/checkout/CopyField.tsx`** — replace text feedback with `CheckIcon`
- No API changes, no breaking changes to public exports
