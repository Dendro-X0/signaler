#!/usr/bin/env bash
# Install Signaler CLI globally

echo "=== Installing Signaler CLI Globally ==="
echo ""

# Method 1: Try npm global install with full package spec
echo "Attempting global installation..."
npm install -g @jsr/signaler__cli@1.0.12

if [ $? -eq 0 ]; then
    echo "✓ Installed successfully"
else
    echo "✗ npm global install failed"
    echo ""
    echo "Alternative: Use npx to run without global install"
    echo "  npx @jsr/signaler__cli wizard"
    echo ""
    echo "Or add to your PATH:"
    echo "  export PATH=\"\$PATH:$(pwd)/node_modules/.bin\""
    exit 1
fi

# Create Git Bash wrapper if installation succeeded
echo ""
echo "Creating Git Bash wrapper..."

# Find npm global prefix
NPM_PREFIX=$(npm config get prefix)
BIN_DIR="$NPM_PREFIX/bin"

if [ ! -d "$BIN_DIR" ]; then
    echo "✗ Could not find npm bin directory: $BIN_DIR"
    exit 1
fi

# Find the installed package
PACKAGE_DIR=$(npm root -g)/@jsr/signaler__cli

if [ ! -d "$PACKAGE_DIR" ]; then
    echo "✗ Could not find installed package"
    exit 1
fi

# Create bash wrapper
cat > "$BIN_DIR/signaler" << EOF
#!/usr/bin/env bash
exec node "$PACKAGE_DIR/dist/bin.js" "\$@"
EOF

chmod +x "$BIN_DIR/signaler"

echo "✓ Git Bash wrapper created at: $BIN_DIR/signaler"
echo ""
echo "=== Installation Complete ==="
echo ""
echo "Test with: signaler --version"
echo ""
