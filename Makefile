# Fluxis SDK — Developer Makefile
# Usage: make <command>
# Run `make help` to list all available commands.

.PHONY: help \
        build-csharp test-csharp pack-csharp publish-dry-csharp \
        build-ts test-ts publish-dry-ts \
        build-py test-py publish-dry-py \
        build-go test-go \
        release-status tag

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "Fluxis SDK — available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Variables:"
	@echo "  SDK=<csharp|ts|py|go>   used with: make tag"
	@echo "  VERSION=<x.y.z>         used with: make tag"

# ── C# ────────────────────────────────────────────────────────────────────────

build-csharp: ## Build the C# SDK (Release mode)
	cd packages/sdk-csharp && dotnet build -c Release

test-csharp: ## Run C# tests against staging (requires FLUXIS_API_KEY + FLUXIS_API_SECRET)
	cd packages/sdk-csharp && dotnet test -c Release

pack-csharp: ## Pack C# SDK into packages/sdk-csharp/artifacts/
	cd packages/sdk-csharp && dotnet pack -c Release -o ./artifacts
	@echo ""
	@echo "Package ready:"
	@ls packages/sdk-csharp/artifacts/*.nupkg 2>/dev/null || true

publish-dry-csharp: ## Dry-run NuGet publish — shows what would be pushed without pushing
	./scripts/publish-nuget.sh --dry-run

# ── TypeScript ────────────────────────────────────────────────────────────────

build-ts: ## Build the TypeScript SDK
	cd packages/sdk && npm ci && npm run build

test-ts: ## Run TypeScript tests against staging (requires FLUXIS_API_KEY + FLUXIS_API_SECRET)
	cd packages/sdk && npm ci && npm test

publish-dry-ts: ## Dry-run npm publish — shows what would be pushed without pushing
	cd packages/sdk && npm ci && npm run build && npm publish --dry-run

# ── Python ────────────────────────────────────────────────────────────────────

build-py: ## Build the Python SDK
	cd packages/sdk-python && pip install build -q && python -m build

test-py: ## Run Python tests against staging (requires FLUXIS_API_KEY + FLUXIS_API_SECRET)
	cd packages/sdk-python && pip install -e ".[dev]" -q && pytest

publish-dry-py: ## Dry-run PyPI publish — builds and lists package contents
	cd packages/sdk-python && pip install build -q && python -m build && ls -lh dist/

# ── Go ────────────────────────────────────────────────────────────────────────

build-go: ## Build the Go SDK
	cd packages/sdk-go && go build ./...

test-go: ## Run Go tests against staging (requires FLUXIS_API_KEY + FLUXIS_API_SECRET)
	cd packages/sdk-go && go test ./... -v

# ── Release management ────────────────────────────────────────────────────────

release-status: ## Show open release-please PRs (requires `gh` CLI)
	@echo "Open release PRs:"
	@gh pr list --search "chore: release" \
	  --json title,url,state \
	  --jq '.[] | "  [" + .state + "] " + .title + "\n  " + .url + "\n"' \
	  2>/dev/null || echo "  (none found — gh CLI required)"

tag: ## Push a manual tag bypassing release-please: make tag SDK=csharp VERSION=0.2.0
	@test -n "$(SDK)" || (echo "ERROR: SDK is required. Example: make tag SDK=csharp VERSION=0.2.0" && exit 1)
	@test -n "$(VERSION)" || (echo "ERROR: VERSION is required. Example: make tag SDK=csharp VERSION=0.2.0" && exit 1)
	@TAG="sdk-$(SDK)/v$(VERSION)"; \
	  echo "Creating tag: $$TAG"; \
	  git tag "$$TAG" && git push origin "$$TAG" && \
	  echo "Tag pushed: $$TAG"
