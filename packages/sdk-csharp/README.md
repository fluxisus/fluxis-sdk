# Fluxis.Sdk — C# SDK for Crypto Payments

Official C# SDK for the [Fluxis](https://fluxis.us) crypto payment processing API.
Accept crypto payments in your .NET application with strongly-typed models, automatic authentication, and webhook verification.

## Requirements

- .NET 6.0 or .NET 8.0
- No external dependencies beyond `System.Text.Json`

## Installation

```bash
dotnet add package Fluxis.Sdk
```

## Quick Start

```csharp
using Fluxis;
using Fluxis.Models;

// 1. Create the client — authentication is handled automatically
using var client = new FluxisClient(new FluxisClientOptions
{
    ApiKey = "fxs.stg.your-key-id",    // from your Fluxis dashboard
    ApiSecret = "your-api-secret",
});

// 2. Create a payment request
var payment = await client.PointOfSale.CreatePaymentRequestAsync("your-pos-id",
    new CreatePaymentRequestRequest
    {
        Amount = "150.00",
        UniqueAssetId = "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC on Polygon
        ReferenceId = "booking-12345",
        Order = new Order
        {
            Total = "150.00",
            CoinCode = "USD",
            Description = "Flight EZE → MAD",
            Merchant = new Merchant { Name = "Entravel" },
            Items = new List<OrderItem>
            {
                new() { Description = "Economy seat", Quantity = 1, UnitPrice = "150.00", Amount = "150.00", CoinCode = "USD" },
            },
        },
    });

// 3. Use the NASPIP token — render as QR code or send via API
Console.WriteLine($"Token: {payment.Token}");
Console.WriteLine($"Status: {payment.Status}");
```

## Key Concepts

| Concept | What it is |
|---|---|
| **Organization** | Your business entity in Fluxis. Has API keys. |
| **Account** | Sub-entity (e.g. a branch or sub-merchant). |
| **Point of Sale (PoS)** | A payment endpoint with its own config and webhooks. |
| **Payment Request** | A request for payment, returns a NASPIP token. |
| **NASPIP Token** | A PASETO v4 token encoding payment instructions. Render as QR or transmit via NFC. |

## Two Payment Flows

### Crypto flow (you choose the asset)

```csharp
var payment = await client.PointOfSale.CreatePaymentRequestAsync(posId,
    new CreatePaymentRequestRequest
    {
        Amount = "50.00",
        UniqueAssetId = "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        ReferenceId = "order-001",
    });
// payment.Token → NASPIP token for QR code
```

### Checkout flow (fiat amount, Fluxis handles asset selection)

```csharp
var checkout = await client.PointOfSale.CreatePaymentRequestCheckoutAsync(posId,
    new CreatePaymentRequestCheckoutRequest
    {
        Amount = "50.00",
        CoinCode = "USD",
        ReferenceId = "order-001",
    });
// checkout.CheckoutUrl → redirect the user here
```

## Webhook Handling in ASP.NET Core

### 1. Set up webhook notifications

```csharp
var notifications = await client.PointOfSale.CreateNotificationsAsync(posId,
    new CreateNotificationSettingsRequest
    {
        WebhookUrl = "https://yourapp.com/api/webhooks/fluxis",
    });

// IMPORTANT: Store this secret securely (e.g. in Azure Key Vault)
var webhookSecret = notifications.Secret;
```

### 2. Create a webhook controller

```csharp
using Fluxis.Models;
using Fluxis.Utilities;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/webhooks")]
public class FluxisWebhookController : ControllerBase
{
    private readonly string _webhookSecret;

    public FluxisWebhookController(IConfiguration config)
    {
        _webhookSecret = config["Fluxis:WebhookSecret"]!;
    }

    [HttpPost("fluxis")]
    public async Task<IActionResult> HandleWebhook()
    {
        // 1. Read the raw body
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();

        // 2. Verify the signature
        var signature = Request.Headers["x-fluxis-signature"].ToString();
        if (!WebhookVerifier.VerifySignature(payload, signature, _webhookSecret))
            return Unauthorized();

        // 3. Deserialize and handle the event
        var paymentEvent = System.Text.Json.JsonSerializer.Deserialize<PaymentRequestResponse>(payload);

        switch (paymentEvent?.Status)
        {
            case PaymentRequestStatus.Completed:
                // Payment confirmed — fulfill the order
                await FulfillOrder(paymentEvent.ReferenceId!);
                break;

            case PaymentRequestStatus.Overpaid:
                // Customer paid too much — consider a refund
                break;

            case PaymentRequestStatus.Expired:
                // Token expired without payment — cancel the order
                break;
        }

        return Ok();
    }

    private Task FulfillOrder(string referenceId)
    {
        // Your order fulfillment logic here
        return Task.CompletedTask;
    }
}
```

