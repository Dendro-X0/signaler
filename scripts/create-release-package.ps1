# Create a release package for GitHub Releases
# This creates a zip that users can download and run with Node.js

$ErrorActionPreference = "Stop"

$VERSION = "1.0.12"
$PACKAGE_NAME = "signaler-v$VERSION"
$RELEASE_DIR = "release"

Write-Host "Creating release package for Signaler v$VERSION..." -ForegroundColor Cyan

# Clean up previous release
if (Test-Path $RELEASE_DIR) {
    Remove-Item -Recurse -Force $RELEASE_DIR
}
New-Item -ItemType Directory -Path "$RELEASE_DIR\$PACKAGE_NAME" | Out-Null

# Build the project
Write-Host "Building TypeScript..." -ForegroundColor Yellow
pnpm run build

# Copy necessary files
Write-Host "Copying files..." -ForegroundColor Yellow
Copy-Item -Recurse dist "$RELEASE_DIR\$PACKAGE_NAME\"
Copy-Item -Recurse scripts "$RELEASE_DIR\$PACKAGE_NAME\"
Copy-Item package.json "$RELEASE_DIR\$PACKAGE_NAME\"
Copy-Item README.md "$RELEASE_DIR\$PACKAGE_NAME\"
if (Test-Path LICENSE) {
    Copy-Item LICENSE "$RELEASE_DIR\$PACKAGE_NAME\"
}

# Install production dependencies
Write-Host "Installing production dependencies..." -ForegroundColor Yellow
Push-Location "$RELEASE_DIR\$PACKAGE_NAME"
npm install --production --ignore-scripts
Pop-Location

# Create wrapper scripts
Write-Host "Creating wrapper scripts..." -ForegroundColor Yellow

# Unix wrapper
@'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/dist/bin.js" "$@"
'@ | Out-File -FilePath "$RELEASE_DIR\$PACKAGE_NAME\signaler" -Encoding ASCII -NoNewline

# Windows wrapper
@'
@echo off
node "%~dp0dist\bin.js" %*
'@ | Out-File -FilePath "$RELEASE_DIR\$PACKAGE_NAME\signaler.cmd" -Encoding ASCII

# Create installation instructions
@'
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
'@ | Out-File -FilePath "$RELEASE_DIR\$PACKAGE_NAME\INSTALL.txt" -Encoding UTF8

# Create zip
Write-Host "Creating zip..." -ForegroundColor Yellow
Compress-Archive -Path "$RELEASE_DIR\$PACKAGE_NAME" -DestinationPath "$RELEASE_DIR\$PACKAGE_NAME.zip" -Force

Write-Host ""
Write-Host "✅ Release package created:" -ForegroundColor Green
Write-Host "   - $RELEASE_DIR\$PACKAGE_NAME.zip" -ForegroundColor White
Write-Host ""
Write-Host "Upload this file to GitHub Releases:" -ForegroundColor Cyan
Write-Host "   https://github.com/Dendro-X0/signaler/releases/tag/v$VERSION" -ForegroundColor White
