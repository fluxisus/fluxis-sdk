#!/usr/bin/env bash
set -euo pipefail

# Publish TypeScript SDK to npm manually
# Usage: ./scripts/publish-npm.sh [--dry-run]
#
# Primary release path: release-please + .github/workflows/sdk-typescript.yml
# Use this script only for manual/fallback publishes.
# Requires: NPM_TOKEN env var (or npm login)

PACKAGE_DIR="packages/sdk"
DRY_RUN=""

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "[dry-run] Simulating publish..."
fi

echo "==> Building ${PACKAGE_DIR}..."
npm run build --workspace="${PACKAGE_DIR}"

echo "==> Running tests..."
npm run test --workspace="${PACKAGE_DIR}"

echo "==> Running lint..."
npm run lint --workspace="${PACKAGE_DIR}"

echo "==> Publishing ${PACKAGE_DIR}..."
npm publish --workspace="${PACKAGE_DIR}" --access public ${DRY_RUN}

echo "==> Done."
