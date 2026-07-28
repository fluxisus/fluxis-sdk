## 1. Add CheckIcon

- [x] 1.1 Add `CheckIcon` SVG component to `packages/frontend/react/src/components/checkout/icons.tsx` (14×14, circle + check path, same stroke style as `CopyIcon`)

## 2. Update CopyField

- [x] 2.1 Import `CheckIcon` in `CopyField.tsx` and replace the `<span>Copiado</span>` branch with `<CheckIcon />`
- [x] 2.2 Verify `aria-label` on the button reads `"Copiado"` when `copied === true` and `"Copiar <label>"` otherwise

## 3. Verify

- [x] 3.1 Start checkout-web dev server, open `/checkout/mock-created`, expand the manual transfer accordion, copy a field — confirm CheckIcon appears for ~2 s then reverts to CopyIcon with no width shift
- [x] 3.2 Run `bun run build` in `packages/frontend/react` — confirm no TypeScript errors
