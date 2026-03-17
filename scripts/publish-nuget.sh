#!/usr/bin/env bash
set -euo pipefail

# Publish C# SDK to NuGet
# Usage: ./scripts/publish-nuget.sh [--dry-run]
#
# Requires: NUGET_API_KEY env var

PACKAGE_DIR="packages/sdk-csharp"
DRY_RUN=""

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="true"
  echo "[dry-run] Simulating publish..."
fi

echo "==> Building ${PACKAGE_DIR}..."
dotnet build "${PACKAGE_DIR}" -c Release

echo "==> Running tests..."
dotnet test "${PACKAGE_DIR}/tests" -c Release --no-build

echo "==> Packing..."
dotnet pack "${PACKAGE_DIR}" -c Release --no-build -o "${PACKAGE_DIR}/artifacts"

NUPKG=$(find "${PACKAGE_DIR}/artifacts" -name "*.nupkg" | head -1)

if [[ -z "${NUPKG}" ]]; then
  echo "ERROR: No .nupkg file found in ${PACKAGE_DIR}/artifacts"
  exit 1
fi

echo "==> Package: ${NUPKG}"

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "[dry-run] Would push: ${NUPKG}"
else
  if [[ -z "${NUGET_API_KEY:-}" ]]; then
    echo "ERROR: NUGET_API_KEY env var is required"
    exit 1
  fi
  dotnet nuget push "${NUPKG}" --api-key "${NUGET_API_KEY}" --source "https://api.nuget.org/v3/index.json"
fi

echo "==> Done."
