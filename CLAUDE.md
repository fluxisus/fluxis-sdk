# CLAUDE.md — Fluxis SDK Monorepo

> This file provides shared API context for AI coding agents working on any Fluxis SDK.
> For language-specific conventions, see the `CLAUDE.md` inside each `packages/sdk-*` directory.

## What is Fluxis?

Fluxis is a crypto payment processing infrastructure. It standardizes payment instructions
via the **NASPIP protocol** — a portable token that encodes payment data and can be
transmitted via QR, NFC, or API. Merchants integrate Fluxis to accept crypto payments.

## Monorepo Structure

```
fluxis-sdks/
├── CLAUDE.md                 # This file — shared API context
├── packages/
│   ├── sdk/                  # TypeScript SDK (@fluxisus/sdk)
│   ├── react/                # React bindings (future)
│   ├── sdk-csharp/           # C# SDK (Fluxis.Sdk)
│   ├── sdk-python/           # Python SDK (fluxis)
│   └── sdk-go/               # Go SDK (github.com/fluxisus/fluxis-sdk/packages/sdk-go)
├── spec/
│   └── swagger.yaml          # OpenAPI spec — source of truth
├── examples/
│   └── demo-checkout/        # TS example apps
├── scripts/
│   ├── publish-npm.sh
│   ├── publish-nuget.sh
│   ├── publish-pypi.sh
│   └── validate-spec.sh
└── .github/workflows/        # Per-language CI/CD
    ├── sdk-typescript.yml
    ├── sdk-csharp.yml
    ├── sdk-python.yml
    ├── sdk-go.yml
    └── validate-spec.yml
```

### Principles

