# CLAUDE.md — Fluxis Go SDK

> Language-specific conventions for the Go SDK.
> For API details, authentication flow, schemas, and endpoints see the root `CLAUDE.md`.

## Project Layout

```
packages/backend/sdk-go/
├── go.mod
├── fluxis/
│   ├── client.go              # FluxisClient — auth, HTTP, token refresh
│   ├── options.go             # Functional options (WithAPIKey, WithEnvironment, etc.)
│   ├── accounts.go
│   ├── organization.go
│   ├── point_of_sale.go
│   ├── naspip.go
│   ├── refunds.go
│   ├── transactions.go
│   ├── models.go              # All request/response structs
│   ├── errors.go              # FluxisError, FluxisAuthError
│   ├── webhooks.go            # VerifyWebhookSignature()
│   └── fluxis_test.go         # Tests alongside code (Go convention)
├── CLAUDE.md                  # This file
└── README.md
```

## Naming Conventions

- **Module path**: `github.com/fluxisus/fluxis-sdk/packages/backend/sdk-go`
- **Package name**: `fluxis`
- **Exported types**: PascalCase (`FluxisClient`, `PointOfSale`, `CreatePaymentRequest`)
- **Unexported helpers**: camelCase (`doRequest`, `refreshToken`)
- **Struct fields**: PascalCase with `json:"snake_case"` tags
- **Methods**: PascalCase for exported (`CreatePaymentRequest`), no `Async` suffix (Go uses goroutines)
- **Errors**: `var ErrAuth = errors.New(...)` pattern, or custom error types

## Design Rules

1. **Zero external dependencies**: Use only `net/http`, `encoding/json`, `crypto/hmac`
   from the standard library. Do NOT add third-party HTTP or JSON libs.

2. **Functional options pattern**: Configure the client with `NewClient(WithAPIKey("..."), ...)`.

3. **Context-first**: Every public method takes `context.Context` as first parameter.
   ```go
   func (c *Client) CreatePaymentRequest(ctx context.Context, posID string, req *CreatePaymentRequest) (*PaymentRequest, error)
   ```

4. **Auth flow**: Same as TS SDK — lazy auth on first request, auto-refresh before expiry.
   Use `sync.Mutex` for thread safety.

5. **snake_case ↔ PascalCase**: Handled via `json:"snake_case"` struct tags.

6. **API response envelope**: Parse into `apiResponse[T]` generic struct (Go 1.18+).
   Return `*FluxisError` on `status: "error"`.

7. **Error handling**: Return `error` as last return value (standard Go).
   Provide typed errors (`*FluxisError`, `*FluxisAuthError`) for callers to inspect with `errors.As`.

## Testing

- Use standard `testing` package + `testify/assert` (only allowed external dep for tests)
- Tests run against the Fluxis staging sandbox (not mocks)
- Run: `go test ./...`

## Build & Publish

```bash
go build ./...
go test ./...
go vet ./...
# Go modules publish automatically via git tags (e.g., packages/backend/sdk-go/v0.1.0)
```

## What NOT to Do

- Do NOT add external dependencies — stdlib only
- Do NOT use `interface{}` / `any` for API responses — use typed structs
- Do NOT panic — return errors
- Do NOT hardcode API keys in tests — use environment variables
- Do NOT use init() functions
