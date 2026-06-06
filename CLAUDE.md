# CLAUDE.md — Fluxis SDK Monorepo

> This file provides shared API context for AI coding agents working on any Fluxis SDK.
> For language-specific conventions, see the `CLAUDE.md` inside each `packages/backend/sdk-*` or `packages/frontend/` package directory.

## What is Fluxis?

Fluxis is a crypto payment processing infrastructure. It standardizes payment instructions
via the **NASPIP protocol** — a portable token that encodes payment data and can be
transmitted via QR, NFC, or API. Merchants integrate Fluxis to accept crypto payments.

## Monorepo Structure

```
fluxis-sdks/
├── CLAUDE.md                 # This file — shared API context
├── packages/
│   ├── backend/
│   │   ├── sdk/              # TypeScript SDK (@fluxisus/sdk)
│   │   ├── sdk-csharp/       # C# SDK (Fluxis.Sdk)
│   │   ├── sdk-python/       # Python SDK (fluxis)
│   │   └── sdk-go/           # Go SDK (github.com/fluxisus/fluxis-sdk/packages/sdk-go)
│   └── frontend/             # Frontend SDKs (@fluxisus/react, …)
│       ├── README.md
│       ├── CLAUDE.md
│       └── <framework>/    # One npm package per subdirectory
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
    ├── sdk-frontend.yml
    └── validate-spec.yml
```

### Principles

