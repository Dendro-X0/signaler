#!/bin/bash
set -e

# Build standalone executables using nexe
# nexe handles ESM better than pkg

echo "Building standalone executables with nexe..."

# Install nexe if not available
if ! command -v nexe &> /dev/null; then
    echo "Installing nexe..."
    if command -v pnpm &> /dev/null; then
        pnpm add -g nexe
    else
        npm install -g nexe
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
nexe dist/bin.js --output standalone-binaries/signaler --target windows-x64-18.5.0

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

