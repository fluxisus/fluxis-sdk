# Fluxis Python SDK

Official Python SDK for the [Fluxis](https://fluxis.us) crypto payment processing API.

## Installation

```bash
pip install fluxis
```

For development:

```bash
pip install -e ".[dev]"
```

## Quick Start

### Synchronous client

```python
from fluxis import FluxisClient
from fluxis.models.point_of_sale import CreatePaymentRequestRequest

with FluxisClient(
    api_key="fxs.stg.xxx",
    api_secret="your-api-secret",
) as client:
    payment = client.point_of_sale.create_payment_request(
        pos_id="pos-id",
        data=CreatePaymentRequestRequest(
            amount="25.00",
            unique_asset_id="npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            reference_id="order-001",
        ),
    )

    print(payment.token)   # NASPIP token
    print(payment.status)  # "created"
```

### Async client

```python
import asyncio

from fluxis import AsyncFluxisClient
from fluxis.models.point_of_sale import CreatePaymentRequestRequest


async def main() -> None:
    async with AsyncFluxisClient(
        api_key="fxs.stg.xxx",
        api_secret="your-api-secret",
    ) as client:
        payment = await client.point_of_sale.create_payment_request(
            pos_id="pos-id",
            data=CreatePaymentRequestRequest(
                amount="25.00",
                unique_asset_id="npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
                reference_id="order-001",
            ),
        )
        print(payment.token)


asyncio.run(main())
```

## Configuration

Credentials can be passed to the client constructor or set via environment variables:

```bash
export FLUXIS_API_KEY=fxs.stg.xxx
export FLUXIS_API_SECRET=your-api-secret
```

Copy `.env.example` to `.env` for local integration tests.

The API base URL is inferred from the key prefix:

- `fxs.stg.*` → `https://api.stgfluxis.us/v1`
- `fxs.prd.*` → `https://api.fluxis.us/v1`

## Webhook Verification

```python
from fluxis import verify_webhook_signature

is_valid = verify_webhook_signature(
    payload=request_json,
    signature=request.headers["x-fluxis-signature"],
    timestamp=request.headers["x-fluxis-timestamp"],
    secret=webhook_secret,
)
```

## Development

```bash
pip install -e ".[dev]"
ruff check .
mypy .
pytest
```

Integration tests run against staging when `FLUXIS_API_KEY` and `FLUXIS_API_SECRET` are set; unit tests always run.

## Requirements

- Python 3.10+
- `httpx` (only runtime dependency)

## License

MIT
