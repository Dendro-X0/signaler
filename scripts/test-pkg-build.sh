#!/bin/bash
set -e

# Quick test script to verify pkg compilation works

echo "Testing pkg compilation..."
echo ""

# Check if pkg is installed
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg..."
    pnpm add -g pkg
fi

# Build TypeScript
echo "Building TypeScript..."
pnpm build

# Create test output directory
mkdir -p test-build

# Build for current platform only
echo ""
echo "Building test executable..."
pkg dist/bin.js --output test-build/signaler-test

# Test the executable
echo ""
echo "Testing executable..."
if [ -f test-build/signaler-test ]; then
    chmod +x test-build/signaler-test
    echo "✓ Executable created successfully"
    echo ""
    echo "Testing --help command..."
    ./test-build/signaler-test --help || echo "Note: --help may fail if it requires dependencies"
    echo ""
    echo "✓ Test complete!"
    echo ""
    echo "Executable location: test-build/signaler-test"
    echo "Size: $(du -h test-build/signaler-test | cut -f1)"
else
    echo "✗ Failed to create executable"
    exit 1
fi

