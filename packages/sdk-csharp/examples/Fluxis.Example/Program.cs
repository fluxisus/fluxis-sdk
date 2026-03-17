using Fluxis;
using Fluxis.Errors;
using Fluxis.Models;

// ──────────────────────────────────────────────────────
// Fluxis C# SDK — Full Payment Flow Example
// ──────────────────────────────────────────────────────
// Set these environment variables before running:
//   FLUXIS_API_KEY=fxs.stg.your-key-id
//   FLUXIS_API_SECRET=your-secret
//   FLUXIS_POS_ID=your-pos-id
// ──────────────────────────────────────────────────────

var apiKey = Environment.GetEnvironmentVariable("FLUXIS_API_KEY")
    ?? throw new InvalidOperationException("Set FLUXIS_API_KEY env var");
var apiSecret = Environment.GetEnvironmentVariable("FLUXIS_API_SECRET")
    ?? throw new InvalidOperationException("Set FLUXIS_API_SECRET env var");
var posId = Environment.GetEnvironmentVariable("FLUXIS_POS_ID")
    ?? throw new InvalidOperationException("Set FLUXIS_POS_ID env var");

// 1. Create the client (auto-authenticates on first request)
using var client = new FluxisClient(new FluxisClientOptions
{
    ApiKey = apiKey,
    ApiSecret = apiSecret,
    Environment = FluxisEnvironment.Staging,
});

try
{
    // 2. List existing Points of Sale
    Console.WriteLine("=== Listing Points of Sale ===");
    var posList = await client.PointOfSale.ListAsync();
    foreach (var pos in posList)
    {
        Console.WriteLine($"  PoS: {pos.Name} (ID: {pos.Id})");
    }

    // 3. Create a payment request (crypto flow)
    Console.WriteLine("\n=== Creating Payment Request ===");
    var paymentRequest = await client.PointOfSale.CreatePaymentRequestAsync(posId, new CreatePaymentRequestRequest
    {
        Amount = "25.00",
        UniqueAssetId = "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC on Polygon
        ReferenceId = $"order-{Guid.NewGuid():N}",
        Order = new Order
        {
            Total = "25.00",
            CoinCode = "USD",
            Description = "Flight booking — Buenos Aires to Madrid",
            Merchant = new Merchant
            {
                Name = "Entravel",
                Description = "Crypto-native flight bookings",
            },
            Items = new List<OrderItem>
            {
                new()
                {
                    Description = "Economy seat — EZE → MAD",
                    Quantity = 1,
                    UnitPrice = "25.00",
                    Amount = "25.00",
                    CoinCode = "USD",
                },
            },
        },
    });

    Console.WriteLine($"  Payment Request ID: {paymentRequest.Id}");
    Console.WriteLine($"  Status: {paymentRequest.Status}");
    Console.WriteLine($"  NASPIP Token: {paymentRequest.Token[..40]}...");
    Console.WriteLine($"  Reference ID: {paymentRequest.ReferenceId}");

    // 4. Poll payment status (in production, use webhooks instead)
    Console.WriteLine("\n=== Checking Payment Status ===");
    var status = await client.PointOfSale.GetPaymentRequestAsync(posId, paymentRequest.Id);
    Console.WriteLine($"  Status: {status.Status}");

    // 5. Verify a NASPIP token
    Console.WriteLine("\n=== Verifying NASPIP Token ===");
    var decoded = await client.Naspip.ReadAsync(paymentRequest.Token);
    Console.WriteLine($"  Payment address: {decoded.Payment?.Address}");
    Console.WriteLine($"  Amount: {decoded.Payment?.Amount}");

    // 6. List recent transactions
    Console.WriteLine("\n=== Recent Transactions ===");
    var transactions = await client.Transactions.ListAsync(new ListTransactionsOptions
    {
        Limit = 5,
        Order = "desc",
    });
    Console.WriteLine($"  Total transactions: {transactions.Total}");
    foreach (var tx in transactions.Data)
    {
        Console.WriteLine($"  {tx.Type} | {tx.Status} | {tx.GrossAmount} | {tx.CreatedAt}");
    }

    Console.WriteLine("\nDone!");
}
catch (FluxisAuthException ex)
{
    Console.Error.WriteLine($"Authentication failed: {ex.Message}");
    Console.Error.WriteLine($"  Error code: {ex.ErrorCode}");
}
catch (FluxisException ex)
{
    Console.Error.WriteLine($"API error: {ex.Message}");
    Console.Error.WriteLine($"  Error code: {ex.ErrorCode}");
    Console.Error.WriteLine($"  HTTP status: {ex.StatusCode}");
    Console.Error.WriteLine($"  Details: {ex.Details}");
}
