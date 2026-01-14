#!/bin/bash
set -e

# Build standalone executables using pkg
# pkg handles Node.js dependencies better than Bun

echo "Building standalone executables with pkg..."

# Install pkg if not available
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg..."
    if command -v pnpm &> /dev/null; then
        pnpm add -g pkg
    else
        npm install -g pkg
    fi
fi

# Build TypeScript first
echo "Building TypeScript..."
if command -v pnpm &> /dev/null; then
    pnpm install
    pnpm build
else
    npm install
    npm run build
fi

# Create output directory
mkdir -p standalone-binaries

# Build for current platform
echo "Building for current platform..."
pkg dist/bin.js --output standalone-binaries/signaler --targets node18

echo ""
echo "✓ Standalone executable created!"
echo ""
echo "Location: standalone-binaries/signaler"
echo "Size: $(du -h standalone-binaries/signaler 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "This is a complete standalone executable that includes:"
echo "  - Node.js runtime"
echo "  - All your code"
echo "  - All dependencies"
echo ""
echo "Users can download and run it immediately:"
echo "  ./signaler wizard"
echo "  ./signaler audit"
echo ""
echo "To build for specific platforms:"
echo "  pkg dist/bin.js --targets node18-win-x64 --output signaler-windows.exe"
echo "  pkg dist/bin.js --targets node18-linux-x64 --output signaler-linux"
echo "  pkg dist/bin.js --targets node18-macos-x64 --output signaler-macos"
echo "  pkg dist/bin.js --targets node18-macos-arm64 --output signaler-macos-arm64"

