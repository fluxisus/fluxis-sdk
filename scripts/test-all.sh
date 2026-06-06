#!/usr/bin/env bash
# Run backend SDK test suites sequentially and print a summary.
#
# Usage:
#   ./scripts/test-all.sh [--stop-when-fail]
#
# By default, failures do not stop later suites. Pass --stop-when-fail to exit
# immediately after the first failing suite.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STOP_ON_FAIL=0

for arg in "$@"; do
  case "${arg}" in
    --stop-when-fail)
      STOP_ON_FAIL=1
      ;;
    -h|--help)
      echo "Usage: $0 [--stop-when-fail]"
      exit 0
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      echo "Usage: $0 [--stop-when-fail]" >&2
      exit 2
      ;;
  esac
done

declare -a SUITE_NAMES=()
declare -a SUITE_STATUS=()

print_header() {
  local title="$1"
  echo ""
  echo "================================================================"
  echo " ${title}"
  echo "================================================================"
}

record_result() {
  local name="$1"
  local status="$2"
  SUITE_NAMES+=("${name}")
  SUITE_STATUS+=("${status}")
}

run_suite() {
  local name="$1"
  shift

  print_header "${name}"
  local start_ts
  start_ts="$(date +%s)"

  if "$@"; then
    local elapsed=$(( $(date +%s) - start_ts ))
    echo ""
    echo "=> ${name}: PASSED (${elapsed}s)"
    record_result "${name}" "PASSED"
    return 0
  fi

  local exit_code=$?
  local elapsed=$(( $(date +%s) - start_ts ))
  echo ""
  echo "=> ${name}: FAILED (${elapsed}s, exit ${exit_code})" >&2
  record_result "${name}" "FAILED"
  return "${exit_code}"
}

run_typescript_tests() {
  local dir="${ROOT}/packages/backend/sdk"
  cd "${dir}"
  npm ci
  npm test
}

run_go_tests() {
  local dir="${ROOT}/packages/backend/sdk-go"
  cd "${dir}"
  go vet ./...
  go build ./...
  go test ./... -count=1
}

run_python_tests() {
  local dir="${ROOT}/packages/backend/sdk-python"
  cd "${dir}"

  if [[ ! -d .venv ]]; then
    echo "Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
  fi

  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -e ".[dev]" -q
  ruff check .
  mypy .
  pytest -v
}

run_csharp_tests() {
  local dir="${ROOT}/packages/backend/sdk-csharp"
  cd "${dir}"
  dotnet test tests/Fluxis.Sdk.Tests.csproj -c Release --verbosity minimal
}

print_summary() {
  local passed=0
  local failed=0
  local total="${#SUITE_NAMES[@]}"

  echo ""
  echo "================================================================"
  echo " TEST SUMMARY"
  echo "================================================================"

  for i in "${!SUITE_NAMES[@]}"; do
    local name="${SUITE_NAMES[$i]}"
    local status="${SUITE_STATUS[$i]}"
    if [[ "${status}" == "PASSED" ]]; then
      printf "  [PASS] %s\n" "${name}"
      passed=$((passed + 1))
    else
      printf "  [FAIL] %s\n" "${name}"
      failed=$((failed + 1))
    fi
  done

  echo "----------------------------------------------------------------"
  echo " Total: ${total}  Passed: ${passed}  Failed: ${failed}"
  echo "================================================================"

  if [[ "${failed}" -gt 0 ]]; then
    return 1
  fi
  return 0
}

main() {
  echo "Fluxis SDK — running all backend test suites"
  echo "Root: ${ROOT}"
  if [[ "${STOP_ON_FAIL}" -eq 1 ]]; then
    echo "Mode: stop on first failure"
  else
    echo "Mode: continue on failure"
  fi

  local suites=(
    "TypeScript SDK|run_typescript_tests"
    "Go SDK|run_go_tests"
    "Python SDK|run_python_tests"
    "C# SDK|run_csharp_tests"
  )

  for entry in "${suites[@]}"; do
    local name="${entry%%|*}"
    local fn="${entry##*|}"

    if ! run_suite "${name}" "${fn}"; then
      if [[ "${STOP_ON_FAIL}" -eq 1 ]]; then
        print_summary
        exit 1
      fi
    fi
  done

  print_summary
}

main "$@"
