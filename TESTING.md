# Running SDK Tests

This guide explains how to run integration tests locally and how to configure GitHub Actions so CI passes before you push.

All backend SDKs (TypeScript, Go, Python, C#) use the same two environment variables for staging integration tests:

| Variable | Description |
|----------|-------------|
| `FLUXIS_API_KEY` | Staging API key (must start with `fxs.stg.`) |
| `FLUXIS_API_SECRET` | API secret paired with the key |

Never commit real credentials. The repository `.gitignore` ignores `.env` files.

---

## Local setup

### 1. Copy the env template

Each SDK package has its own `.env.example`. Copy it to `.env` and fill in your staging credentials:

```bash
# TypeScript
cp packages/backend/sdk/.env.example packages/backend/sdk/.env

# Go
cp packages/backend/sdk-go/.env.example packages/backend/sdk-go/.env

# Python
cp packages/backend/sdk-python/.env.example packages/backend/sdk-python/.env

# C#
cp packages/backend/sdk-csharp/.env.example packages/backend/sdk-csharp/.env
```

Edit each `.env` file:

```env
FLUXIS_API_KEY=fxs.stg.<your-uuid>
FLUXIS_API_SECRET=<your-api-secret>
```

Obtain staging credentials from your Fluxis organization dashboard.

### 2. How credentials are loaded

| SDK | Loader | Behavior without creds |
|-----|--------|------------------------|
| **Go** | `fluxis/testenv.go` reads `packages/backend/sdk-go/.env` at test startup | Integration tests call `t.Skip` |
| **Python** | `tests/conftest.py` reads `packages/backend/sdk-python/.env` before tests | Integration tests call `pytest.skip` |
| **TypeScript** | `tests/testenv.ts` reads `packages/backend/sdk/.env` before tests | Integration tests use `describe.skip` without creds |
| **C#** | `tests/TestEnvironment.cs` reads `packages/backend/sdk-csharp/.env` before tests | Integration tests use `Skip.IfNot` without creds |

You can also export variables in your shell instead of using `.env`:

```bash
export FLUXIS_API_KEY=fxs.stg.<your-uuid>
export FLUXIS_API_SECRET=<your-api-secret>
```

### 3. Run all backend SDK tests

From the repository root:

```bash
# Run every backend SDK test suite (continues on failure)
make test

# Stop after the first failing suite
make test ARGS=--stop-when-fail

# Or invoke the script directly
./scripts/test-all.sh
./scripts/test-all.sh --stop-when-fail
```

The script runs TypeScript, Go, Python, and C# in order and prints a summary at the end.

### 4. Run tests per SDK

**Go** (`packages/backend/sdk-go`):

```bash
cd packages/backend/sdk-go
go vet ./...
go build ./...
go test ./... -v
```

**Python** (`packages/backend/sdk-python`):

```bash
cd packages/backend/sdk-python
pip install -e ".[dev]"
ruff check .
mypy .
pytest -v
```

**TypeScript** (`packages/backend/sdk`):

```bash
cd packages/backend/sdk
npm install
npm test
```

Unit tests always run. Integration tests in `tests/integration.test.ts` run against staging when valid `fxs.stg.*` credentials are present.

**C#** (`packages/backend/sdk-csharp`):

```bash
cd packages/backend/sdk-csharp
dotnet test
```

Unit tests always run. Integration tests in `tests/IntegrationTests.cs` skip when credentials are missing.

### 4. What runs without credentials

- **Unit tests** (webhook signature, NASPIP format, base URL inference, error types) always run and do not need credentials.
- **Integration tests** (live calls to `https://api.stgfluxis.us/v1`) are skipped when `FLUXIS_API_KEY` or `FLUXIS_API_SECRET` is missing. The test suite should still pass.

With credentials present, integration tests hit the real staging sandbox.

---

## CI setup (GitHub Actions)

Workflows inject credentials from **GitHub repository secrets** — no `.env` file is committed or uploaded.

### One-time configuration

1. Open the repository on GitHub.
2. Go to **Settings → Secrets and variables → Actions**.
3. Add two repository secrets:

| Secret name | Value |
|-------------|-------|
| `FLUXIS_API_KEY` | Your staging API key (`fxs.stg.…`) |
| `FLUXIS_API_SECRET` | Your staging API secret |

These secrets are used by:

- [.github/workflows/sdk-go.yml](.github/workflows/sdk-go.yml) — `go test ./...`
- [.github/workflows/sdk-python.yml](.github/workflows/sdk-python.yml) — `pytest`
- [.github/workflows/sdk-typescript.yml](.github/workflows/sdk-typescript.yml) — `npm test` (unit + staging integration)
- [.github/workflows/sdk-csharp.yml](.github/workflows/sdk-csharp.yml) — `dotnet test` (unit + staging integration)
- [.github/workflows/release-please.yml](.github/workflows/release-please.yml) — full test suite before publish

Ensure repository secrets contain valid staging credentials (`fxs.stg.…`).

### Before pushing

Run all suites locally:

```bash
make test
```

Or run the same commands CI uses per SDK:

```bash
# Go
cd packages/backend/sdk-go && go vet ./... && go build ./... && go test ./...

# Python
cd packages/backend/sdk-python && pip install -e ".[dev]" && ruff check . && mypy . && pytest
```

If local integration tests pass with your `.env` credentials, CI should pass once the GitHub secrets are configured.

### Troubleshooting CI

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Integration tests fail in CI, pass locally | Secrets missing or wrong in GitHub | Re-check secret names and values |
| All integration tests skipped in CI | Secrets not set | Add `FLUXIS_API_KEY` and `FLUXIS_API_SECRET` |
| Auth error `AK0001` | Invalid key/secret or wrong environment | Use staging key (`fxs.stg.`) with matching secret |
| Tests pass locally but fail in CI | Staging key expired or rotated | Update GitHub secrets |

---

## Security checklist

- [ ] `.env` is in `.gitignore` (already configured)
- [ ] Only `.env.example` with placeholder values is committed
- [ ] GitHub secrets use staging credentials, not production
- [ ] API secrets are never logged in test output
