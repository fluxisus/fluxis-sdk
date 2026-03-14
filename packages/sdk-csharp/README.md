# Fluxis C# SDK

Official C# SDK for the [Fluxis](https://fluxis.us) crypto payment processing API.

> **Status**: Scaffold only — implementation pending.

## Installation

```bash
dotnet add package Fluxis.Sdk
```

## Quick Start

```csharp
using Fluxis;

var client = new FluxisClient(new FluxisClientOptions
{
    ApiKey = "fxs.stg.xxx",
    ApiSecret = "your-api-secret",
    Environment = FluxisEnvironment.Staging,
});

// Create a payment request
var payment = await client.PointOfSale.CreatePaymentRequestAsync("pos-id", new CreatePaymentRequest
{
    Amount = "25.00",
    UniqueAssetId = "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    ReferenceId = "order-001",
});

Console.WriteLine(payment.Token);  // NASPIP token
```

## Requirements

- .NET 8.0+ or .NET Standard 2.1+
- No external dependencies beyond `System.Text.Json`

## License

MIT
