# Release Process

This document explains how to create a new release with standalone binaries.

## Overview

Signaler uses GitHub Actions to automatically build standalone executables for all platforms when you create a new release tag. The binaries are built using Bun and include everything needed to run - no Node.js or npm required.

## Creating a Release

### 1. Update Version

Update the version in `package.json`:
```json
{
  "version": "1.0.6"
}
```

### 2. Commit and Tag

```bash
git add package.json
git commit -m "Release v1.0.6"
git tag v1.0.6
git push origin main
git push origin v1.0.6
```

### 3. GitHub Actions Builds Binaries

The `.github/workflows/build-binaries.yml` workflow will automatically:
1. Trigger on the new tag
2. Build standalone executables for:
   - Windows x64
   - Linux x64
   - macOS x64 (Intel)
   - macOS ARM64 (Apple Silicon)
3. Create a GitHub Release
4. Upload all binaries to the release
5. Generate installation instructions

### 4. Verify Release

Check the GitHub Releases page:
- https://github.com/Dendro-X0/signaler/releases

Each release should have:
- `signaler-windows-x64.exe` (~90MB)
- `signaler-linux-x64` (~90MB)
- `signaler-macos-x64` (~90MB)
- `signaler-macos-arm64` (~90MB)
- SHA256 checksums for each binary

### 5. Test Installation

Test the one-line installers:

**Unix/Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash
```

**Windows:**
```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.ps1 -UseBasicParsing | iex
```

## Manual Trigger

You can also manually trigger the build workflow:

1. Go to: https://github.com/Dendro-X0/signaler/actions/workflows/build-binaries.yml
2. Click "Run workflow"
3. Select the branch
4. Click "Run workflow"

This is useful for testing the build process without creating a release.

## What Gets Built

Each binary is a standalone executable that includes:
- Bun runtime (~80MB)
- All TypeScript code (compiled)
- All dependencies
- No external dependencies required

Users can download and run immediately:
```bash
./signaler wizard
./signaler audit
```

## Troubleshooting

### Build fails on a platform

Check the GitHub Actions logs:
- https://github.com/Dendro-X0/signaler/actions

Common issues:
- TypeScript compilation errors (fix in source)
- Bun compilation errors (check Bun version)
- Missing dependencies (check package.json)

### Binary doesn't work

Test locally with Bun:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Build locally
cd signaler
pnpm install
pnpm build
bun build ./dist/bin.js --compile --outfile signaler-test

# Test
./signaler-test --help
```

### Installer script fails

Test the installer scripts locally:
```bash
# Unix/Linux/macOS
bash install.sh

# Windows
powershell -ExecutionPolicy Bypass -File install.ps1
```

## Distribution Strategy

### Why Standalone Binaries?

1. **No npm registry** - Package is not published to npm by choice
2. **No Node.js required** - Users don't need Node.js installed
3. **One command install** - Like `go install` or `cargo install`
4. **No dependencies** - Everything is bundled
5. **Fast** - Bun runtime is faster than Node.js

### Why Bun?

1. **True standalone executables** - Includes runtime
2. **Cross-platform** - Works on Windows, macOS, Linux
3. **Fast compilation** - Builds in seconds
4. **Simple** - One command to build
5. **No npm** - Completely independent

### Alternative Distribution Methods

See [DISTRIBUTION-STRATEGY.md](DISTRIBUTION-STRATEGY.md) for other options:
- Package managers (Scoop, Homebrew)
- Docker containers
- Custom registry
- Rust launcher (already exists in `launcher/`)

## CI/CD Integration

The build workflow runs on:
- Push to tags matching `v*.*.*`
- Manual workflow dispatch

Workflow file: `.github/workflows/build-binaries.yml`

## Next Steps

Future improvements:
1. Add to Scoop (Windows package manager)
2. Add to Homebrew (macOS/Linux package manager)
3. Auto-update mechanism
4. Code signing for binaries
5. Notarization for macOS binaries