## Polling Payment Status

Webhooks are the recommended approach, but you can also poll:

```csharp
var status = await client.PointOfSale.GetPaymentRequestAsync(posId, paymentRequestId);
Console.WriteLine($"Current status: {status.Status}");
```

Payment statuses: `created` → `processing` → `completed` | `overpaid` | `underpaid` | `expired` | `failed`

## Other API Operations

### Accounts

```csharp
var accounts = await client.Accounts.ListAsync();
var account = await client.Accounts.CreateAsync(new CreateAccountRequest { Name = "Buenos Aires Branch" });
var updated = await client.Accounts.UpdateAsync(account.Id, new UpdateAccountRequest { Name = "BA Branch" });
await client.Accounts.DeleteAsync(account.Id);
```

### Transactions

```csharp
var transactions = await client.Transactions.ListAsync(new ListTransactionsOptions
{
    Limit = 20,
    Status = TransactionStatuses.Completed,
    Order = "desc",
});
```

### Refunds

```csharp
var refund = await client.Refunds.CreateAsync(paymentRequestId, new CreateRefundRequest
{
    RefundToAddress = "0x1234...",
    Amount = "50.00",
    Reason = "Customer requested",
});

var refundDetail = await client.Refunds.GetAsync(refund.Id);
```

### NASPIP Token Verification

```csharp
// Quick format check (no API call)
bool looksValid = NaspipResource.IsValidTokenFormat(token);

// Full verification via API
var decoded = await client.Naspip.ReadAsync(token);
Console.WriteLine($"Address: {decoded.Payment?.Address}");
Console.WriteLine($"Amount: {decoded.Payment?.Amount}");
```

## Dependency Injection

For ASP.NET Core apps using `IHttpClientFactory`:

```csharp
// In Program.cs or Startup.cs
builder.Services.AddHttpClient("Fluxis");
builder.Services.AddSingleton(sp =>
{
    var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient("Fluxis");
    return new FluxisClient(new FluxisClientOptions
    {
        ApiKey = builder.Configuration["Fluxis:ApiKey"]!,
        ApiSecret = builder.Configuration["Fluxis:ApiSecret"]!,
    }, httpClient);
});
```

Then inject `FluxisClient` wherever you need it:

```csharp
public class PaymentService
{
    private readonly FluxisClient _fluxis;

    public PaymentService(FluxisClient fluxis) => _fluxis = fluxis;

    public async Task<string> CreatePaymentAsync(decimal amount, string referenceId)
    {
        var payment = await _fluxis.PointOfSale.CreatePaymentRequestAsync("pos-id",
            new CreatePaymentRequestRequest
            {
                Amount = amount.ToString("F2"),
                UniqueAssetId = "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
                ReferenceId = referenceId,
            });
        return payment.Token;
    }
}
```

## Error Handling

All API errors throw `FluxisException` (or `FluxisAuthException` for auth failures):

```csharp
try
{
    var payment = await client.PointOfSale.CreatePaymentRequestAsync(posId, request);
}
catch (FluxisAuthException ex)
{
    // Invalid API key or secret
    Console.WriteLine($"Auth error: {ex.Message} (code: {ex.ErrorCode})");
}
catch (FluxisException ex)
{
    // API error (validation, not found, etc.)
    Console.WriteLine($"API error: {ex.Message}");
    Console.WriteLine($"  Code: {ex.ErrorCode}");
    Console.WriteLine($"  HTTP Status: {ex.StatusCode}");
    Console.WriteLine($"  Details: {ex.Details}");
}
```

## Authentication

You don't need to manage tokens. The SDK:

1. Authenticates lazily on the first API call
2. Caches the PASETO v4 access token
3. Automatically refreshes before expiry (60s buffer)
4. Is thread-safe (uses `SemaphoreSlim` internally)
5. Retries once on 401 (token may have been revoked server-side)

## Configuration

```csharp
var options = new FluxisClientOptions
{
    ApiKey = "fxs.stg.your-key",       // Required: fxs.stg.* or fxs.prd.*
    ApiSecret = "your-secret",         // Required
    Timeout = TimeSpan.FromSeconds(30) // Default: 30s
};
```

The client infers the target API from the `ApiKey` prefix:

- `fxs.stg.*` -> `https://api.stgfluxis.us/v1`
- `fxs.prd.*` -> `https://api.fluxis.us/v1`

If the key does not start with one of those prefixes, the constructor throws an `ArgumentException`.

## Build & Test

```bash
cd packages/sdk-csharp
dotnet build
dotnet test
dotnet pack -c Release
```

## License

MIT
