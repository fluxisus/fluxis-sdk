# CLAUDE.md — Fluxis Python SDK

> Language-specific conventions for the Python SDK.
> For API details, authentication flow, schemas, and endpoints see the root `CLAUDE.md`.

## Project Layout

```
packages/sdk-python/
├── pyproject.toml             # Build config (hatchling), deps, tool config
├── src/fluxis/
│   ├── __init__.py            # Re-exports: FluxisClient, errors, version
│   ├── client.py              # FluxisClient — auth, HTTP, token refresh
│   ├── resources/
│   │   ├── __init__.py
│   │   ├── accounts.py
│   │   ├── organization.py
│   │   ├── point_of_sale.py
│   │   ├── naspip.py
│   │   ├── refunds.py
│   │   └── transactions.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── account.py
│   │   ├── point_of_sale.py
│   │   ├── naspip.py
│   │   ├── refund.py
│   │   ├── transaction.py
│   │   └── common.py          # ApiResponse, enums, base model
│   ├── errors.py              # FluxisError, FluxisAuthError
│   ├── webhooks.py            # verify_webhook_signature()
│   └── py.typed               # PEP 561 marker
├── tests/
│   └── ...
├── CLAUDE.md                  # This file
└── README.md
```

## Naming Conventions

- **Package name**: `fluxis` (import as `from fluxis import FluxisClient`)
- **Modules/files**: snake_case (`point_of_sale.py`, `payment_request.py`)
- **Classes**: PascalCase (`FluxisClient`, `PointOfSaleResource`, `CreatePaymentRequest`)
- **Methods/functions**: snake_case (`create_payment_request`, `verify_webhook_signature`)
- **Model fields**: snake_case matching the API directly (`unique_asset_id`, `reference_id`)
  - No camelCase↔snake_case conversion needed — Python and the API both use snake_case

## Design Rules

1. **Async-first with sync wrapper**: Primary API is async (`async def`). Provide a thin
   sync `FluxisClient` that wraps async calls with `asyncio.run()` for simple scripts.

2. **HTTP client**: Use `httpx` (async). Do NOT use `requests` or `aiohttp`.

3. **Models**: Use `dataclasses` or `pydantic` (prefer dataclasses to avoid the dep).
   All models must have type annotations. Use `TypedDict` for request kwargs if preferred.

4. **Auth flow**: Same as TS SDK — lazy auth on first request, auto-refresh before expiry.
   Use `asyncio.Lock` for thread/task safety.

5. **snake_case ↔ snake_case**: The API uses snake_case natively, so no conversion needed.
   Just map JSON keys directly to Python attributes.

6. **API response envelope**: Parse `{"status": "success", "data": ...}` and return only `data`.
   Raise `FluxisError` on `status: "error"`.

7. **Type stubs**: Include `py.typed` marker for PEP 561. All public functions fully typed.

## Testing

- Use **pytest** + **pytest-asyncio**
- Tests run against the Fluxis staging sandbox (not mocks)
- Linting: `ruff check .` and `mypy .`

## Build & Publish

```bash
pip install -e ".[dev]"
pytest
ruff check .
mypy .
# publish: see scripts/publish-pypi.sh
```

## What NOT to Do

- Do NOT use `requests` — use `httpx`
- Do NOT use `Any` types — everything must be strictly typed
- Do NOT use `print()` for logging — use `logging` module
- Do NOT hardcode API keys in tests — use environment variables
- Do NOT use `*args, **kwargs` to pass through API params — explicit typed params only
