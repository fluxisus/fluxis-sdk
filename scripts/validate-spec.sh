#!/usr/bin/env bash
set -euo pipefail

# Validate the OpenAPI spec in spec/swagger.yaml
# Usage: ./scripts/validate-spec.sh
#
# Requires: npx (comes with npm)

SPEC_FILE="spec/swagger.yaml"

if [[ ! -f "${SPEC_FILE}" ]]; then
  echo "ERROR: ${SPEC_FILE} not found"
  exit 1
fi

echo "==> Validating ${SPEC_FILE}..."
npx --yes @redocly/cli lint "${SPEC_FILE}" --skip-rule no-unused-components

echo "==> Spec is valid."
