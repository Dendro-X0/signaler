#!/bin/bash
set -e

# Create standalone distribution for Signaler
# This bundles the Rust launcher + Node.js engine into a portable package

echo "Creating standalone Signaler distribution..."

# Clean previous builds
rm -rf standalone-dist
mkdir -p standalone-dist

# Build TypeScript engine
echo "Building TypeScript engine..."
pnpm install
pnpm build

# Build Rust launcher
echo "Building Rust launcher..."
cd launcher
cargo build --release
cd ..

# Create distribution directory
DIST_DIR="standalone-dist/signaler"
mkdir -p "$DIST_DIR"

# Copy Rust binary
echo "Copying launcher binary..."
if [ -f "launcher/target/release/signaler.exe" ]; then
    cp launcher/target/release/signaler.exe "$DIST_DIR/"
elif [ -f "launcher/target/release/signaler" ]; then
    cp launcher/target/release/signaler "$DIST_DIR/"
    chmod +x "$DIST_DIR/signaler"
fi

# Copy Node.js engine
echo "Copying Node.js engine..."
cp -r dist "$DIST_DIR/"
cp -r node_modules "$DIST_DIR/"
cp package.json "$DIST_DIR/"

# Create engine manifest
echo "Creating engine manifest..."
cat > "$DIST_DIR/engine.manifest.json" << 'EOF'
{
  "schemaVersion": 1,
  "engineVersion": "1.0.6",
  "minNode": "18.0.0",
  "entry": "dist/bin.js",
  "defaultOutputDirName": ".signaler"
}
EOF

# Create README
cat > "$DIST_DIR/README.txt" << 'EOF'
Signaler - Standalone Distribution
===================================

This is a portable, standalone version of Signaler that doesn't require npm.

Installation:
-------------

1. Extract this folder to any location (e.g., C:\signaler or ~/signaler)
2. Add the folder to your PATH environment variable
3. Run: signaler --help

Requirements:
-------------
- Node.js 18+ must be installed and in PATH
- Chrome/Chromium browser

Usage:
------
signaler doctor          # Check system requirements
signaler engine run wizard
signaler engine run audit
signaler engine run shell

Or use the convenience commands:
signaler run audit
signaler run folder

For more information, visit:
https://github.com/Dendro-X0/signaler
EOF

# Create Windows batch wrapper for easier usage
cat > "$DIST_DIR/signaler-wizard.cmd" << 'EOF'
@echo off
"%~dp0signaler.exe" engine run wizard %*
EOF

cat > "$DIST_DIR/signaler-audit.cmd" << 'EOF'
@echo off
"%~dp0signaler.exe" engine run audit %*
EOF

cat > "$DIST_DIR/signaler-shell.cmd" << 'EOF'
@echo off
"%~dp0signaler.exe" engine run shell %*
EOF

# Create Unix shell wrappers
cat > "$DIST_DIR/signaler-wizard.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$DIR/signaler" engine run wizard "$@"
EOF

cat > "$DIST_DIR/signaler-audit.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$DIR/signaler" engine run audit "$@"
EOF

cat > "$DIST_DIR/signaler-shell.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$DIR/signaler" engine run shell "$@"
EOF

chmod +x "$DIST_DIR"/*.sh 2>/dev/null || true

# Create archive
echo "Creating archive..."
cd standalone-dist
if command -v zip &> /dev/null; then
    zip -r signaler-standalone.zip signaler/
    echo "Created: standalone-dist/signaler-standalone.zip"
fi

if command -v tar &> /dev/null; then
    tar czf signaler-standalone.tar.gz signaler/
    echo "Created: standalone-dist/signaler-standalone.tar.gz"
fi

cd ..

echo ""
echo "Standalone distribution created successfully!"
echo "Location: standalone-dist/signaler/"
echo ""
echo "To test locally:"
echo "  cd standalone-dist/signaler"
echo "  ./signaler doctor"
echo ""
echo "To install:"
echo "  1. Copy standalone-dist/signaler/ to your desired location"
echo "  2. Add that location to your PATH"
echo "  3. Run: signaler doctor"
