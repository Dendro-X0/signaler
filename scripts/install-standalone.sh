#!/bin/bash
set -e

# Signaler Standalone Installer
# Downloads and installs Signaler without npm

INSTALL_DIR="${SIGNALER_INSTALL_DIR:-$HOME/.local/bin/signaler}"
REPO_URL="https://github.com/Dendro-X0/signaler"
BRANCH="${SIGNALER_BRANCH:-main}"

echo "Installing Signaler..."
echo "Install directory: $INSTALL_DIR"

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "Error: git is not installed. Please install git first."
    exit 1
fi

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Downloading Signaler..."
cd "$TEMP_DIR"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" signaler
cd signaler

# Check if pnpm is available, otherwise use npm
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
else
    PKG_MGR="npm"
    echo "pnpm not found, using npm (slower)"
fi

echo "Installing dependencies..."
$PKG_MGR install --prod

echo "Building..."
$PKG_MGR run build

echo "Building Rust launcher..."
if command -v cargo &> /dev/null; then
    cd launcher
    cargo build --release
    cd ..
else
    echo "Warning: Rust/cargo not found. Skipping Rust launcher build."
    echo "You can still use: node dist/bin.js"
fi

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy files
echo "Installing to $INSTALL_DIR..."
cp -r dist "$INSTALL_DIR/"
cp -r node_modules "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"

# Copy Rust binary if it exists
if [ -f "launcher/target/release/signaler" ]; then
    cp launcher/target/release/signaler "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR/signaler"
fi

# Create engine manifest
cat > "$INSTALL_DIR/engine.manifest.json" << 'EOF'
{
  "schemaVersion": 1,
  "engineVersion": "1.0.6",
  "minNode": "18.0.0",
  "entry": "dist/bin.js",
  "defaultOutputDirName": ".signaler"
}
EOF

# Create wrapper script
cat > "$INSTALL_DIR/signaler-cli" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$DIR/signaler" ]; then
    "$DIR/signaler" engine run "$@"
else
    node "$DIR/dist/bin.js" "$@"
fi
EOF
chmod +x "$INSTALL_DIR/signaler-cli"

# Add to PATH if not already there
SHELL_RC=""
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
fi

BIN_DIR="$(dirname "$INSTALL_DIR")"
if [ -n "$SHELL_RC" ] && [ -f "$SHELL_RC" ]; then
    if ! grep -q "$BIN_DIR" "$SHELL_RC"; then
        echo "" >> "$SHELL_RC"
        echo "# Signaler" >> "$SHELL_RC"
        echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_RC"
        echo "Added $BIN_DIR to PATH in $SHELL_RC"
        echo "Run: source $SHELL_RC"
    fi
fi

echo ""
echo "✓ Signaler installed successfully!"
echo ""
echo "Location: $INSTALL_DIR"
echo ""
echo "To use Signaler:"
if [ -f "$INSTALL_DIR/signaler" ]; then
    echo "  $INSTALL_DIR/signaler doctor"
    echo "  $INSTALL_DIR/signaler engine run wizard"
    echo "  $INSTALL_DIR/signaler engine run audit"
else
    echo "  node $INSTALL_DIR/dist/bin.js --help"
    echo "  node $INSTALL_DIR/dist/bin.js wizard"
fi
echo ""
echo "Or if $BIN_DIR is in your PATH:"
echo "  signaler-cli wizard"
echo "  signaler-cli audit"
echo ""
echo "Restart your terminal or run: source $SHELL_RC"
