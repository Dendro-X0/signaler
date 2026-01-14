#!/bin/bash
set -e

# Build single executable using pkg
# This creates a standalone binary with Node.js bundled inside

echo "Building single executable for Signaler..."

# Check if pkg is installed
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg..."
    npm install -g pkg
fi

# Build TypeScript
echo "Building TypeScript..."
pnpm install
pnpm build

# Create pkg configuration
cat > pkg-config.json << 'EOF'
{
  "name": "signaler",
  "version": "1.0.6",
  "bin": "dist/bin.js",
  "pkg": {
    "targets": [
      "node18-win-x64",
      "node18-linux-x64",
      "node18-macos-x64",
      "node18-macos-arm64"
    ],
    "outputPath": "build",
    "assets": [
      "dist/**/*",
      "node_modules/**/*"
    ]
  }
}
EOF

# Build executables
echo "Building executables..."
mkdir -p build

pkg . --targets node18-win-x64,node18-linux-x64,node18-macos-x64,node18-macos-arm64 --output build/signaler

echo ""
echo "✓ Executables built successfully!"
echo ""
echo "Output files:"
ls -lh build/
echo ""
echo "These are standalone executables that include Node.js."
echo "Users can download and run them directly without any installation."
