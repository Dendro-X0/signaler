#!/usr/bin/env bash
# Complete clean installation script for Signaler CLI
# This removes old versions and reinstalls using the portable release installer.

set -euo pipefail

echo "=== Signaler CLI - Clean Installation ==="
echo ""

echo "Step 1: Removing old installations..."

if command -v npm >/dev/null 2>&1; then
  echo "  - Uninstalling legacy npm globals if present..."
  npm uninstall -g @signaler/cli 2>/dev/null || true
  npm uninstall -g apex-auditor 2>/dev/null || true
fi

rm -rf "$HOME/AppData/Local/signaler" 2>/dev/null || true
rm -rf "/c/Users/$USER/AppData/Local/signaler" 2>/dev/null || true
rm -rf "C:/Users/$USER/AppData/Local/signaler" 2>/dev/null || true
rm -rf "$HOME/AppData/Local/Programs/signaler" 2>/dev/null || true

echo "  - Old installations removed"
echo ""

echo "Step 2: Installing latest portable release..."
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
echo ""

if [ -d "$HOME/AppData/Local/signaler/bin" ]; then
  BIN_DIR="$HOME/AppData/Local/signaler/bin"
elif [ -d "/c/Users/$USER/AppData/Local/signaler/bin" ]; then
  BIN_DIR="/c/Users/$USER/AppData/Local/signaler/bin"
elif [ -d "C:/Users/$USER/AppData/Local/signaler/bin" ]; then
  BIN_DIR="C:/Users/$USER/AppData/Local/signaler/bin"
else
  echo "Error: Could not find Signaler launcher directory." >&2
  exit 1
fi

WRAPPER_PATH="$BIN_DIR/signaler"
if [ ! -f "$WRAPPER_PATH" ]; then
  echo "Error: Expected launcher not found at $WRAPPER_PATH" >&2
  exit 1
fi

chmod +x "$WRAPPER_PATH"

echo "Step 3: Verifying installation..."
if command -v signaler >/dev/null 2>&1; then
  echo "  - Command 'signaler' is available"
else
  echo "  - Warning: 'signaler' command not found in PATH"
  echo "    You may need to restart your terminal."
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "  1. Restart your terminal if it was already open."
echo "  2. Test with: signaler --version (or: signalar --version)"
echo "  3. Update later with: signaler upgrade"
echo "  4. Remove later with: signaler uninstall --global"
