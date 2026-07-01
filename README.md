# Fluxis SDK

Official SDKs for the [Fluxis](https://fluxis.us) crypto payment processing API. Accept cryptocurrency payments in your application via the NASPIP protocol — a portable payment token that can be rendered as a QR code, transmitted via NFC, or delivered through an API.

## Available SDKs

| Language | Package | Install |
|----------|---------|---------|
| TypeScript / Node.js | [`@fluxisus/sdk`](packages/backend/sdk/README.md) | `npm install @fluxisus/sdk` |
| C# / .NET | [`Fluxis.Sdk`](packages/backend/sdk-csharp/README.md) | `dotnet add package Fluxis.Sdk` |

### Frontend (in development)

Browser/UI packages live under [`packages/frontend/`](packages/frontend/README.md). They will be published under the `@fluxisus/*` scope (e.g. `@fluxisus/react`).

---

## AI-Assisted Integration

Fluxis provides first-class support for AI coding agents. Whether you use Cursor, Claude Code, GitHub Copilot, Windsurf, or any LLM-powered editor, you can pull up-to-date Fluxis documentation directly into your coding session.

### Context7 (recommended for Cursor / AI editors with MCP)

Fluxis is available on [Context7](https://context7.com/fluxisus/fluxis-sdk) — an MCP server that feeds library docs to AI coding assistants.

**Setup in Cursor:**

Add the Context7 MCP server to your project or global config (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

Then ask your AI agent:

> "Use context7 to get the Fluxis SDK docs and create a payment request"

**Setup in Claude Code:**

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

### llms.txt — Direct Documentation for Any LLM

This repo follows the [llms.txt standard](https://llmstxt.org/) — structured documentation optimized for AI consumption.

| File | Contents |
|------|----------|
| [`llms.txt`](llms.txt) | Index of all SDKs + shared concepts (quick overview) |
| [`packages/backend/sdk/llms-full.txt`](packages/backend/sdk/llms-full.txt) | Complete TypeScript SDK guide |
| [`packages/backend/sdk-csharp/llms-full.txt`](packages/backend/sdk-csharp/llms-full.txt) | Complete C# SDK guide |

You can feed these files directly into any LLM (ChatGPT, Claude, etc.):

```bash
# Copy the TypeScript guide to clipboard (macOS)
cat packages/backend/sdk/llms-full.txt | pbcopy

# Or fetch the raw file from GitHub
curl -s https://raw.githubusercontent.com/fluxisus/fluxis-sdk/main/packages/backend/sdk/llms-full.txt
```

### CLAUDE.md — For Cursor & Claude Code

The root [`CLAUDE.md`](CLAUDE.md) file is automatically loaded by Cursor and Claude Code as workspace context. It contains the full API surface, authentication flow, schemas, and cross-SDK implementation notes — everything an AI agent needs to write correct Fluxis integration code without additional prompting.

---

## Quick Start

### TypeScript

```typescript
import { FluxisClient } from '@fluxisus/sdk';

const fluxis = new FluxisClient({
  apiKey: process.env.FLUXIS_API_KEY!,     // fxs.stg.* or fxs.prd.*
  apiSecret: process.env.FLUXIS_API_SECRET!,
});

const payment = await fluxis.pointOfSale.createPaymentRequest(posId, {
  amount: '25.00',
  uniqueAssetId: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
  referenceId: 'order-001',
});

console.log(payment.token);  // NASPIP token — render as QR code
console.log(payment.status); // "created"
```

> **Server-only** — `FluxisClient` holds your API credentials. Never use it in client-side / browser code.

### C# / .NET

```csharp
using Fluxis;
using Fluxis.Models;

using var client = new FluxisClient(new FluxisClientOptions
{
    ApiKey    = Environment.GetEnvironmentVariable("FLUXIS_API_KEY")!,
    ApiSecret = Environment.GetEnvironmentVariable("FLUXIS_API_SECRET")!,
});

var payment = await client.PointOfSale.CreatePaymentRequestAsync(posId,
    new CreatePaymentRequestRequest
    {
        Amount        = "25.00",
        UniqueAssetId = "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        ReferenceId   = "order-001",
    });

Console.WriteLine(payment.Token);  // NASPIP token — render as QR code
Console.WriteLine(payment.Status); // "created"
```

Full documentation, API reference, and examples are in each SDK's README:

- [TypeScript SDK →](packages/backend/sdk/README.md)
- [C# SDK →](packages/backend/sdk-csharp/README.md)
- [Frontend SDKs →](packages/frontend/README.md) *(in development)*

---

## Core Concepts

### Authentication

All SDKs handle auth automatically. You provide `apiKey` + `apiSecret` at initialization; the SDK exchanges them for a PASETO v4 access token on the first request and refreshes it before expiry. You never manage tokens manually.

### Environments

The target API is inferred from the API key prefix — no environment flag needed:

| API Key Prefix | Base URL | Use for |
|----------------|----------|---------|
| `fxs.stg.*` | `https://api.stgfluxis.us/v1` | Development and testing |
| `fxs.prd.*` | `https://api.fluxis.us/v1` | Live payments |

### Two Payment Flows

**Direct payment** — you specify the exact crypto asset. Returns a NASPIP token to render as QR code.

```
createPaymentRequest(posId, { amount, uniqueAssetId, referenceId })
→ { token, status, expiration }
```

**Hosted checkout** — you specify an amount in a reference currency (e.g. USD). Fluxis generates a hosted checkout page where the customer selects the asset.

```
createPaymentRequestCheckout(posId, { amount, coinCode, referenceId })
→ { checkoutUrl, status }
```

### NASPIP Tokens

A NASPIP token is a PASETO v4 token (`v4.local.xxx...`) that encodes the full payment instruction — address, amount, asset, expiration. Render it as a QR code for the customer to scan with their crypto wallet. Do not decode it locally; use the `/naspip/read` API endpoint via the SDK.

### Unique Asset IDs

Crypto assets are identified with the format `n{network}_t{tokenAddress}`:

| Asset | Network | Unique Asset ID |
|-------|---------|----------------|
| USDC | Polygon | `npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| USDT | Polygon | `npolygon_t0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |

### Webhooks

Webhooks are the primary mechanism for receiving payment and transfer events. They are configured per **account** (not per PoS). Event types: `payment_request`, `incoming_transfer`, `refund`. The SDK provides `verifyWebhookSignature` (HMAC-SHA256). The webhook `secret` is returned once when creating a webhook via `POST /account/{accountId}/webhook`.

### Payment Request Statuses

```
pending ──→ created ──→ processing ──→ completed ──→ confirmed
              │              │
              ├──→ overpaid  ├──→ underpaid
              ├──→ expired   └──→ failed
              └──→ failed
```

### Payment Intention (open PoS)

For `cashier_open` PoS types, use `createPaymentIntention` — the merchant sets the amount and the payer selects the payment currency.

### Pagination

`/transactions` and `/pos` use `page` + `page_size`. Responses include `page`, `page_size`, `total`, `total_pages`.

---

## Repository Structure

```
fluxis-sdk/
├── packages/
│   ├── sdk/               # TypeScript SDK (@fluxisus/sdk)
│   └── sdk-csharp/        # C# SDK (Fluxis.Sdk)
├── spec/
│   └── swagger.yaml       # OpenAPI spec — source of truth for all SDKs
├── examples/
│   └── demo-checkout/     # TypeScript example: payment + checkout flows
├── scripts/
│   ├── publish-npm.sh     # Manual npm publish fallback
│   ├── publish-nuget.sh   # Manual NuGet publish fallback
│   └── validate-spec.sh   # Lint the OpenAPI spec
└── .github/workflows/     # CI/CD per language + release-please automation
```

Each SDK is an independent package with its own versioning, changelog, and publish pipeline. They are hand-written for idiomatic ergonomics — not auto-generated from the spec.

---

## Contributing & Releases

This repo uses [release-please](https://github.com/googleapis/release-please) for automated versioning and releases based on [Conventional Commits](https://www.conventionalcommits.org/).

### Release flow

1. Merge changes to `main` using conventional commit messages (`feat:`, `fix:`, `chore:`, etc.).
2. `release-please` opens or updates a release PR for each affected package (`separate-pull-requests: true`).
3. Review and merge release PRs **one at a time** (oldest first if several are open).
4. Merging a release PR creates a GitHub Release + tag; any other open release PRs are auto-closed and recreated on the next **Release Please** run.
5. If a release PR shows a manifest conflict, close it and run **Actions → Release Please → Run workflow** instead of resolving manually.
5. **TypeScript**: [publish-typescript.yml](.github/workflows/publish-typescript.yml) runs on `release: published` and pushes to npm.
6. **C#**: publish runs in the same [release-please.yml](.github/workflows/release-please.yml) workflow after tagging.

| SDK | Tag format | Publishes to |
|-----|-----------|-------------|
| TypeScript | `typescript-sdk-vX.Y.Z` | npm |
| C# | `csharp-sdk-vX.Y.Z` | NuGet |

### Required GitHub secrets

| Secret | Used by |
|--------|---------|
| `NPM_TOKEN` | TypeScript publish — automation token with **write** access to `@fluxisus` scope |
| `NUGET_API_KEY` | C# publish |
| `FLUXIS_API_KEY` | CI integration tests |
| `FLUXIS_API_SECRET` | CI integration tests |

### npm publish troubleshooting

If `npm publish` fails with `E404 Not Found` on `@fluxisus/sdk`, it is almost always an **auth/permissions** issue (npm returns 404 instead of 403). It is **not** a GitHub tag propagation delay.

1. Confirm `NPM_TOKEN` is a valid [npm automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) for a user who is a **maintainer** of `@fluxisus/sdk`.
2. For granular tokens: enable **Read and write** on the `@fluxisus` scope (or this package).
3. Optional: enable [Trusted publishing](https://docs.npmjs.com/trusted-publishers) on npm, linking package `@fluxisus/sdk` to repo `fluxisus/fluxis-sdk` and workflow `publish-typescript.yml`.
4. Retry: Actions → **Publish — TypeScript SDK** → **Run workflow** with tag `typescript-sdk-vX.Y.Z`.

### Manual fallback

If the automated flow is unavailable, `scripts/publish-npm.sh` and `scripts/publish-nuget.sh` can be run manually.

---

## License

MIT
