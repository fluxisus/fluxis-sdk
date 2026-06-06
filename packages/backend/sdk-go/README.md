# Fluxis Go SDK

Official Go SDK for the [Fluxis](https://fluxis.us) crypto payment processing API.

## Installation

```bash
go get github.com/fluxisus/fluxis-go-sdk
```

## Quick Start

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/fluxisus/fluxis-go-sdk/fluxis"
)

func main() {
	client, err := fluxis.NewClient(
		fluxis.WithAPIKey("fxs.stg.xxx"),
		fluxis.WithAPISecret("your-api-secret"),
	)
	if err != nil {
		log.Fatal(err)
	}

	payment, err := client.PointOfSale.CreatePaymentRequest(
		context.Background(),
		"pos-id",
		&fluxis.CreatePaymentRequestRequest{
			Amount:        "25.00",
			UniqueAssetID: "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
			ReferenceID:   "order-001",
		},
	)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(payment.Token) // NASPIP token
}
```

## Configuration

The client uses functional options:

```go
client, err := fluxis.NewClient(
	fluxis.WithAPIKey("fxs.stg.xxx"),
	fluxis.WithAPISecret("your-api-secret"),
	fluxis.WithTimeout(30 * time.Second),
	fluxis.WithBaseURL("https://api.stgfluxis.us/v1"), // optional override
)
```

The base URL is inferred from the API key prefix when not overridden:

- `fxs.stg.*` → `https://api.stgfluxis.us/v1`
- `fxs.prd.*` → `https://api.fluxis.us/v1`

## Resources

All methods take `context.Context` as the first argument.

| Service | Methods |
|---------|---------|
| `Accounts` | `List`, `Get`, `Create`, `Update`, `Delete`, `GetSettlementAddresses`, `SetSettlementAddress`, `UpdateSettlementAddress`, `DeleteSettlementAddress` |
| `Organization` | `Get`, `GetSettlementAddresses`, `SetSettlementAddress`, `UpdateSettlementAddress`, `DeleteSettlementAddress` |
| `PointOfSale` | `List`, `Get`, `Create`, `Update`, `Delete`, `GetPaymentIntention`, `CreatePaymentIntention`, `ClosePaymentIntention`, `GetQR`, `CreatePaymentRequest`, `GetPaymentRequest`, `CreatePaymentRequestCheckout` |
| `Naspip` | `Create`, `Read` + `fluxis.IsValidTokenFormat()` |
| `Transactions` | `List` |
| `Webhooks` | `Create`, `List`, `Logs`, `Activate`, `Deactivate`, `Delete`, `Test`, `UpdateURL` |

## Webhook Verification

```go
valid := fluxis.VerifyWebhookSignature(
	payload,                        // parsed JSON body (map[string]any)
	signature,                      // x-fluxis-signature header
	timestamp,                      // x-fluxis-timestamp header
	webhookSecret,                  // secret from Create response
)
```

## Error Handling

```go
payment, err := client.PointOfSale.CreatePaymentRequest(ctx, posID, req)
if err != nil {
	var apiErr *fluxis.FluxisError
	if errors.As(err, &apiErr) {
		fmt.Println(apiErr.Code, apiErr.Details)
	}
	return err
}
```

## Testing

Copy `.env.example` to `.env` and set your staging credentials:

```bash
cp .env.example .env
go test ./...
```

Integration tests run against the staging API when `FLUXIS_API_KEY` and `FLUXIS_API_SECRET` are set; otherwise they are skipped.

## Requirements

- Go 1.22+
- Zero runtime dependencies (stdlib only)

## License

MIT
