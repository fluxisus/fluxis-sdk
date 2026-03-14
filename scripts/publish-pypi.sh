#!/usr/bin/env bash
set -euo pipefail

# Publish Python SDK to PyPI
# Usage: ./scripts/publish-pypi.sh [--dry-run]
#
# Requires: TWINE_USERNAME + TWINE_PASSWORD env vars (or __token__ + API token)

PACKAGE_DIR="packages/sdk-python"
DRY_RUN=""
REPOSITORY="pypi"

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="true"
  REPOSITORY="testpypi"
  echo "[dry-run] Will publish to TestPyPI..."
fi

echo "==> Installing build tools..."
pip install --quiet build twine

echo "==> Running tests..."
cd "${PACKAGE_DIR}"
pip install --quiet -e ".[dev]"
pytest
ruff check .
mypy .
cd -

echo "==> Building ${PACKAGE_DIR}..."
python -m build "${PACKAGE_DIR}"

echo "==> Checking package..."
twine check "${PACKAGE_DIR}/dist/"*

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "[dry-run] Would upload to ${REPOSITORY}:"
  ls -la "${PACKAGE_DIR}/dist/"
else
  twine upload "${PACKAGE_DIR}/dist/"*
fi

echo "==> Done."
