# CLAUDE.md — Fluxis TypeScript SDK

> This file provides context for AI coding agents (Claude Code, Cursor, Copilot, etc.)
> working on the Fluxis TypeScript SDK. Read this FIRST before writing any code.

## What is Fluxis?

Fluxis is a crypto payment processing infrastructure. It standardizes payment instructions
via the **NASPIP protocol** — a portable token that encodes payment data and can be
transmitted via QR, NFC, or API. Merchants integrate Fluxis to accept crypto payments.

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

**The SDK must handle token refresh automatically** — check `expired_at` before each request
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
  "amount": "1234.99",          // string, required
  "unique_asset_id": "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // string, required
  "reference_id": "order-12345", // string, optional (your external order ID)
  "order": {                     // optional order metadata
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
  "status": "created",           // created | processing | expired | completed | overpaid | underpaid | failed
  "token": "v4.local.xxx...",    // NASPIP token — THIS IS THE KEY OUTPUT
  "reference_id": "order-12345",
  "expiration": 1717833600       // unix timestamp
}
```

### PaymentRequestCheckoutRequest (creates checkout URL)
```json
{
  "amount": "1234.99",          // string, required
  "coin_code": "USD",           // string, required (FIAT code, NOT crypto asset)
  "reference_id": "order-12345", // optional
  "order": { ... }              // same order structure as above
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
  "refund_to_address": "0x1234...",  // required — blockchain address
  "amount": "100.50",                // optional — defaults to full amount
  "reason": "Customer requested"     // optional
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
- `completed` — fully paid ✓
- `overpaid` — received more than requested
- `underpaid` — received less than requested
- `expired` — NASPIP token expired, no payment received
- `failed` — payment processing failed

### Transaction Types
`deposit`, `withdraw`, `refund`, `adjustment`, `swap`, `payment_in`, `payment_out`, `dry_run`

### Transaction Statuses
`preview`, `pending`, `created`, `processing`, `error`, `expired`, `failed`, `completed`

## SDK Design Guidelines

### Project Structure
```
@fluxis/sdk/
├── src/
│   ├── client.ts              # FluxisClient class — auth, config, HTTP, token refresh
│   ├── resources/
│   │   ├── auth.ts            # POST /auth/token
│   │   ├── accounts.ts        # /account CRUD + settlement addresses
│   │   ├── organization.ts    # /organization/settlement-addresses
│   │   ├── pointOfSale.ts     # /pos CRUD + notifications + payment requests
│   │   ├── naspip.ts          # /naspip/create and /naspip/read
│   │   ├── refunds.ts         # /refunds/*
│   │   └── transactions.ts    # /transactions (list with pagination)
│   ├── types/
│   │   ├── common.ts          # APIResponse, APIError, enums
│   │   ├── auth.ts            # Auth request/response types
│   │   ├── accounts.ts        # Account types
│   │   ├── pointOfSale.ts     # PoS, PaymentRequest, Notification types
│   │   ├── naspip.ts          # NASPIP create/read types
│   │   ├── refunds.ts         # Refund types
│   │   └── transactions.ts    # Transaction types
│   ├── errors.ts              # FluxisError, FluxisAuthError, etc.
│   └── index.ts               # Main export
├── examples/
│   ├── create-payment.ts      # Minimal: auth → create PoS → create payment request
│   ├── checkout-flow.ts       # Full checkout with webhook handling
│   └── read-naspip-token.ts   # Decode a NASPIP token
├── tests/
├── package.json
├── tsconfig.json
├── README.md
└── CLAUDE.md                  # This file
```

### Naming Conventions
- Use **camelCase** for all SDK method names and properties (even though the API uses snake_case)
- The SDK should automatically convert between camelCase (SDK) ↔ snake_case (API)
- Class name: `FluxisClient`
- Package name: `@fluxis/sdk`

### Usage Pattern (what the developer experience should look like)

```typescript
import { FluxisClient } from '@fluxis/sdk';

// Initialize — auth happens automatically on first request
const fluxis = new FluxisClient({
  apiKey: 'fxs.stg.08ecd032-73ed-4a5a-9ccf-500eb1f9a56f',
  apiSecret: 'tQd^RW213A3q2ojzvJn',
  environment: 'staging', // or 'production'
});

// Create a Point of Sale
const pos = await fluxis.pointOfSale.create({
  name: 'Online Store',
  merchant: { name: 'My Shop', description: 'E-commerce store' },
  paymentOptions: ['npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'],
});

// Set up webhook for this PoS
const webhook = await fluxis.pointOfSale.createNotifications(pos.id, {
  url: 'https://myshop.com/webhooks/fluxis',
});
// Save webhook.secret for signature verification!

// Create a payment request → returns NASPIP token
const payment = await fluxis.pointOfSale.createPaymentRequest(pos.id, {
  amount: '25.00',
  uniqueAssetId: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  referenceId: 'order-001',
});

console.log(payment.token);      // NASPIP token → render as QR
console.log(payment.status);     // "created"
console.log(payment.expiration); // unix timestamp

// Check payment status (for reconciliation)
const status = await fluxis.pointOfSale.getPaymentRequest(pos.id, payment.id);
console.log(status.status); // "created" | "processing" | "completed" | ...

// Create a checkout URL (alternative flow for ecommerce)
const checkout = await fluxis.pointOfSale.createPaymentRequestCheckout(pos.id, {
  amount: '25.00',
  coinCode: 'USD',
  referenceId: 'order-002',
});

// Issue a refund
const refund = await fluxis.refunds.create(payment.id, {
  refundToAddress: '0x1234567890abcdef1234567890abcdef12345678',
  reason: 'Customer requested',
});

// List transactions
const txs = await fluxis.transactions.list({
  limit: 50,
  offset: 0,
  status: 'completed',
  sort: 'created_at',
  order: 'desc',
});
```

### Error Handling
```typescript
import { FluxisError, FluxisAuthError } from '@fluxis/sdk';

try {
  const payment = await fluxis.pointOfSale.createPaymentRequest(posId, { ... });
} catch (error) {
  if (error instanceof FluxisAuthError) {
    // API key invalid or token expired and refresh failed
    console.error('Auth failed:', error.message);
  } else if (error instanceof FluxisError) {
    console.error(`API error [${error.code}]: ${error.message}`);
    console.error('Details:', error.details);
  }
}
```

### Important Implementation Notes

1. **Auto-auth**: The client should lazily authenticate on first request and cache the token. Before each request, check if `expired_at` is approaching and re-auth if needed.

2. **snake_case ↔ camelCase**: The API uses snake_case everywhere. The SDK must expose camelCase to TypeScript developers but convert automatically when sending/receiving.

3. **Path params inconsistency**: The swagger uses `:posID` syntax in some paths (Express-style) and `{param}` in others. The actual API uses the standard `/pos/{posId}/...` pattern. Normalize all paths.

4. **Unique Asset IDs**: These are Fluxis-specific identifiers for crypto assets on specific networks. Format: `n{network}_t{tokenAddress}`. Example: `npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` = USDC on Polygon.

5. **NASPIP tokens**: Are PASETO v4 tokens. The SDK does NOT need to decode them locally — use the `/naspip/read` endpoint. The SDK should provide a helper to check if a token looks valid (starts with `v4.local.`) and a convenience method to read it via the API.

6. **Webhook secret**: When creating notification settings (`POST /pos/{posId}/notifications`), the response includes a `secret`. This is used to verify webhook signatures. The SDK should provide a `verifyWebhookSignature()` utility.

7. **Pagination**: The `/transactions` endpoint supports `limit`, `offset`, `sort`, `order`, and `status` filters. The SDK should expose these as a typed options object.

8. **Two payment creation flows**:
   - `createPaymentRequest`: Takes `unique_asset_id` (specific crypto asset). Returns NASPIP token.
   - `createPaymentRequestCheckout`: Takes `coin_code` (fiat code like "USD"). Returns checkout URL. Used for ecommerce where the user picks their crypto on a hosted page.

## Tech Stack for the SDK

- **TypeScript** (strict mode)
- **axios** or **fetch** for HTTP (prefer native fetch for zero dependencies, with axios as fallback)
- **tsup** or **unbuild** for bundling (ESM + CJS dual output)
- **vitest** for testing
- Export types alongside runtime code
- Target: Node.js 18+ and modern browsers

## What NOT to Do

- Do NOT hardcode any API keys or secrets in examples (use placeholder format `fxs.stg.xxx`)
- Do NOT implement PASETO token decoding locally — always use `/naspip/read`
- Do NOT poll payment status aggressively — the primary mechanism is webhooks
- Do NOT expose the `api_secret` after initialization — store it only for re-auth
- Do NOT use `any` types — everything must be strictly typed
