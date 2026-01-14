# Scripts Directory

This directory contains utility scripts for building and distributing Signaler.

## Build Scripts

### `build-standalone-bun.sh`
Builds a standalone executable using Bun for the current platform.

**Usage:**
```bash
./scripts/build-standalone-bun.sh
```

**Output:** `standalone-binaries/signaler`

**Requirements:** Bun installed

This creates a single executable that includes:
- Bun runtime
- All TypeScript code
- All dependencies

No Node.js or npm required to run the output!

## Legacy Scripts (Deprecated)

The following scripts are deprecated in favor of the GitHub Actions workflow that builds binaries automatically:

### `install-standalone.sh` (Deprecated)
Old installer that cloned the repo and built from source.

**Replaced by:** `install.sh` (downloads pre-built binary)

### `install-standalone.ps1` (Deprecated)
Old Windows installer that cloned the repo and built from source.

**Replaced by:** `install.ps1` (downloads pre-built binary)

### `create-standalone.sh` (Deprecated)
Created a portable package with Node.js dependencies.

**Replaced by:** Bun standalone executables (no dependencies needed)

## Current Distribution Method

Signaler now uses **pre-built standalone binaries** distributed via GitHub Releases:

1. **Build:** GitHub Actions builds binaries for all platforms (see `.github/workflows/build-binaries.yml`)
2. **Release:** Binaries are uploaded to GitHub Releases
3. **Install:** Users download with one command:

**Unix/Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash
```

**Windows:**
```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.ps1 -UseBasicParsing | iex
```

See [RELEASE-PROCESS.md](../RELEASE-PROCESS.md) for details on creating releases.

## Building Locally

To build a standalone executable locally:

1. **Install Bun:**
```bash
curl -fsSL https://bun.sh/install | bash
```

2. **Build TypeScript:**
```bash
pnpm install
pnpm build
```

3. **Build standalone executable:**
```bash
./scripts/build-standalone-bun.sh
```

4. **Test:**
```bash
./standalone-binaries/signaler --help
```

## Cross-Platform Builds

To build for other platforms, use Bun's target flag:

```bash
# Windows
bun build ./dist/bin.js --compile --target=bun-windows-x64 --outfile signaler-windows.exe

# Linux
bun build ./dist/bin.js --compile --target=bun-linux-x64 --outfile signaler-linux

# macOS Intel
bun build ./dist/bin.js --compile --target=bun-darwin-x64 --outfile signaler-macos-x64

# macOS Apple Silicon
bun build ./dist/bin.js --compile --target=bun-darwin-arm64 --outfile signaler-macos-arm64
```

Note: Cross-compilation may not work for all platforms. Use GitHub Actions for reliable multi-platform builds.

