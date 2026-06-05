# Fluxis Go SDK

Official Go SDK for the [Fluxis](https://fluxis.us) crypto payment processing API.

> **Status**: Scaffold only — implementation pending.

## Installation

```bash
go get github.com/fluxisus/fluxis-sdk/packages/sdk-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "github.com/fluxisus/fluxis-sdk/packages/sdk-go/fluxis"
)

func main() {
    client := fluxis.NewClient(
        fluxis.WithAPIKey("fxs.stg.xxx"),
        fluxis.WithAPISecret("your-api-secret"),
        fluxis.WithEnvironment(fluxis.Staging),
    )

    payment, err := client.PointOfSale.CreatePaymentRequest(context.Background(), "pos-id", &fluxis.CreatePaymentRequest{
        Amount:        "25.00",
        UniqueAssetID: "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        ReferenceID:   "order-001",
    })
    if err != nil {
        panic(err)
    }

    fmt.Println(payment.Token)  // NASPIP token
}
```

## Requirements

- Go 1.22+
- No external dependencies

## License

MIT
