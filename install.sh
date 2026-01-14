#!/bin/bash
set -e

# Signaler One-Line Installer
# Downloads pre-built standalone binary from GitHub Releases

REPO="Dendro-X0/signaler"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux*)
    PLATFORM="linux-x64"
    BINARY_NAME="signaler"
    ;;
  Darwin*)
    if [ "$ARCH" = "arm64" ]; then
      PLATFORM="macos-arm64"
    else
      PLATFORM="macos-x64"
    fi
    BINARY_NAME="signaler"
    ;;
  *)
    echo "Error: Unsupported operating system: $OS"
    echo "Please download manually from: https://github.com/$REPO/releases"
    exit 1
    ;;
esac

echo "Installing Signaler for $PLATFORM..."

# Get latest release URL
DOWNLOAD_URL="https://github.com/$REPO/releases/latest/download/signaler-$PLATFORM"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download binary
echo "Downloading from $DOWNLOAD_URL..."
if command -v curl &> /dev/null; then
  curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/signaler"
elif command -v wget &> /dev/null; then
  wget -q "$DOWNLOAD_URL" -O "$INSTALL_DIR/signaler"
else
  echo "Error: curl or wget is required"
  exit 1
fi

# Make executable
chmod +x "$INSTALL_DIR/signaler"

echo ""
echo "✓ Signaler installed successfully!"
echo ""
echo "Location: $INSTALL_DIR/signaler"
echo ""

# Check if in PATH
if echo "$PATH" | grep -q "$INSTALL_DIR"; then
  echo "Run: signaler --help"
else
  echo "Add to PATH by adding this to your ~/.bashrc or ~/.zshrc:"
  echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
  echo ""
  echo "Or run directly: $INSTALL_DIR/signaler --help"
fi
