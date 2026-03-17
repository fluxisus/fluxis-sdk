# @fluxisus/sdk

Official TypeScript SDK for the [Fluxis](https://fluxis.us) crypto payment processing API.

Accept cryptocurrency payments in your application with a few lines of code. The SDK handles authentication, token refresh, and type conversion automatically.

## Installation

```bash
npm install @fluxisus/sdk
```

```bash
yarn add @fluxisus/sdk
```

```bash
pnpm add @fluxisus/sdk
```

## Getting Started

### 1. Get your API credentials

Sign up at [Fluxis](https://fluxis.us) and get your API key and secret from the dashboard. You'll receive staging credentials to start (prefix `fxs.stg.*`).

### 2. Initialize the client

```typescript
import { FluxisClient } from '@fluxisus/sdk';

const fluxis = new FluxisClient({
  apiKey: 'fxs.stg.your-api-key',
  apiSecret: 'your-api-secret',
});
```

The SDK authenticates automatically on the first request and refreshes the token before it expires. You don't need to manage tokens manually.

### 3. Create a Point of Sale

A Point of Sale (PoS) is a payment endpoint. You typically create one per store, branch, or checkout context.

```typescript
const pos = await fluxis.pointOfSale.create({
  name: 'Online Store',
  merchant: { name: 'My Shop', description: 'E-commerce store' },
  paymentOptions: ['npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'], // USDC on Polygon
});
```

### 4. Create a payment request

```typescript
const payment = await fluxis.pointOfSale.createPaymentRequest(pos.id, {
  amount: '25.00',
  uniqueAssetId: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  referenceId: 'order-001',
});

console.log(payment.token);      // NASPIP token — render as QR code
console.log(payment.status);     // "created"
console.log(payment.expiration); // Unix timestamp
```

The `token` is a NASPIP token (PASETO v4 format) that encodes the payment instructions. Render it as a QR code for the customer to scan with their crypto wallet.

---

## Environments

The SDK infers the target API automatically from your API key prefix:

| API Key Prefix | Base URL | Use for |
|----------------|----------|---------|
| `fxs.stg.*` | `https://api.stgfluxis.us/v1` | Development and testing |
| `fxs.prd.*` | `https://api.fluxis.us/v1` | Live payments |

```typescript
// Staging
const fluxis = new FluxisClient({
  apiKey: 'fxs.stg.xxx',
  apiSecret: 'your-staging-secret',
});

// Production
const fluxis = new FluxisClient({
  apiKey: 'fxs.prd.xxx',
  apiSecret: 'your-production-secret',
});
```

If the key does not start with `fxs.stg.` or `fxs.prd.`, the client throws during initialization.

---

## Two Payment Flows

Fluxis supports two ways to create payments:

### Direct Payment (crypto-specific)

You specify the exact crypto asset. Returns a NASPIP token for QR rendering.

```typescript
const payment = await fluxis.pointOfSale.createPaymentRequest(posId, {
  amount: '25.00',
  uniqueAssetId: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  referenceId: 'order-001',
});
// payment.token → render as QR
```

### Hosted Checkout (reference currency)

You specify an amount in a reference currency (e.g., USD). The customer sees "pay 49.99 USD" but the actual payment is processed in crypto based on the PoS `paymentOptions`. Fluxis does not process fiat — `coinCode` is only for display.

```typescript
const checkout = await fluxis.pointOfSale.createPaymentRequestCheckout(posId, {
  amount: '49.99',
  coinCode: 'USD',
  referenceId: 'order-002',
  order: {
    total: '49.99',
    coinCode: 'USD',
    description: 'Premium subscription',
    items: [
      {
        description: 'Premium Plan - Monthly',
        quantity: 1,
        unitPrice: '49.99',
        amount: '49.99',
        coinCode: 'USD',
      },
    ],
  },
});
```

---

## Webhooks

Webhooks are the primary mechanism for receiving payment status updates. Do not poll — use webhooks.

### Set up notifications

```typescript
const webhook = await fluxis.pointOfSale.createNotifications(pos.id, {
  webhookUrl: 'https://yourserver.com/webhooks/fluxis',
});

// IMPORTANT: Save webhook.secret securely — it's only returned once
```

### Verify and handle webhooks

```typescript
import express from 'express';
import { verifyWebhookSignature } from '@fluxisus/sdk';

const app = express();
const WEBHOOK_SECRET = process.env.FLUXIS_WEBHOOK_SECRET!;

app.post('/webhooks/fluxis', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-fluxis-signature'] as string;
  const rawBody = req.body.toString();

  // Verify the webhook signature
  const isValid = await verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(rawBody);

  switch (event.status) {
    case 'completed':
      // Payment received in full — fulfill the order
      break;
    case 'overpaid':
      // Customer sent more than requested — fulfill + consider refund
      break;
    case 'underpaid':
      // Customer sent less than requested
      break;
    case 'expired':
      // Payment window expired
      break;
    case 'failed':
      // Payment processing failed
      break;
  }

  res.status(200).send('OK');
});
```

### Update webhook URL

```typescript
await fluxis.pointOfSale.updateNotifications(pos.id, {
  webhookUrl: 'https://newserver.com/webhooks/fluxis',
});
```

---

## Payment Request Statuses

```
created ──→ processing ──→ completed ✓
   │              │
   │              ├──→ overpaid  (received more than requested)
   │              └──→ underpaid (received less than requested)
   │
   ├──→ expired (token expired, no payment)
   └──→ failed  (processing error)
```

| Status | Description |
|--------|-------------|
| `created` | Payment request created, awaiting customer payment |
| `processing` | Deposit detected on-chain, waiting for confirmations |
| `completed` | Payment fully received |
| `overpaid` | Received more than the requested amount |
| `underpaid` | Received less than the requested amount |
| `expired` | NASPIP token expired with no payment received |
| `failed` | Payment processing failed |

---

## API Reference

### Accounts

```typescript
// List all accounts
const accounts = await fluxis.accounts.list();

// Get account by ID
const account = await fluxis.accounts.get('account-id');

// Create account
const account = await fluxis.accounts.create({
  name: 'Branch A',
  externalId: 'branch-001', // optional: your internal ID
});

// Update account
const updated = await fluxis.accounts.update('account-id', { name: 'Branch B' });

// Delete account
await fluxis.accounts.delete('account-id');

// Get settlement addresses
const addresses = await fluxis.accounts.getSettlementAddresses('account-id');
```

### Organization

```typescript
// Set settlement addresses
await fluxis.organization.setSettlementAddresses([
  { address: '0x...', network: 'polygon' },
]);

// Update settlement addresses
await fluxis.organization.updateSettlementAddresses([
  { address: '0x...', network: 'polygon', addressTag: 'memo-tag' },
]);
```

### Point of Sale

```typescript
// List all PoS
const allPos = await fluxis.pointOfSale.list();

// Get PoS by ID
const pos = await fluxis.pointOfSale.get('pos-id');

// Create PoS
const pos = await fluxis.pointOfSale.create({
  name: 'Online Store',
  accountId: 'account-id',                    // optional
  merchant: { name: 'My Shop' },              // optional
  paymentOptions: ['npolygon_t0x...'],         // optional: accepted crypto assets
});

// Update PoS
await fluxis.pointOfSale.update('pos-id', {
  name: 'Updated Store',
  paymentOptions: ['npolygon_t0x...', 'npolygon_t0y...'],
});

// Create payment request → returns PaymentRequestResponse
const payment = await fluxis.pointOfSale.createPaymentRequest('pos-id', {
  amount: '25.00',                             // required
  uniqueAssetId: 'npolygon_t0x...',            // required
  referenceId: 'order-001',                    // optional
  order: { /* ... */ },                        // optional
});

// Get payment request status
const status = await fluxis.pointOfSale.getPaymentRequest('pos-id', 'payment-id');

// Create checkout (reference currency amount, paid in crypto) → PaymentRequestCheckoutResponse
const checkout = await fluxis.pointOfSale.createPaymentRequestCheckout('pos-id', {
  amount: '49.99',                             // required
  coinCode: 'USD',                             // required (reference currency for display)
  referenceId: 'order-002',                    // optional
  order: { /* ... */ },                        // optional
});
// checkout.checkoutUrl — hosted checkout page URL

// Notifications (webhooks)
const webhook = await fluxis.pointOfSale.createNotifications('pos-id', {
  webhookUrl: 'https://...',
});
const settings = await fluxis.pointOfSale.getNotifications('pos-id');
await fluxis.pointOfSale.updateNotifications('pos-id', { webhookUrl: 'https://...' });
```

### NASPIP Tokens

```typescript
// Decode a NASPIP token via the API
const data = await fluxis.naspip.read('v4.local.xxx...');
// data.payment — { id, address, amount, uniqueAssetId, expiresAt, isOpen }
// data.order — { total, coinCode, description, merchant, items }
// data.paymentOptions — string[]

// Check if a string looks like a valid NASPIP token
fluxis.naspip.isValidTokenFormat('v4.local.xxx...'); // true

// Create a NASPIP token from raw payment data
const token = await fluxis.naspip.create({
  payment: {
    address: '0x...',
    amount: 25.00,
    uniqueAssetId: 'npolygon_t0x...',
  },
});
```

### Refunds

```typescript
// Create a full refund
const refund = await fluxis.refunds.create('payment-request-id', {
  refundToAddress: '0x...',     // required: blockchain address
  reason: 'Customer requested', // optional
});

// Create a partial refund
const refund = await fluxis.refunds.create('payment-request-id', {
  refundToAddress: '0x...',
  amount: '10.00',              // optional: defaults to full amount
  reason: 'Partial refund',
});

// Get refund details
const detail = await fluxis.refunds.get('refund-id');
// detail.status — "processing" | "completed" | "failed"
// detail.network, detail.uniqueAssetId, detail.refundTransactionHash, etc.
```

### Transactions

```typescript
const txs = await fluxis.transactions.list({
  limit: 50,              // max results per page
  offset: 0,              // skip N results
  status: 'completed',    // filter by status
  sort: 'created_at',     // sort field
  order: 'desc',          // 'asc' or 'desc'
  accountId: 'acc-id',    // filter by account
});

// txs.data — Transaction[]
// txs.total — total matching count
// txs.limit, txs.offset — pagination info
```

**Transaction types:** `deposit`, `withdraw`, `refund`, `adjustment`, `swap`, `payment_in`, `payment_out`, `dry_run`

**Transaction statuses:** `preview`, `pending`, `created`, `processing`, `error`, `expired`, `failed`, `completed`

---

## Error Handling

The SDK throws typed errors that you can catch and handle:

```typescript
import {
  FluxisError,
  FluxisAuthError,
  FluxisNetworkError,
  FluxisResponseParseError,
} from '@fluxisus/sdk';

try {
  const payment = await fluxis.pointOfSale.createPaymentRequest(posId, {
    amount: '25.00',
    uniqueAssetId: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  });
} catch (error) {
  if (error instanceof FluxisAuthError) {
    // Invalid API key/secret, or token refresh failed
    console.error('Auth failed:', error.message);
  } else if (error instanceof FluxisNetworkError) {
    // Could not connect (DNS failure, timeout, network down)
    console.error('Network error:', error.message);
  } else if (error instanceof FluxisResponseParseError) {
    // API returned a non-JSON response (e.g., HTML error page from a proxy)
    console.error('Unexpected response:', error.rawBody);
  } else if (error instanceof FluxisError) {
    // API returned a structured error response
    console.error('API error:', error.message);   // Includes method + path prefix
    console.error('Code:', error.code);            // e.g. "AK0001"
    console.error('Details:', error.details);      // Additional context
    console.error('Status:', error.statusCode);    // HTTP status code
  }
}
```

Error messages include request context automatically (e.g. `"POST /pos/xxx/payment-request: Invalid amount"`), which makes debugging easier.

### Error hierarchy

| Class | Extends | When |
|-------|---------|------|
| `FluxisError` | `Error` | Any API error response |
| `FluxisAuthError` | `FluxisError` | Authentication failures (401) |
| `FluxisNetworkError` | `FluxisError` | Connection/timeout issues |
| `FluxisResponseParseError` | `FluxisError` | Non-JSON responses (proxy errors, HTML pages) |

---

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | Fluxis API key (`fxs.stg.*` or `fxs.prd.*`) |
| `apiSecret` | `string` | *required* | Fluxis API secret |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |

---

## Going to Production

Checklist for moving from staging to production:

- [ ] Obtain production API keys from the Fluxis dashboard (prefix: `fxs.prd.*`)
- [ ] Update your deployed configuration to use your production `fxs.prd.*` key
- [ ] Create new PoS on production (staging PoS don't carry over)
- [ ] Set up webhook notifications on your production PoS
- [ ] Store the new webhook secret securely
- [ ] Update your webhook handler URL to your production server
- [ ] Test a real payment end-to-end before going live
- [ ] Store API secrets in environment variables, never in code

```typescript
// Production config
const fluxis = new FluxisClient({
  apiKey: process.env.FLUXIS_API_KEY!,      // fxs.prd.*
  apiSecret: process.env.FLUXIS_API_SECRET!,
});
```

---

## Releasing SDKs

This repo uses `release-please` as the primary release flow for both the TypeScript SDK (`@fluxisus/sdk`) and the C# SDK (`Fluxis.Sdk`).

### Required GitHub secrets

- `NPM_TOKEN` for npm publishing
- `NUGET_API_KEY` for NuGet publishing
- `FLUXIS_API_KEY` and `FLUXIS_API_SECRET` for CI test runs

### Release flow

1. Merge your SDK changes to `main`.
2. Wait for the `Release Please` workflow to open or update the release PR for the package you changed.
3. Review that release PR and verify the version bump and release notes.
4. Merge the release PR.
5. `release-please` creates the release tag automatically:
   - TypeScript: `sdk/vX.Y.Z`
   - C#: `sdk-csharp/vX.Y.Z`
6. The tag triggers the publish workflow:
   - `sdk-typescript.yml` publishes `@fluxisus/sdk` to npm
   - `sdk-csharp.yml` publishes `Fluxis.Sdk` to NuGet and creates a GitHub Release

### How to validate a release

1. In GitHub Actions, confirm the `Release Please` run succeeded and that the publish workflow for the generated tag also succeeded.
2. Check the registry version:
   - npm: `npm view @fluxisus/sdk version`
   - NuGet: verify the new `Fluxis.Sdk` version appears on nuget.org
3. Validate installation in a clean sample:
   - npm: `npm install @fluxisus/sdk@X.Y.Z`
   - NuGet: `dotnet add package Fluxis.Sdk --version X.Y.Z`
4. For C#, also verify the GitHub Release exists and includes the `.nupkg` artifact.

### Manual fallback

If the automated release flow is unavailable, the repo also includes:

- `scripts/publish-npm.sh`
- `scripts/publish-nuget.sh`

These scripts are intended for manual/fallback publishing, not the default release path.

---

## Unique Asset IDs

Fluxis identifies crypto assets using a unique format: `n{network}_t{tokenAddress}`

Common assets:
| Asset | Network | Unique Asset ID |
|-------|---------|----------------|
| USDC | Polygon | `npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| USDT | Polygon | `npolygon_t0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |

---

## Architecture Notes

### Authentication and token refresh

The SDK lazily authenticates on the first API call by exchanging your `apiKey` + `apiSecret` for a PASETO v4 access token via `POST /auth/token`. The token is cached and reused for subsequent requests. One minute before the token expires, the SDK automatically re-authenticates. If multiple requests are made concurrently while the token is being refreshed, only one auth call is made (deduplication).

If a request receives a 401 response (e.g. the token was revoked server-side), the SDK invalidates the cached token, re-authenticates, and retries the request once.

### camelCase ↔ snake_case conversion

The Fluxis API uses `snake_case` for all JSON keys. The SDK automatically converts between camelCase (TypeScript) and snake_case (API) in both directions, so you always work with idiomatic TypeScript property names.

---

## Webhook Verification: Raw Body Handling

Webhook signature verification requires the **raw request body** as a string. If your framework parses JSON automatically, you need to preserve the raw body.

### Next.js App Router

```typescript
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-fluxis-signature') || '';

  const isValid = await verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
  if (!isValid) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(rawBody);
  // Handle event...
}
```

### Express

Use `express.raw()` instead of `express.json()` on the webhook route:

```typescript
app.post('/webhooks/fluxis', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = req.body.toString();
  const signature = req.headers['x-fluxis-signature'] as string;

  const isValid = await verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
  // ...
});
```

---

## Troubleshooting

### `FluxisAuthError: Authentication failed`

- Verify your `apiKey` and `apiSecret` are correct and not swapped.
- Staging keys start with `fxs.stg.*`, production with `fxs.prd.*`. The SDK selects the target API from that prefix automatically.
- Secrets may contain special characters — ensure they're not being truncated by your shell or `.env` parser.

### `FluxisNetworkError: Failed to connect`

- Check that your network allows outbound HTTPS to `api.stgfluxis.us` (staging) or `api.fluxis.us` (production).
- If behind a corporate proxy, you may need to configure `fetch` accordingly.
- The default timeout is 30 seconds. Increase it with the `timeout` option if your network is slow.

### Webhook signature verification fails

- The signature is computed over the **raw request body**. If your framework parses or re-serializes the body, the signature will not match.
- Ensure you're using the `secret` returned by `createNotifications()`, not the API secret.
- Secrets are only returned once when creating webhook settings. If lost, delete and recreate the webhook.

### `FluxisResponseParseError: Response is not valid JSON`

- This typically means a proxy, CDN, or load balancer returned an HTML error page (e.g. 502 Bad Gateway).
- Check the `rawBody` property on the error for the actual response content.
- This is usually a transient infrastructure issue — retry after a delay.

### Environment mismatch

- Staging and production are completely separate. PoS IDs, webhook secrets, and payment requests do not carry over between environments.
- If you're getting 404s, check that the resource ID matches the environment you're using.

---

## Requirements

- **Node.js 18+** — uses native `fetch` and `AbortSignal.timeout()` (no external HTTP dependencies)
- **TypeScript 5.0+** — for type definitions (optional, works with JavaScript too)
- **`crypto.subtle`** — used for webhook signature verification (available in Node.js 18+ and all modern browsers)

## License

MIT
