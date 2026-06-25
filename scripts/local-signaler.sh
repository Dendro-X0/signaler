#!/usr/bin/env bash
# Source this file to run the local Signaler build from any directory:
#   source "/e/Web Projects/experimental-workspace/apex-auditor-workspace/signaler/scripts/local-signaler.sh"
#
# Requires: pnpm run build already run in the signaler repo.

_SIGNALER_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SIGNALER_BIN="${_SIGNALER_REPO}/dist/bin.js"

if [[ ! -f "${SIGNALER_BIN}" ]]; then
  echo "Local Signaler not built. Run: cd \"${_SIGNALER_REPO}\" && pnpm run build" >&2
  return 1 2>/dev/null || exit 1
fi

signaler() {
  node "${SIGNALER_BIN}" "$@"
}

export -f signaler 2>/dev/null || true

echo "Local Signaler: $(node "${SIGNALER_BIN}" --version 2>/dev/null | head -n 2 | tr '\n' ' ')"
echo "Usage: signaler explore --cwd <app>  |  signaler bootstrap --audit --yes --cwd <app>"
