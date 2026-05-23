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
  JOB_PRESET=agent|manual   (default: agent)
EOF
  exit 0
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
DISCOVER_SCOPE="${DISCOVER_SCOPE:-full}"
CONFIG_PATH="${CONFIG_PATH:-${REPO_ROOT}/signaler.config.json}"
OUTPUT_DIR="${OUTPUT_DIR:-${REPO_ROOT}/.signaler}"
JOB_PRESET="${JOB_PRESET:-agent}"

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
echo "JOB_PRESET=${JOB_PRESET}"

if [ "${JOB_PRESET}" = "agent" ]; then
  JOB_ARGS=(job run --preset agent --base-url "${BASE_URL}" --cwd "${REPO_ROOT}" --dir "${OUTPUT_DIR}")
  if [ -f "${CONFIG_PATH}" ]; then
    JOB_ARGS+=(--config "${CONFIG_PATH}")
  fi
  run_signaler "${JOB_ARGS[@]}"
else
  run_signaler discover \
    --scope "${DISCOVER_SCOPE}" \
    --non-interactive \
    --yes \
    --base-url "${BASE_URL}" \
    --config "${CONFIG_PATH}"

  run_signaler run \
    --contract v3 \
    --mode throughput \
    --artifact-profile lean \
    --ci \
    --no-color \
    --yes \
    --config "${CONFIG_PATH}"

  run_signaler analyze \
    --contract v6 \
    --artifact-profile lean \
    --dir "${OUTPUT_DIR}"
fi

echo ""
echo "Bootstrap complete. Prefer projections over raw artifacts:"
echo "  signaler query --view agent --dir ${OUTPUT_DIR}"
echo "  signaler query --view perf --dir ${OUTPUT_DIR}"
echo "  signaler explain --id <issue-id> --dir ${OUTPUT_DIR}"
echo ""
echo "Direct file read order (when needed):"
echo "1. ${OUTPUT_DIR}/analyze.json"
echo "2. ${OUTPUT_DIR}/performance-triage.json"
echo "3. ${OUTPUT_DIR}/agent-index.json"
