# CLAUDE.md — Fluxis C# SDK

> Language-specific conventions for the C# SDK.
> For API details, authentication flow, schemas, and endpoints see the root `CLAUDE.md`.

## Project Layout

```
packages/sdk-csharp/
├── Fluxis.Sdk.csproj        # Project file (multi-target: net8.0 + netstandard2.1)
├── src/Fluxis/
│   ├── FluxisClient.cs       # Main client — auth, HTTP, token refresh
│   ├── FluxisClientOptions.cs
│   ├── Resources/
│   │   ├── AccountsResource.cs
│   │   ├── OrganizationResource.cs
│   │   ├── PointOfSaleResource.cs
│   │   ├── NaspipResource.cs
│   │   ├── RefundsResource.cs
│   │   └── TransactionsResource.cs
│   ├── Models/               # Request/response DTOs
│   │   ├── Auth.cs
│   │   ├── Account.cs
│   │   ├── PointOfSale.cs
│   │   ├── PaymentRequest.cs
│   │   ├── Naspip.cs
│   │   ├── Refund.cs
│   │   ├── Transaction.cs
│   │   └── Common.cs         # ApiResponse<T>, enums
│   ├── Errors/
│   │   ├── FluxisException.cs
│   │   └── FluxisAuthException.cs
│   └── Utilities/
│       └── WebhookVerifier.cs
├── tests/
│   └── ...
├── CLAUDE.md                 # This file
└── README.md
```

## Naming Conventions

- **Namespace**: `Fluxis` (top-level), `Fluxis.Models`, `Fluxis.Resources`, `Fluxis.Errors`
- **Class names**: PascalCase (`FluxisClient`, `PointOfSaleResource`, `CreatePaymentRequest`)
- **Properties**: PascalCase in C# models (`UniqueAssetId`, `ReferenceId`)
- **JSON serialization**: Use `System.Text.Json` with `JsonPropertyName("snake_case")` on all DTOs
  - Do NOT rely on a global naming policy — be explicit per property
- **Async methods**: All HTTP methods must be async and suffixed with `Async` (`CreatePaymentRequestAsync`)
- **CancellationToken**: Every async public method must accept an optional `CancellationToken`

## Design Rules

1. **Zero external dependencies** beyond `System.Text.Json` (ships with .NET).
   Use `HttpClient` directly — do NOT add Newtonsoft.Json, RestSharp, or Refit.

2. **HttpClient lifetime**: Accept `HttpClient` via constructor injection (for DI scenarios)
   but also provide a parameterless constructor that creates its own `HttpClient`.

3. **Auth flow**: Same as TS SDK — lazy auth on first request, auto-refresh before expiry.
   Store token + `expired_at` in the client instance. Thread-safe with `SemaphoreSlim`.

4. **snake_case ↔ PascalCase**: Handled via `[JsonPropertyName]` attributes on each model property.
   Responses are deserialized with `PropertyNameCaseInsensitive = true`.

5. **API response envelope**: Deserialize into `ApiResponse<T>` where `T` is the `data` payload.
   Throw `FluxisException` on `status: "error"` responses.

6. **Nullable reference types**: Enabled — all optional fields should be `string?`, etc.

7. **Target**: `net8.0` + `netstandard2.1` for broad compatibility.

## Testing

- Use **xUnit** + **FluentAssertions**
- Tests run against the Fluxis staging sandbox (not mocks)
- Test project: `tests/Fluxis.Sdk.Tests.csproj`

## Build & Publish

```bash
dotnet build
dotnet test
dotnet pack -c Release
# publish: see scripts/publish-nuget.sh
```

## What NOT to Do

- Do NOT use `dynamic` or `object` for API responses — strictly typed models only
- Do NOT use `Newtonsoft.Json` — use `System.Text.Json`
- Do NOT block on async code (`Task.Result`, `.Wait()`) — async all the way
- Do NOT hardcode API keys in tests — use environment variables
