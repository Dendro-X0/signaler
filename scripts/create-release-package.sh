#!/bin/bash
# Create a release package for GitHub Releases
# This creates a tarball that users can download and run with Node.js

set -e

VERSION="1.0.12"
PACKAGE_NAME="signaler-v${VERSION}"
RELEASE_DIR="release"

echo "Creating release package for Signaler v${VERSION}..."

# Clean up previous release
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR/$PACKAGE_NAME"

# Build the project
echo "Building TypeScript..."
pnpm run build

# Copy necessary files
echo "Copying files..."
cp -r dist "$RELEASE_DIR/$PACKAGE_NAME/"
cp -r scripts "$RELEASE_DIR/$PACKAGE_NAME/"
cp package.json "$RELEASE_DIR/$PACKAGE_NAME/"
cp README.md "$RELEASE_DIR/$PACKAGE_NAME/"
cp LICENSE "$RELEASE_DIR/$PACKAGE_NAME/" 2>/dev/null || echo "No LICENSE file found"

# Install production dependencies
echo "Installing production dependencies..."
cd "$RELEASE_DIR/$PACKAGE_NAME"
npm install --production --ignore-scripts
cd ../..

# Create wrapper scripts
echo "Creating wrapper scripts..."

# Unix wrapper
cat > "$RELEASE_DIR/$PACKAGE_NAME/signaler" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/dist/bin.js" "$@"
EOF
chmod +x "$RELEASE_DIR/$PACKAGE_NAME/signaler"

# Windows wrapper
cat > "$RELEASE_DIR/$PACKAGE_NAME/signaler.cmd" << 'EOF'
@echo off
node "%~dp0dist\bin.js" %*
EOF

# Create installation instructions
cat > "$RELEASE_DIR/$PACKAGE_NAME/INSTALL.txt" << 'EOF'
Signaler CLI v1.0.12 - Installation Instructions
================================================

REQUIREMENTS:
- Node.js 18 or higher

INSTALLATION:

1. Extract this archive to a directory of your choice
2. Add the directory to your PATH, or run directly:

   Unix/macOS/Linux:
   ./signaler wizard

   Windows:
   signaler.cmd wizard

RECOMMENDED: Install via JSR instead
====================================

For easier installation and updates, use JSR:

   npx jsr add @signaler/cli

Then run:
   signaler wizard

See README.md for full documentation.
EOF

# Create tarball
echo "Creating tarball..."
cd "$RELEASE_DIR"
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
cd ..

# Create zip for Windows users
echo "Creating zip..."
cd "$RELEASE_DIR"
zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME" > /dev/null
cd ..

echo ""
echo "✅ Release packages created:"
echo "   - $RELEASE_DIR/${PACKAGE_NAME}.tar.gz"
echo "   - $RELEASE_DIR/${PACKAGE_NAME}.zip"
echo ""
echo "Upload these files to GitHub Releases:"
echo "   https://github.com/Dendro-X0/signaler/releases/tag/v${VERSION}"
