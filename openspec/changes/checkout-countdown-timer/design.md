## Context

`PendingScreen` in `@fluxisus/react` renders the active payment widget. It currently shows expiry time as a static string via `formatExpiryTime(session.expires_at)`. There is no live tick, no urgency cue, and no proactive lock when the session expires between polls (every 3 s).

`CountdownTimerProps` is already defined in `types.ts` (`expiresAt: string; onExpire?: () => void; className?: string`) — the component just needs to be implemented.

## Goals / Non-Goals

**Goals:**
- Live `mm:ss` countdown with color urgency transitions (amber at ≤ 2 min, red+bold at ≤ 30 s)
- `onExpire` callback fires exactly once at zero
- PendingScreen expiry overlay bridges the gap between timer zero and the next poll

**Non-Goals:**
- Server-sync of remaining time (client clock drift is acceptable for a ≤ 15 min session)
- Pausing/resuming the timer (not needed)
- Animating the overlay in/out (plain fade would require CSS keyframes; overkill)

## Decisions

### `setInterval` at 1 s vs `requestAnimationFrame`
**Decision:** `setInterval(fn, 1000)` inside `useEffect`.

Rationale: The display only needs second-level granularity. `rAF` runs at 60 fps and would re-render every frame with no visible benefit. A 1 s interval is correct and cheap. Clean up with `clearInterval` on unmount.

### Overlay implementation: absolute-positioned div vs portal
**Decision:** Absolute div inside `PendingScreen`'s outer container (which gets `position: relative`).

Rationale: A portal would require a DOM ref or `createPortal`, adding complexity. The overlay only needs to cover the widget itself, not the full viewport, so absolute positioning inside the widget's root is sufficient and simpler.

### Color values (hardcoded vs CSS vars)
**Decision:** Hardcoded hex (`#d97706` amber, `#dc2626` red) as inline styles, consistent with how other urgency colors are done in the checkout components.

Rationale: No `--fluxis-*` CSS variable exists for urgency states, and defining new ones for a single component is overengineering. This matches the pattern used in `NETWORK_COLORS` and `ASSET_COLORS`.

## Risks / Trade-offs

- **Client clock skew** → If the user's system clock is off by minutes, the countdown could reach zero before or after the actual expiry. Mitigation: the overlay is temporary and the poll will correct within 3 s.
- **`onExpire` called on mount for already-expired sessions** → This is intentional (spec requirement). PendingScreen's poll will catch it and transition to the expired screen quickly.

## Migration Plan

No migration needed. `CountdownTimer` is a new export. `PendingScreen` prop interface is unchanged — the change is internal.