- Each SDK is an **independent package** with its own lifecycle, version, and publish pipeline.
- The **source of truth** is always `spec/swagger.yaml`.
- SDKs are **hand-written** for idiomatic ergonomics — NOT auto-generated from the spec.
- Tests run against the **Fluxis staging sandbox**, not mocks.
- Non-JS packages (C#, Python, Go) live alongside JS workspaces without interference.
  The root `package.json` uses npm workspaces for backend (`packages/backend/sdk`) and frontend (`packages/frontend/*`) packages.

## Architecture: Key Concepts

- **Organization**: Top-level entity (the business using Fluxis). Has API keys.
- **Account**: Sub-entity under an Organization (e.g., a branch or sub-merchant).
- **Point of Sale (PoS)**: A payment endpoint tied to an Organization or Account. Each PoS has a type (`cashier_fixed`, `online_fixed`, `cashier_open`), config (accepted assets, merchant info, reference currency), and can host payment intentions.
- **Payment Request**: A request for payment created under a PoS. Returns a NASPIP token.
- **Payment Intention**: Open-amount flow for `cashier_open` PoS — payer selects currency after merchant creates an intention.
- **NASPIP Token**: A PASETO v4 token encoding payment instructions (amount, address, asset, expiration). Can be rendered as QR code or transmitted via NFC.
- **Transaction**: On-chain record of a deposit, withdrawal, swap, etc.
- **Webhook**: Account-scoped HTTP callback for events (`payment_request`, `incoming_transfer`, `refund`). Secret returned on create.

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
| POST | `/account/{accountId}/settlement-addresses` | Set settlement address |
| PUT | `/account/{accountId}/settlement-addresses` | Update settlement address |
| DELETE | `/account/{accountId}/settlement-addresses?network=` | Delete settlement address |

### Organization
| Method | Path | Description |
|--------|------|-------------|
| GET | `/organization` | Get organization |
| GET | `/organization/settlement-addresses` | Get settlement addresses |
| POST | `/organization/settlement-addresses` | Set settlement address |
| PUT | `/organization/settlement-addresses` | Update settlement address |
| DELETE | `/organization/settlement-addresses?network=` | Delete settlement address |

### Point of Sale
| Method | Path | Description |
|--------|------|-------------|
| GET | `/pos?page=&page_size=` | List PoS (paginated) |
| POST | `/pos` | Create PoS (requires `type`, `reference_currency`) |
| GET | `/pos/{posId}` | Get PoS by ID |
| PUT | `/pos/{posId}` | Update PoS config |
| DELETE | `/pos/{posId}` | Delete PoS |
| GET | `/pos/{posId}/payment-intention` | Get payment intention |
| POST | `/pos/{posId}/payment-intention` | Create payment intention |
| POST | `/pos/{posId}/payment-intention/close` | Close payment intention |
| POST | `/pos/{posId}/payment-request` | Create payment request (returns NASPIP token) |
| GET | `/pos/{posId}/payment-request/{paymentRequestId}` | Get payment request status |
| POST | `/pos/{posId}/payment-request-checkout` | Create payment request with checkout URL |
| GET | `/pos/{posId}/qr` | Get QR code for PoS |

### NASPIP Token
| Method | Path | Description |
|--------|------|-------------|
| POST | `/naspip/create` | Create NASPIP token from raw payment data |
| POST | `/naspip/read` | Verify and decode a NASPIP token |

### Webhooks (account-scoped)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/account/{accountId}/webhook` | Create webhook (returns secret) |
| GET | `/account/{accountId}/webhook/list` | List webhooks |
| GET | `/account/{accountId}/webhook/logs` | Get webhook delivery logs (paginated) |
| PATCH | `/account/{accountId}/webhook/{webhookId}/activate` | Activate webhook |
| PATCH | `/account/{accountId}/webhook/{webhookId}/deactivate` | Deactivate webhook |
| DELETE | `/account/{accountId}/webhook/{webhookId}/delete` | Delete webhook |
| POST | `/account/{accountId}/webhook/{webhookId}/test` | Send test event |
| PUT | `/account/{accountId}/webhook/{webhookId}/url` | Update webhook URL |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/transactions?page=&page_size=` | List transactions (paginated) |

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
  "amount": 1234.99,
  "coin_code": "USD",
  "reference_id": "order-12345",
  "order": { "..." : "same structure as above" }
}
```

### CreatePaymentIntentionRequest (open PoS flow)
```json
{
  "amount": 1234.99,
  "coin_code": "USD",
  "external_id": "order-12345"
}
```

### WebhookCreateRequest
```json
{
  "event_type": "payment_request",
  "url": "https://example.com/webhook",
  "description": "Payment status updates"
}
```

### AuthTokenRequest / Response
```json
// Request
{ "api_key": "fxs.stg.{uuid}", "api_secret": "tQd^RW213A3q2ojzvJn" }
// Response
{ "token": "v4.local.Gx1TZT3STnhzZ-0o", "expired_at": "2025-08-07T10:34:03.000Z" }
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
- `pending` — created by merchant, waiting for payer to select payment currency
- `created` — payer selected currency, address assigned, awaiting payment
- `processing` — deposit detected, confirming
- `completed` — fully paid
- `confirmed` — confirmed transaction created
- `overpaid` — received more than requested
- `underpaid` — received less than requested
- `expired` — NASPIP token expired, no payment received
- `failed` — payment processing failed

### Point of Sale Types
- `cashier_fixed` — fixed amount at cashier
- `online_fixed` — fixed amount online checkout
- `cashier_open` — customer scans and enters amount

### Webhook Event Types
- `payment_request` — payment request status changes
- `incoming_transfer` — incoming transfer events
- `refund` — refund events

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

5. **Webhook verification**: Provide a `verifyWebhookSignature()` utility using the `secret` from `POST /account/{accountId}/webhook`.

6. **Payment flows**:
   - `createPaymentRequest`: Takes `unique_asset_id`. Returns NASPIP token.
   - `createPaymentRequestCheckout`: Takes `coin_code` (fiat). Returns checkout URL.
   - `createPaymentIntention`: For `cashier_open` PoS. Payer selects currency later.

7. **Pagination**: `/transactions` and `/pos` use `page` + `page_size`. Response envelope includes `page`, `page_size`, `total`, `total_pages`.

## What NOT to Do (all SDKs)

- Do NOT hardcode API keys or secrets (use `fxs.stg.xxx` in examples)
- Do NOT implement PASETO decoding locally — use `/naspip/read`
- Do NOT poll payment status aggressively — webhooks are primary
- Do NOT expose `api_secret` after initialization
- Do NOT use untyped/dynamic constructs for API responses
