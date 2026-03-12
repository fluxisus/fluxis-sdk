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
  environment: 'staging',
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

| Environment | Base URL | API Key Prefix | Use for |
|-------------|----------|----------------|---------|
| `staging` | `https://api.stgfluxis.us/v1` | `fxs.stg.*` | Development and testing |
| `production` | `https://api.fluxis.us/v1` | `fxs.prd.*` | Live payments |

```typescript
// Staging (default)
const fluxis = new FluxisClient({
  apiKey: 'fxs.stg.xxx',
  apiSecret: 'your-staging-secret',
  environment: 'staging',
});

// Production
const fluxis = new FluxisClient({
  apiKey: 'fxs.prd.xxx',
  apiSecret: 'your-production-secret',
  environment: 'production',
});
```

You can also override the base URL directly:

```typescript
const fluxis = new FluxisClient({
  apiKey: 'fxs.stg.xxx',
  apiSecret: 'secret',
  baseUrl: 'https://custom-api.example.com/v1',
});
```

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
  url: 'https://newserver.com/webhooks/fluxis',
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

// Create checkout (reference currency amount, paid in crypto)
const checkout = await fluxis.pointOfSale.createPaymentRequestCheckout('pos-id', {
  amount: '49.99',                             // required
  coinCode: 'USD',                             // required (reference currency for display)
  referenceId: 'order-002',                    // optional
  order: { /* ... */ },                        // optional
});

// Notifications (webhooks)
const webhook = await fluxis.pointOfSale.createNotifications('pos-id', {
  webhookUrl: 'https://...',
});
const settings = await fluxis.pointOfSale.getNotifications('pos-id');
await fluxis.pointOfSale.updateNotifications('pos-id', { url: 'https://...' });
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
import { FluxisError, FluxisAuthError, FluxisNetworkError } from '@fluxisus/sdk';

try {
  const payment = await fluxis.pointOfSale.createPaymentRequest(posId, {
    amount: '25.00',
    uniqueAssetId: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  });
} catch (error) {
  if (error instanceof FluxisAuthError) {
    // Invalid API key/secret, or token refresh failed
    console.error('Auth failed:', error.message);
    console.error('Code:', error.code); // e.g. "AUTH_ERROR"
  } else if (error instanceof FluxisNetworkError) {
    // Could not connect (DNS failure, timeout, network down)
    console.error('Network error:', error.message);
    console.error('Cause:', error.cause);
  } else if (error instanceof FluxisError) {
    // API returned an error response
    console.error('API error:', error.message);
    console.error('Code:', error.code);       // e.g. "AK0001"
    console.error('Details:', error.details);  // Additional context
    console.error('Status:', error.statusCode); // HTTP status code
  }
}
```

### Error hierarchy

| Class | Extends | When |
|-------|---------|------|
| `FluxisError` | `Error` | Any API error response |
| `FluxisAuthError` | `FluxisError` | Authentication failures (401) |
| `FluxisNetworkError` | `FluxisError` | Connection/timeout issues |

---

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | Fluxis API key (`fxs.stg.*` or `fxs.prd.*`) |
| `apiSecret` | `string` | *required* | Fluxis API secret |
| `environment` | `'staging' \| 'production'` | `'staging'` | API environment |
| `baseUrl` | `string` | — | Custom base URL (overrides environment) |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |

---

## Going to Production

Checklist for moving from staging to production:

- [ ] Obtain production API keys from the Fluxis dashboard (prefix: `fxs.prd.*`)
- [ ] Change `environment` to `'production'` in your client configuration
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
  environment: 'production',
});
```

---

## Unique Asset IDs

Fluxis identifies crypto assets using a unique format: `n{network}_t{tokenAddress}`

Common assets:
| Asset | Network | Unique Asset ID |
|-------|---------|----------------|
| USDC | Polygon | `npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| USDT | Polygon | `npolygon_t0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |

---

## Requirements

- **Node.js 18+** — uses native `fetch` (no external HTTP dependencies)
- **TypeScript 5.0+** — for type definitions (optional, works with JavaScript too)

## License

MIT
