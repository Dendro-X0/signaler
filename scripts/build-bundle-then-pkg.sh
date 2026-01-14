#!/bin/bash
set -e

# Bundle with esbuild, then compile with pkg
# This handles ESM → CJS conversion

echo "Building standalone executable (esbuild + pkg)..."

# Install dependencies
if ! command -v esbuild &> /dev/null; then
    echo "Installing esbuild..."
    pnpm add -D esbuild
fi

if ! command -v pkg &> /dev/null; then
    echo "Installing pkg..."
    npm install -g pkg
fi

# Build TypeScript first
echo "Building TypeScript..."
pnpm install
pnpm build

# Bundle with esbuild (ESM → CJS)
echo "Bundling with esbuild..."
npx esbuild dist/bin.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=dist/bundle.cjs \
  --external:lighthouse \
  --external:chrome-launcher \
  --external:axe-core \
  --external:prompts \
  --external:enquirer \
  --external:ws \
  --external:open

# Build with pkg
echo "Compiling with pkg..."
pkg dist/bundle.cjs --targets node18-win-x64 --output signaler-bundled.exe

echo ""
echo "✓ Standalone executable created!"
echo ""
echo "Location: signaler-bundled.exe"
echo "Size: $(du -h signaler-bundled.exe 2>/dev/null | cut -f1 || echo 'N/A')"
echo ""
echo "Test it:"
echo "  ./signaler-bundled.exe --help"
echo "  ./signaler-bundled.exe wizard"

