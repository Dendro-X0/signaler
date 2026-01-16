#!/bin/bash
# Simple wrapper to run signaler directly with Node.js
# This bypasses all installation issues

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/dist/bin.js" "$@"
