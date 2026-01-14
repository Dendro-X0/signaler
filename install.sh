#!/bin/bash
set -e

# Signaler Binary Installer
# Downloads pre-built standalone executable from GitHub Releases
# No Node.js, no npm, no dependencies required!

REPO="Dendro-X0/signaler"
INSTALL_DIR="${SIGNALER_INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="signaler"

echo "Installing Signaler..."

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux*)
        PLATFORM="linux-x64"
        ;;
    Darwin*)
        if [ "$ARCH" = "arm64" ]; then
            PLATFORM="macos-arm64"
        else
            PLATFORM="macos-x64"
        fi
        ;;
    *)
        echo "Error: Unsupported operating system: $OS"
        echo "Please download manually from: https://github.com/$REPO/releases"
        exit 1
        ;;
esac

echo "Detected platform: $PLATFORM"

# Get latest release URL
DOWNLOAD_URL="https://github.com/$REPO/releases/latest/download/signaler-$PLATFORM"

echo "Downloading from: $DOWNLOAD_URL"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download binary
if command -v curl &> /dev/null; then
    curl -L "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BINARY_NAME"
elif command -v wget &> /dev/null; then
    wget "$DOWNLOAD_URL" -O "$INSTALL_DIR/$BINARY_NAME"
else
    echo "Error: Neither curl nor wget found. Please install one of them."
    exit 1
fi

# Make executable
chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Add to PATH if not already there
SHELL_RC=""
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
fi

if [ -n "$SHELL_RC" ] && [ -f "$SHELL_RC" ]; then
    if ! grep -q "$INSTALL_DIR" "$SHELL_RC"; then
        echo "" >> "$SHELL_RC"
        echo "# Signaler" >> "$SHELL_RC"
        echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$SHELL_RC"
        echo "Added $INSTALL_DIR to PATH in $SHELL_RC"
    fi
fi

echo ""
echo "✓ Signaler installed successfully!"
echo ""
echo "Location: $INSTALL_DIR/$BINARY_NAME"
echo "Size: $(du -h "$INSTALL_DIR/$BINARY_NAME" | cut -f1)"
echo ""
echo "This is a standalone executable with:"
echo "  ✓ No Node.js required"
echo "  ✓ No npm required"
echo "  ✓ No dependencies"
echo ""
echo "To use Signaler:"
echo "  $INSTALL_DIR/$BINARY_NAME wizard"
echo "  $INSTALL_DIR/$BINARY_NAME audit"
echo ""
if [ -n "$SHELL_RC" ]; then
    echo "Restart your terminal or run: source $SHELL_RC"
    echo "Then you can use: $BINARY_NAME wizard"
fi
