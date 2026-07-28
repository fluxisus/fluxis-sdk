## Context

`CopyField` is an internal component in `ManualTransferContent`. After a successful clipboard write it sets `copied = true` for 2 seconds. Currently the "copied" visual is a `<span>Copiado</span>` text node inside the icon-button, which widens the button and embeds Spanish text in a shared primitive.

## Goals / Non-Goals

**Goals:**
- Replace the text label with a same-size SVG icon so button width stays constant.
- Remove the only hard-coded Spanish string from a non-translated primitive.

**Non-Goals:**
- i18n / prop-based label customisation — not needed; the icon is self-explanatory.
- Changing copy timing (still 2 seconds).
- Modifying any other component.

## Decisions

**Inline SVG over an icon library**: All existing icons in `icons.tsx` are inline SVGs. Adding one more keeps zero extra dependencies and matches the bundle-size philosophy of `@fluxisus/react`.

**`CheckIcon` shape**: Lucide's `check-circle-2` path (circle + inner check). Same 14×14 viewport, stroke width 2, round caps/joins — visually consistent with `CopyIcon`.

## Risks / Trade-offs

- [Minimal] Users who relied on "Copiado" text as ARIA feedback still get `aria-label="Copiado"` on the button — no accessibility regression.
