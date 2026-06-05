#!/usr/bin/env bash
set -euo pipefail

# Run npm scripts across all frontend workspace packages.
# Usage: ./scripts/frontend.sh [build|test|lint]
#
# Skips gracefully when no packages/frontend/*/package.json exist yet.

CMD="${1:-build}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
found=0

for pkg in "${ROOT}"/packages/frontend/*/package.json; do
  [[ -f "${pkg}" ]] || continue
  dir="$(dirname "${pkg}")"
  rel="${dir#"${ROOT}/"}"
  found=1

  if ! node -e "
    const pkg = require('${pkg}');
    process.exit(pkg.scripts?.['${CMD}'] ? 0 : 1);
  " 2>/dev/null; then
    echo "==> Skipping ${rel} (no npm run ${CMD})"
    continue
  fi

  echo "==> npm run ${CMD} — ${rel}"
  npm run "${CMD}" --workspace="${rel}"
done

if [[ "${found}" -eq 0 ]]; then
  echo "No frontend packages found under packages/frontend/ — nothing to ${CMD}."
fi
