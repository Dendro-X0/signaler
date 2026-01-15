# Create portable package - no compilation needed
# Just bundle the built code with Node.js

$ErrorActionPreference = "Stop"

Write-Host "Creating portable package..." -ForegroundColor Cyan
Write-Host ""

# Build TypeScript
Write-Host "Building TypeScript..." -ForegroundColor Yellow
pnpm run build

# Create portable directory
$PortableDir = "portable-package"
if (Test-Path $PortableDir) {
    Remove-Item $PortableDir -Recurse -Force
}
New-Item -ItemType Directory -Path $PortableDir | Out-Null

# Copy built files
Write-Host "Copying files..." -ForegroundColor Yellow
Copy-Item "dist" -Destination "$PortableDir/dist" -Recurse
Copy-Item "node_modules" -Destination "$PortableDir/node_modules" -Recurse
Copy-Item "package.json" -Destination "$PortableDir/"
Copy-Item "README.md" -Destination "$PortableDir/"

# Create launcher scripts
Write-Host "Creating launchers..." -ForegroundColor Yellow

# Windows launcher
@"
@echo off
node "%~dp0dist\bin.js" %*
"@ | Out-File -FilePath "$PortableDir\signaler.cmd" -Encoding ASCII

# PowerShell launcher
@"
#!/usr/bin/env pwsh
node "`$PSScriptRoot/dist/bin.js" `$args
"@ | Out-File -FilePath "$PortableDir\signaler.ps1" -Encoding UTF8

# Bash launcher
@"
#!/usr/bin/env bash
DIR="`$(cd "`$(dirname "`${BASH_SOURCE[0]}")" && pwd)"
node "`$DIR/dist/bin.js" "`$@"
"@ | Out-File -FilePath "$PortableDir\signaler.sh" -Encoding UTF8

# Installation instructions
@"
# Signaler Portable Package

## Installation

### Windows

1. Extract this folder anywhere
2. Add the folder to your PATH, or run directly:
   ``````
   .\signaler.cmd wizard
   ``````

### Linux/macOS

1. Extract this folder anywhere
2. Make the script executable:
   ``````bash
   chmod +x signaler.sh
   ``````
3. Add to PATH or run directly:
   ``````bash
   ./signaler.sh wizard
   ``````

## Requirements

- Node.js 16+ must be installed
- Check: ``node --version``

## Usage

``````bash
# Windows
signaler.cmd wizard
signaler.cmd audit

# Linux/macOS
./signaler.sh wizard
./signaler.sh audit
``````

## What's Included

- Pre-built JavaScript code (dist/)
- All dependencies (node_modules/)
- Launcher scripts for all platforms

## No Installation Needed

This is a portable package. Just extract and run.
No npm, no global installation, no registry issues.

"@ | Out-File -FilePath "$PortableDir\INSTALL.md" -Encoding UTF8

Write-Host ""
Write-Host "Done! Portable package created in: $PortableDir" -ForegroundColor Green
Write-Host ""
Write-Host "To test:" -ForegroundColor Yellow
Write-Host "  cd $PortableDir" -ForegroundColor Gray
Write-Host "  .\signaler.cmd --help" -ForegroundColor Gray
Write-Host ""
Write-Host "To distribute:" -ForegroundColor Yellow
Write-Host "  Zip the $PortableDir folder" -ForegroundColor Gray
Write-Host "  Users extract and run signaler.cmd (Windows) or signaler.sh (Linux/macOS)" -ForegroundColor Gray
Write-Host ""
