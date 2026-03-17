# @fluxisus/sdk

Official TypeScript SDK for the [Fluxis](https://fluxis.us) crypto payment processing API.

## Requirements

- Node.js 18+ (uses native `fetch`, `AbortSignal.timeout()`, `crypto.subtle`)
- Zero runtime dependencies

## Installation

```bash
npm install @fluxisus/sdk
```

## Quick Start

> **Server-only** — `FluxisClient` holds your API credentials. Never use it in client-side / browser code.

```typescript
import { FluxisClient } from '@fluxisus/sdk';

const fluxis = new FluxisClient({
  apiKey: 'fxs.stg.xxx',
  apiSecret: 'your-secret',
});

// Create a payment request (direct crypto)
const payment = await fluxis.pointOfSale.createPaymentRequest(posId, {
  amount: '25.00',
  uniqueAssetId: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
  referenceId: 'order-001',
});

console.log(payment.token);  // NASPIP token — render as QR code
console.log(payment.status); // "created"
```

## Hosted Checkout (fiat reference)

```typescript
const checkout = await fluxis.pointOfSale.createPaymentRequestCheckout(posId, {
  amount: '49.99',
  coinCode: 'USD',
  referenceId: 'order-002',
});

console.log(checkout.checkoutUrl); // redirect customer here
```

## Webhooks

```typescript
import { verifyWebhookSignature } from '@fluxisus/sdk';

// Express
app.post('/webhooks/fluxis', express.raw({ type: 'application/json' }), async (req, res) => {
  const isValid = await verifyWebhookSignature(
    req.body.toString(),
    req.headers['x-fluxis-signature'] as string,
    WEBHOOK_SECRET,
  );
  if (!isValid) return res.status(401).send('Invalid signature');

  const event = JSON.parse(req.body.toString());
  if (event.status === 'completed') {
    // fulfill order
  }
  res.status(200).send('OK');
});
```

## Error Handling

```typescript
import { FluxisError, FluxisAuthError } from '@fluxisus/sdk';

try {
  await fluxis.pointOfSale.createPaymentRequest(posId, request);
} catch (error) {
  if (error instanceof FluxisAuthError) {
    // Invalid credentials or token refresh failed
  } else if (error instanceof FluxisError) {
    // API error: error.code, error.message, error.statusCode
  }
}
```

## Available Resources

| Resource | Methods |
|----------|---------|
| `fluxis.accounts` | `list`, `get`, `create`, `update`, `delete`, `getSettlementAddresses` |
| `fluxis.organization` | `setSettlementAddresses`, `updateSettlementAddresses` |
| `fluxis.pointOfSale` | `list`, `get`, `create`, `update`, `getNotifications`, `createNotifications`, `updateNotifications`, `createPaymentRequest`, `getPaymentRequest`, `createPaymentRequestCheckout` |
| `fluxis.naspip` | `create`, `read`, `isValidTokenFormat` |
| `fluxis.refunds` | `create`, `get` |
| `fluxis.transactions` | `list` |

## Environments

The SDK infers the target API automatically from your API key prefix:

| Key Prefix | Base URL |
|------------|----------|
| `fxs.stg.*` | `https://api.stgfluxis.us/v1` |
| `fxs.prd.*` | `https://api.fluxis.us/v1` |

If the key does not start with `fxs.stg.` or `fxs.prd.`, the client throws during initialization.

## Key Features

- **Auto-auth**: Lazy authentication on first request, automatic token refresh before expiry
- **Concurrent dedup**: Multiple concurrent requests share a single auth call
- **401 retry**: Automatic re-auth and retry on token expiration
- **camelCase ↔ snake_case**: Automatic conversion between TypeScript and API conventions
- **Typed errors**: `FluxisError`, `FluxisAuthError`, `FluxisNetworkError`, `FluxisResponseParseError`

## License

MIT
