#!/usr/bin/env bash
# Setup script to create a bash wrapper for Signaler CLI.
# Works with JSR installs by proxying to: npx jsr run @signaler/cli

set -euo pipefail

echo "Setting up Signaler CLI shim for Git Bash..."

if command -v cygpath >/dev/null 2>&1 && [ -n "${APPDATA:-}" ]; then
  BIN_DIR="$(cygpath -u "$APPDATA")/npm"
else
  BIN_DIR="$HOME/AppData/Roaming/npm"
fi

mkdir -p "$BIN_DIR"
WRAPPER_PATH="$BIN_DIR/signaler"
ALIAS_PATH="$BIN_DIR/signalar"

cat > "$WRAPPER_PATH" <<'WRAPPER_EOF'
#!/usr/bin/env bash
# Signaler CLI shim for Git Bash/Unix
exec npx jsr run @signaler/cli "$@"
WRAPPER_EOF

chmod +x "$WRAPPER_PATH"
cp "$WRAPPER_PATH" "$ALIAS_PATH"
chmod +x "$ALIAS_PATH"

echo ""
echo "Created shim: $WRAPPER_PATH"
echo "Created shim: $ALIAS_PATH"
echo "Try: signaler --version (or: signalar --version)"
echo ""
echo "If command is still not found, ensure this path is in PATH:"
echo "  $BIN_DIR"
