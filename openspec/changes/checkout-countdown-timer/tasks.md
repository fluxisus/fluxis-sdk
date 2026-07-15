## 1. CountdownTimer component

- [x] 1.1 Create `packages/frontend/react/src/components/checkout/CountdownTimer.tsx` — `useEffect`+`setInterval` at 1 s, compute `Math.max(0, remainingMs)`, format as `mm:ss`, clear interval on unmount
- [x] 1.2 Apply color transitions: default color when > 120 s, amber `#d97706` when ≤ 120 s, red `#dc2626` + `fontWeight: 700` when ≤ 30 s
- [x] 1.3 When remaining hits 0: call `onExpire?.()` and stop the interval (guard with a ref or state to ensure single call)
- [x] 1.4 Handle already-expired case on mount: if `expiresAt` is in the past, show "00:00" and call `onExpire` immediately via `useEffect`

## 2. Export CountdownTimer

- [x] 2.1 Add `export { CountdownTimer } from './components/checkout/CountdownTimer.js'` to `packages/frontend/react/src/index.ts` (or confirm it is already exported via `CountdownTimerProps` presence in types.ts)

## 3. Integrate into PendingScreen

- [x] 3.1 Import `CountdownTimer` and `useState` in `PendingScreen.tsx`; add `const [expired, setExpired] = useState(false)` at component top
- [x] 3.2 Replace `<DetailRow label="Expira a las" value={formatExpiryTime(session.expires_at)} />` with a custom row: label "Expira en", value renders `<CountdownTimer expiresAt={session.expires_at} onExpire={() => setExpired(true)} />`
- [x] 3.3 Add `position: 'relative'` to PendingScreen's outer `div` style
- [x] 3.4 Render expiry overlay when `expired === true`: absolute-positioned div covering the widget (inset 0), `background: rgba(255,255,255,0.85)`, centered flex column with "Este pago ha expirado" (bold) and "Actualizando…" (muted)

## 4. Build & verify

- [x] 4.1 Run `bun run build` in `packages/frontend/react` — no TypeScript errors
- [x] 4.2 `yalc publish --no-scripts` + `yalc update @fluxisus/react` in checkout-web, restart dev server
- [x] 4.3 Open `/checkout/mock-created` — confirm "Expira en" row shows a live ticking countdown (watch for 1 s updates)
- [x] 4.4 Change `mock-created` `expires_at` to `new Date(Date.now() + 25 * 1000).toISOString()` in handlers.ts, reload, confirm red+bold at ≤ 30 s, then overlay appears and shows "Este pago ha expirado — Actualizando…"
