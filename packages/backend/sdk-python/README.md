# Fluxis Python SDK

Official Python SDK for the [Fluxis](https://fluxis.us) crypto payment processing API.

> **Status**: Scaffold only — implementation pending.

## Installation

```bash
pip install fluxis
```

## Quick Start

```python
from fluxis import FluxisClient

client = FluxisClient(
    api_key="fxs.stg.xxx",
    api_secret="your-api-secret",
    environment="staging",
)

# Create a payment request
payment = await client.point_of_sale.create_payment_request(
    pos_id="pos-id",
    amount="25.00",
    unique_asset_id="npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    reference_id="order-001",
)

print(payment.token)   # NASPIP token
print(payment.status)  # "created"
```

## Requirements

- Python 3.10+
- `httpx` for HTTP (async-first)

## License

MIT
