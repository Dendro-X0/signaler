#!/bin/bash
set -e

# Build standalone executables using Bun
# Creates single executables with runtime included - no Node.js required!

echo "Building standalone executables with Bun..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "Error: Bun is not installed."
    echo "Install from: https://bun.sh"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
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
bun build ./dist/bin.js --compile --outfile standalone-binaries/signaler

echo ""
echo "✓ Standalone executable created!"
echo ""
echo "Location: standalone-binaries/signaler"
echo "Size: $(du -h standalone-binaries/signaler | cut -f1)"
echo ""
echo "This is a complete standalone executable that includes:"
echo "  - Bun runtime"
echo "  - All your code"
echo "  - All dependencies"
echo ""
echo "Users can download and run it immediately:"
echo "  ./signaler wizard"
echo "  ./signaler audit"
echo ""
echo "No Node.js, no npm, no installation required!"
echo ""
echo "To build for other platforms, use:"
echo "  bun build --compile --target=bun-windows-x64"
echo "  bun build --compile --target=bun-linux-x64"
echo "  bun build --compile --target=bun-darwin-x64"
echo "  bun build --compile --target=bun-darwin-arm64"