- Each SDK is an **independent package** with its own lifecycle, version, and publish pipeline.
- The **source of truth** is always `spec/swagger.yaml`.
- SDKs are **hand-written** for idiomatic ergonomics — NOT auto-generated from the spec.
- Tests run against the **Fluxis staging sandbox**, not mocks.
- Non-JS packages (C#, Python, Go) live alongside JS workspaces without interference.
  The root `package.json` uses npm workspaces only for JS packages.

## Architecture: Key Concepts

- **Organization**: Top-level entity (the business using Fluxis). Has API keys.
- **Account**: Sub-entity under an Organization (e.g., a branch or sub-merchant).
- **Point of Sale (PoS)**: A payment endpoint tied to an Organization or Account. Each PoS has its own config (accepted assets, merchant info) and webhook settings.
- **Payment Request**: A request for payment created under a PoS. Returns a NASPIP token.
- **NASPIP Token**: A PASETO v4 token encoding payment instructions (amount, address, asset, expiration). Can be rendered as QR code or transmitted via NFC.
- **Transaction**: On-chain record of a deposit, withdrawal, swap, refund, etc.
- **Refund**: Refund of a completed/overpaid payment request, sent to a specified blockchain address.

## Authentication Flow

Fluxis uses a **two-step auth**:

1. **Obtain token**: `POST /v1/auth/token` with `api_key` + `api_secret` in body.
   - Returns a PASETO v4 access token + `expired_at` timestamp.
   - API key format: `fxs.stg.{uuid}` (staging) or `fxs.prd.{uuid}` (production).
2. **Use token**: All subsequent requests require TWO headers:
   - `Authorization: Bearer <token>` (the PASETO token from step 1)
   - `x-fluxis-api-key: <api_key_id>` (the API key ID, NOT the secret)

**Every SDK must handle token refresh automatically** — check `expired_at` before each request
and re-authenticate if expired or about to expire.

## API Base URLs

- **Staging**: `https://api.stgfluxis.us/v1`
- **Production**: `https://api.fluxis.us/v1`

## API Endpoints (grouped by tag)

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/token` | Get access token (api_key + api_secret → PASETO token) |

### Accounts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/account` | List all accounts |
| POST | `/account` | Create account |
| GET | `/account/{accountId}` | Get account by ID |
| PUT | `/account/{accountId}` | Update account |
| DELETE | `/account/{accountId}` | Delete account |
| GET | `/account/{accountId}/settlement-addresses` | Get settlement addresses |

### Organization
| Method | Path | Description |
|--------|------|-------------|
| POST | `/organization/settlement-addresses` | Set settlement addresses |
| PUT | `/organization/settlement-addresses` | Update settlement addresses |

### Point of Sale
| Method | Path | Description |
|--------|------|-------------|
| GET | `/pos` | List all PoS |
| POST | `/pos` | Create PoS |
| GET | `/pos/{posId}` | Get PoS by ID |
| PUT | `/pos/{posId}` | Update PoS config |
| GET | `/pos/{posId}/notifications` | Get webhook settings |
| POST | `/pos/{posId}/notifications` | Create webhook settings (returns secret) |
| PUT | `/pos/{posId}/notifications` | Update webhook URL |
| POST | `/pos/{posId}/payment-request` | Create payment request (returns NASPIP token) |
| GET | `/pos/{posId}/payment-request/{paymentRequestId}` | Get payment request status |
| POST | `/pos/{posId}/payment-request-checkout` | Create payment request with checkout URL |

### NASPIP Token
| Method | Path | Description |
|--------|------|-------------|
| POST | `/naspip/create` | Create NASPIP token from raw payment data |
| POST | `/naspip/read` | Verify and decode a NASPIP token |

### Refunds
| Method | Path | Description |
|--------|------|-------------|
| POST | `/refunds/payment-request/{paymentRequestId}` | Create refund for a payment |
| GET | `/refunds/{refundId}` | Get refund details |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/transactions` | List transactions (paginated, filterable) |

## Key Schemas

### PaymentRequestRequest (create payment)
```json
{
  "amount": "1234.99",
  "unique_asset_id": "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "reference_id": "order-12345",
  "order": {
    "total": "1234.99",
    "coin_code": "USD",
    "description": "Order description",
    "merchant": { "name": "Shop", "description": "..." },
    "items": [{ "description": "Item", "quantity": 1, "unit_price": "1234.99", "amount": "1234.99", "coin_code": "USD" }]
  }
}
```

### PaymentRequestResponse
```json
{
  "id": "uuid",
  "status": "created",
  "token": "v4.local.xxx...",
  "reference_id": "order-12345",
  "expiration": 1717833600
}
```

### PaymentRequestCheckoutRequest (creates checkout URL)
```json
{
  "amount": "1234.99",
  "coin_code": "USD",
  "reference_id": "order-12345",
  "order": { "..." : "same structure as above" }
}
```

### AuthTokenRequest / Response
```json
// Request
{ "api_key": "fxs.stg.{uuid}", "api_secret": "tQd^RW213A3q2ojzvJn" }
// Response
{ "token": "v4.local.Gx1TZT3STnhzZ-0o", "expired_at": "2025-08-07T10:34:03.000Z" }
```

### CreateRefundRequest
```json
{
  "refund_to_address": "0x1234...",
  "amount": "100.50",
  "reason": "Customer requested"
}
```

### API Response Envelope
All responses follow this pattern:
```json
// Success
{ "status": "success", "data": { ... } }
// Error
{ "status": "error", "code": "AK0001", "message": "Invalid credentials", "details": "The provided API key is invalid" }
```

### Payment Request Statuses
- `created` — just created, awaiting payment
- `processing` — deposit detected, confirming
- `completed` — fully paid
- `overpaid` — received more than requested
- `underpaid` — received less than requested
- `expired` — NASPIP token expired, no payment received
- `failed` — payment processing failed

### Transaction Types
`deposit`, `withdraw`, `refund`, `adjustment`, `swap`, `payment_in`, `payment_out`, `dry_run`

### Transaction Statuses
`preview`, `pending`, `created`, `processing`, `error`, `expired`, `failed`, `completed`

## Cross-SDK Implementation Notes

These rules apply to **every SDK**, regardless of language:

1. **Auto-auth**: Lazily authenticate on first request. Cache the token. Re-auth before expiry.

2. **Case conversion**: The API uses `snake_case`. Each SDK should convert to the idiomatic
   case for its language (camelCase for TS, PascalCase for C#, snake_case for Python, PascalCase for Go structs).

3. **Unique Asset IDs**: Format: `n{network}_t{tokenAddress}`. Example: `npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` = USDC on Polygon.

4. **NASPIP tokens**: PASETO v4 tokens. Do NOT decode locally — use `/naspip/read`. Provide a helper to check validity (`v4.local.` prefix).

5. **Webhook verification**: Provide a `verifyWebhookSignature()` utility using the secret from `POST /pos/{posId}/notifications`.

6. **Two payment flows**:
   - `createPaymentRequest`: Takes `unique_asset_id`. Returns NASPIP token.
   - `createPaymentRequestCheckout`: Takes `coin_code` (fiat). Returns checkout URL.

7. **Pagination**: `/transactions` supports `limit`, `offset`, `sort`, `order`, `status`.

## What NOT to Do (all SDKs)

- Do NOT hardcode API keys or secrets (use `fxs.stg.xxx` in examples)
- Do NOT implement PASETO decoding locally — use `/naspip/read`
- Do NOT poll payment status aggressively — webhooks are primary
- Do NOT expose `api_secret` after initialization
- Do NOT use untyped/dynamic constructs for API responses
