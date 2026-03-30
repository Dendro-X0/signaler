#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat << 'EOF'
Usage:
  bash scripts/agent-bootstrap.sh

Optional environment overrides:
  BASE_URL=http://127.0.0.1:3000
  DISCOVER_SCOPE=full
  CONFIG_PATH=/abs/path/to/signaler.config.json
  OUTPUT_DIR=/abs/path/to/.signaler
EOF
  exit 0
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
DISCOVER_SCOPE="${DISCOVER_SCOPE:-full}"
CONFIG_PATH="${CONFIG_PATH:-${REPO_ROOT}/signaler.config.json}"
OUTPUT_DIR="${OUTPUT_DIR:-${REPO_ROOT}/.signaler}"

run_signaler() {
  if command -v signaler >/dev/null 2>&1; then
    signaler "$@"
    return
  fi

  if [ -f "${REPO_ROOT}/dist/bin.js" ]; then
    node "${REPO_ROOT}/dist/bin.js" "$@"
    return
  fi

  echo "Error: could not find 'signaler' in PATH or '${REPO_ROOT}/dist/bin.js'." >&2
  echo "Build the local CLI first with: corepack pnpm run build" >&2
  exit 1
}

echo "Running Signaler bootstrap..."
echo "BASE_URL=${BASE_URL}"
echo "DISCOVER_SCOPE=${DISCOVER_SCOPE}"
echo "CONFIG_PATH=${CONFIG_PATH}"

run_signaler discover \
  --scope "${DISCOVER_SCOPE}" \
  --non-interactive \
  --yes \
  --base-url "${BASE_URL}" \
  --config "${CONFIG_PATH}"

run_signaler run \
  --contract v3 \
  --mode throughput \
  --ci \
  --no-color \
  --yes \
  --config "${CONFIG_PATH}"

run_signaler report --dir "${OUTPUT_DIR}"

echo ""
echo "Bootstrap complete. Agent read order:"
echo "1. ${OUTPUT_DIR}/agent-index.json"
echo "2. ${OUTPUT_DIR}/suggestions.json"
echo "3. ${OUTPUT_DIR}/issues.json"
echo "4. ${OUTPUT_DIR}/results.json"
echo "5. ${OUTPUT_DIR}/run.json"
