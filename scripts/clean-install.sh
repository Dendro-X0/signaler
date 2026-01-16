#!/usr/bin/env bash
# Complete clean installation script for Signaler CLI
# This removes all old versions and installs fresh

set -e

echo "=== Signaler CLI - Clean Installation ===" 
echo ""

# Step 1: Remove old installations
echo "Step 1: Removing old installations..."

# Remove from npm global
if command -v npm &> /dev/null; then
    echo "  - Uninstalling from npm..."
    npm uninstall -g @signaler/cli 2>/dev/null || true
    npm uninstall -g apex-auditor 2>/dev/null || true
fi

# Remove installation directories
if [ -d "$HOME/AppData/Local/signaler" ]; then
    echo "  - Removing $HOME/AppData/Local/signaler"
    rm -rf "$HOME/AppData/Local/signaler"
fi

if [ -d "/c/Users/$USER/AppData/Local/signaler" ]; then
    echo "  - Removing /c/Users/$USER/AppData/Local/signaler"
    rm -rf "/c/Users/$USER/AppData/Local/signaler"
fi

if [ -d "C:/Users/$USER/AppData/Local/signaler" ]; then
    echo "  - Removing C:/Users/$USER/AppData/Local/signaler"
    rm -rf "C:/Users/$USER/AppData/Local/signaler"
fi

# Remove old Bun executable if it exists
if [ -d "$HOME/AppData/Local/Programs/signaler" ]; then
    echo "  - Removing old Bun executable"
    rm -rf "$HOME/AppData/Local/Programs/signaler"
fi

echo "  ✓ Old installations removed"
echo ""

# Step 2: Clear npm cache
echo "Step 2: Clearing npm cache..."
npm cache clean --force
echo "  ✓ Cache cleared"
echo ""

# Step 3: Install latest version
echo "Step 3: Installing latest version from JSR..."
npx jsr add @signaler/cli
echo "  ✓ Installation complete"
echo ""

# Step 4: Create Git Bash wrapper
echo "Step 4: Creating Git Bash wrapper..."

# Detect the installation directory
if [ -d "$HOME/AppData/Local/signaler/bin" ]; then
    BIN_DIR="$HOME/AppData/Local/signaler/bin"
elif [ -d "/c/Users/$USER/AppData/Local/signaler/bin" ]; then
    BIN_DIR="/c/Users/$USER/AppData/Local/signaler/bin"
elif [ -d "C:/Users/$USER/AppData/Local/signaler/bin" ]; then
    BIN_DIR="C:/Users/$USER/AppData/Local/signaler/bin"
else
    echo "  ✗ Error: Could not find installation directory"
    exit 1
fi

# Find the signaler root directory
if [ -d "$HOME/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="$HOME/AppData/Local/signaler/current"
elif [ -d "/c/Users/$USER/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="/c/Users/$USER/AppData/Local/signaler/current"
elif [ -d "C:/Users/$USER/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="C:/Users/$USER/AppData/Local/signaler/current"
else
    echo "  ✗ Error: Could not find Signaler root directory"
    exit 1
fi

# Create the bash wrapper
WRAPPER_PATH="$BIN_DIR/signaler"

cat > "$WRAPPER_PATH" << 'WRAPPER_EOF'
#!/usr/bin/env bash
# Signaler CLI wrapper for Git Bash/Unix

# Detect the Signaler root directory
if [ -d "$HOME/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="$HOME/AppData/Local/signaler/current"
elif [ -d "/c/Users/$USER/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="/c/Users/$USER/AppData/Local/signaler/current"
elif [ -d "C:/Users/$USER/AppData/Local/signaler/current" ]; then
    SIGNALER_ROOT="C:/Users/$USER/AppData/Local/signaler/current"
else
    echo "Error: Could not find Signaler installation"
    exit 1
fi

# Execute the CLI with Node.js
exec node "$SIGNALER_ROOT/dist/bin.js" "$@"
WRAPPER_EOF

# Make it executable
chmod +x "$WRAPPER_PATH"

echo "  ✓ Git Bash wrapper created"
echo ""

# Step 5: Verify installation
echo "Step 5: Verifying installation..."

# Check if signaler command exists
if command -v signaler &> /dev/null; then
    echo "  ✓ Command 'signaler' is available"
else
    echo "  ⚠ Warning: 'signaler' command not found in PATH"
    echo "    You may need to restart your terminal"
fi

# Check version
if [ -f "$SIGNALER_ROOT/package.json" ]; then
    VERSION=$(grep '"version"' "$SIGNALER_ROOT/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    echo "  ✓ Installed version: $VERSION"
else
    echo "  ⚠ Warning: Could not determine version"
fi

echo ""
echo "=== Installation Complete ===" 
echo ""
echo "✓ Old versions removed"
echo "✓ Latest version installed"
echo "✓ Git Bash wrapper created"
echo ""
echo "Next steps:"
echo "  1. Restart your terminal (Git Bash, PowerShell, etc.)"
echo "  2. Test with: signaler --version"
echo "  3. Use it: signaler wizard"
echo ""
echo "If 'signaler' is not found after restarting:"
echo "  - In PowerShell: signaler.cmd wizard"
echo "  - In Git Bash: bash $WRAPPER_PATH wizard"
echo ""
