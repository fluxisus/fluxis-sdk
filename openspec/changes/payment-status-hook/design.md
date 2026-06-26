## Context

`@fluxisus/react` follows a strict "backend creates, frontend displays" rule: no API credentials, no PASETO decoding, and no direct calls to the Fluxis API from browser code (see `packages/frontend/CLAUDE.md`). The existing hook `useCompatibleApps` already establishes the patterns this hook should reuse: a `cache`/`inflight` map keyed by URL, abort-aware fetch cancellation, and graceful fallback on fetch failure rather than throwing.

There is currently no `FluxisProvider`-level shared state for cross-component data (e.g. a clock-skew offset). This hook introduces the first such shared value.

## Goals / Non-Goals

**Goals:**
- Provide a single hook that covers polling, manual refetch, and clock-skew offset capture, since all three are needed by near-term follow-up work (token expiration UI, manual sync button).
- Keep the hook's contract minimal and merchant-backend-agnostic: it only assumes the URL returns JSON with a `status` field somewhere recognizable.
- Make CORS/clock-skew degradation invisible to merchants who don't need it — offset defaults to `0` and nothing breaks.

**Non-Goals:**
- WebSocket/SSE or any push-based transport.
- Calling the Fluxis API directly, with or without credentials.
- Validating or shaping the merchant's response payload beyond reading `status` and the `Date` header — `data` is returned as-is for the merchant to interpret.

## Decisions

**Single hook vs. split into `usePaymentStatus` + separate skew hook.**
Chosen: single hook. The clock-skew capture is a side-effect of the same fetch the hook is already making, so splitting it into a second hook would mean two consumers polling the same endpoint, doubling requests. Trade-off: the hook now does two things (status + skew), but the skew offset is opt-in for consumers — they can ignore it via context.

**Where the skew offset lives: `FluxisProvider` context vs. returned from the hook.**
Chosen: `FluxisProvider` context. The offset needs to be available to sibling components (e.g. `FluxisQrCode`'s countdown) that may not be the same component instance calling `usePaymentStatus`. A hook return value can't cross component boundaries without prop drilling. Trade-off: introduces the first piece of shared mutable state in the provider; kept minimal (a single number, last-write-wins).

**Backoff strategy on fetch error.**
Chosen: exponential backoff with a capped ceiling (e.g. base interval → ×2 → ×4, capped at ~60s), reset to the configured `pollInterval` on the next successful response. Rationale: avoids hammering a merchant backend that's down, without requiring the merchant to configure anything extra.

**`refetch()` semantics relative to the interval timer.**
Chosen: `refetch()` performs an immediate fetch and resets the interval's countdown, so a manual check doesn't result in a near-duplicate automatic poll a moment later. Alternative considered (let the interval run independently) was rejected — it doubles requests right after every manual sync for no UX benefit.

**Reading the `Date` header.**
Chosen: read `response.headers.get('date')` after every successful response (interval or manual), parse with `new Date(...)`, compute `offset = parsed.getTime() - Date.now()`. If parsing fails or header is absent/null, leave the offset untouched (do not zero out a previously good offset just because one response lacked the header — only initialize to `0` before the first successful read). This avoids flapping the offset to `0` on a single transient missing header.

## Risks / Trade-offs

- **[Risk]** Cross-origin merchant backends without `Access-Control-Expose-Headers: Date` silently get offset `0` forever, with no way for the SDK to detect *why*. → **Mitigation**: document the requirement prominently in the README with a same-origin vs. cross-origin example; this is a documentation problem, not a code problem, and the fallback is safe by design (advisory UI only, never blocks core functionality).
- **[Risk]** Aggressive default polling could be mistaken for hitting the Fluxis API aggressively, which `CLAUDE.md` explicitly warns against ("Do NOT poll payment status aggressively — webhooks are primary"). → **Mitigation**: this hook only ever polls the *merchant's own backend route*, never the Fluxis API; the README must state this explicitly so merchants don't wire it directly to a Fluxis endpoint.
- **[Risk]** Shared context offset is global per `FluxisProvider`, so multiple concurrent `usePaymentStatus` calls (e.g. multiple QR codes on one page) will overwrite each other's offset. → **Mitigation**: acceptable for v1 since clock skew is a property of the user's device/network path, not of any individual payment; last-write-wins is correct behavior, not a bug.

## Migration Plan

N/A — purely additive, no existing code path is changed. No rollback considerations beyond removing the new files if needed.

## Open Questions

- None blocking. Naming of the context field for the offset (e.g. `serverTimeOffsetMs`) will be finalized during implementation to match existing `FluxisProvider` naming conventions.
