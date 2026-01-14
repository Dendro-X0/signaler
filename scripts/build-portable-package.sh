#!/bin/bash
set -e

# Build a portable package that includes Node.js runtime
# This avoids the path resolution issues with Bun compilation

echo "Building portable package with Node.js runtime..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
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
mkdir -p portable-package

# Copy built files
echo "Copying built files..."
cp -r dist portable-package/
cp package.json portable-package/
cp README.md portable-package/

# Install production dependencies only
echo "Installing production dependencies..."
cd portable-package
if command -v pnpm &> /dev/null; then
    pnpm install --prod --no-optional
else
    npm install --production --no-optional
fi
cd ..

# Create wrapper script for Unix
cat > portable-package/signaler << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/dist/bin.js" "$@"
EOF
chmod +x portable-package/signaler

# Create wrapper script for Windows
cat > portable-package/signaler.cmd << 'EOF'
@echo off
node "%~dp0dist\bin.js" %*
EOF

echo ""
echo "✓ Portable package created!"
echo ""
echo "Location: portable-package/"
echo ""
echo "This package includes:"
echo "  - All compiled code"
echo "  - All dependencies"
echo "  - Wrapper scripts (signaler, signaler.cmd)"
echo ""
echo "To use:"
echo "  1. Copy portable-package/ to target machine"
echo "  2. Ensure Node.js is installed on target"
echo "  3. Run: ./signaler wizard"
echo ""
echo "To create a distributable archive:"
echo "  tar -czf signaler-portable.tar.gz portable-package/"
echo "  or"
echo "  zip -r signaler-portable.zip portable-package/"

