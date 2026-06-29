## 1. Context plumbing

- [x] 1.1 Add a `serverTimeOffsetMs` field (default `0`) and setter to `FluxisProvider`'s internal context state
- [x] 1.2 Export a small internal hook (e.g. `useServerTimeOffset`) for reading/updating the offset, scoped to this package (not part of the public API surface yet)

## 2. Core hook implementation

- [x] 2.1 Create `src/hooks/usePaymentStatus.ts` with the `usePaymentStatus(statusUrl, options?)` signature returning `{ status, data, error, isPolling, refetch }`
- [x] 2.2 Implement interval-driven polling with default ~4-5s cadence, configurable via `options.pollInterval`
- [x] 2.3 Implement terminal-status detection (`completed`, `expired`, `failed`, `overpaid`, `underpaid`) that stops further polling
- [x] 2.4 Implement `enabled` option to pause/resume polling without unmounting
- [x] 2.5 Implement fetch cancellation and timer cleanup on unmount (mirror `useCompatibleApps.ts` pattern)
- [x] 2.6 Implement exponential backoff with capped ceiling on fetch error, reset to configured interval on next success
- [x] 2.7 Implement `refetch()`: immediate fetch, resets the interval timer, shares error/backoff handling with interval polls

## 3. Clock-skew offset capture

- [x] 3.1 On every successful response, read the `Date` response header and parse it
- [x] 3.2 Compute `offset = parsedServerDate - Date.now()` and write it to the shared context state from task 1.1
- [x] 3.3 If the header is missing/unparseable, leave any previously set offset unchanged; only default to `0` before the first successful read
- [x] 3.4 Ensure header read/parse failures never throw or surface as a hook `error`

## 4. Tests

- [x] 4.1 Unit tests: polling starts on mount, stops on each terminal status, respects custom `pollInterval`
- [x] 4.2 Unit tests: `enabled: false` prevents fetches; toggling to `true` resumes
- [x] 4.3 Unit tests: cleanup cancels in-flight fetch and timer on unmount, no post-unmount state updates
- [x] 4.4 Unit tests: fetch error triggers backoff, recovers to normal interval after next success
- [x] 4.5 Unit tests: `refetch()` fetches immediately and resets the interval timer (no near-duplicate poll)
- [x] 4.6 Unit tests: offset computed correctly when `Date` header present; stays `0` when absent across all responses; previously-set offset survives a later response missing the header

## 5. Docs

- [x] 5.1 README: document the required merchant-side backend route (e.g. `GET /api/payment-status/:id`) proxying `pointOfSale.getPaymentRequest()`, and that this hook never calls the Fluxis API directly
- [x] 5.2 README: document the `Access-Control-Expose-Headers: Date` requirement for cross-origin status endpoints, with a same-origin example needing no extra config
