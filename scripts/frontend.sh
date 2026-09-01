#!/usr/bin/env bash
set -euo pipefail

# Run npm scripts across all frontend workspace packages.
# Usage: ./scripts/frontend.sh [build|test|lint]
#
# Skips gracefully when no packages/frontend/*/package.json exist yet.

CMD="${1:-build}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
found=0
declare -A seen=()

# npm workspaces resolve a sibling package's types to its *built* dist/index.d.ts, not its
# source — so a package that imports from another one needs that other package built/linted
# first. On a fresh checkout there's no dist/ yet, so plain alphabetical glob order isn't safe
# (e.g. react-wallet imports from wallet-core, but "react-wallet" < "wallet-core" alphabetically).
# List known dependencies before their dependents here; anything not listed runs afterwards in
# glob order. Update this when a package starts depending on another workspace package.
ORDERED_PACKAGES=(react wallet-core react-wallet)

run_package() {
  local dir="$1"
  local pkg="${dir}/package.json"
  local rel="${dir#"${ROOT}/"}"

  if ! node -e "
    const pkg = require('${pkg}');
    process.exit(pkg.scripts?.['${CMD}'] ? 0 : 1);
  " 2>/dev/null; then
    echo "==> Skipping ${rel} (no npm run ${CMD})"
    return
  fi

  echo "==> npm run ${CMD} — ${rel}"
  if [[ "${CMD}" == "test" ]]; then
    # A package with no test files yet (e.g. a fresh workspace) shouldn't fail the whole run —
    # only an actual failing test should. This doesn't mask real failures: --passWithNoTests only
    # changes vitest's exit code when it finds zero test files.
    npm run "${CMD}" --workspace="${rel}" -- --passWithNoTests
  else
    npm run "${CMD}" --workspace="${rel}"
  fi
}

for name in "${ORDERED_PACKAGES[@]}"; do
  dir="${ROOT}/packages/frontend/${name}"
  [[ -f "${dir}/package.json" ]] || continue
  seen["${dir}"]=1
  found=1
  run_package "${dir}"
done

for pkg in "${ROOT}"/packages/frontend/*/package.json; do
  [[ -f "${pkg}" ]] || continue
  dir="$(dirname "${pkg}")"
  [[ -n "${seen[${dir}]:-}" ]] && continue
  found=1
  run_package "${dir}"
done

if [[ "${found}" -eq 0 ]]; then
  echo "No frontend packages found under packages/frontend/ — nothing to ${CMD}."
fi
