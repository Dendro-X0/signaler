# Distribution Guide

This document explains how Signaler is distributed and why we chose this approach.

## TL;DR

**Signaler is distributed as standalone executables via GitHub Releases.**

- ✅ No npm registry
- ✅ No Node.js required
- ✅ No dependencies
- ✅ One command install
- ✅ ~90MB per platform

Install with:
```bash
# Unix/Linux/macOS
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash

# Windows
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.ps1 -UseBasicParsing | iex
```

## Why Not npm?

Signaler is **intentionally not published to npm registry** for these reasons:

1. **Package name conflicts** - Can't change package names once published
2. **Can't delete packages** - Deprecated packages stay forever
3. **Registry lock-in** - Tied to npm infrastructure
4. **Version constraints** - Semver restrictions
5. **Distribution control** - Want full control over distribution

## Why Standalone Binaries?

### The Problem with Traditional Node.js Distribution

Traditional Node.js CLI tools require:
1. Node.js runtime installed
2. npm/pnpm/yarn installed
3. Package installation
4. Dependency resolution
5. PATH configuration

This creates friction for users who just want to run a tool.

### The Solution: Standalone Executables

Standalone executables solve all these problems:
1. **No runtime required** - Includes Bun runtime
2. **No package manager** - Direct download
3. **No dependencies** - Everything bundled
4. **No installation** - Just download and run
5. **No PATH issues** - Installer handles it

### Comparison

| Method | Size | Install Time | Requirements | Updates |
|--------|------|--------------|--------------|---------|
| npm package | ~5MB | 30-60s | Node.js, npm | `npm update` |
| Standalone binary | ~90MB | 5-10s | None | Re-download |
| Docker image | ~200MB | 60-120s | Docker | `docker pull` |

## How It Works

### 1. Build Process

When a new version is released:

1. **Tag created:** `git tag v1.0.6 && git push origin v1.0.6`
2. **GitHub Actions triggers:** `.github/workflows/build-binaries.yml`
3. **Bun compiles:** Creates standalone executables for all platforms
4. **Release created:** Binaries uploaded to GitHub Releases
5. **Users download:** One-line installer fetches the binary

### 2. What's Inside the Binary

Each standalone executable contains:

- **Bun runtime** (~80MB) - Fast JavaScript runtime
- **Your code** (~5MB) - Compiled TypeScript
- **Dependencies** (~5MB) - All npm packages bundled
- **Total:** ~90MB

### 3. Installation Process

The one-line installer:

1. Detects your platform (Windows/macOS/Linux)
2. Downloads the correct binary from GitHub Releases
3. Saves to `~/.local/bin/signaler` (Unix) or `%LOCALAPPDATA%\signaler` (Windows)
4. Makes executable (Unix only)
5. Adds to PATH (optional)

### 4. Update Process

To update:
```bash
# Just run the installer again
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash
```

It downloads the latest binary and replaces the old one.

## Why Bun?

We chose Bun over other options:

### Bun vs Node.js + pkg/nexe

| Feature | Bun | Node.js + pkg |
|---------|-----|---------------|
| Compilation speed | Fast (~10s) | Slow (~60s) |
| Binary size | ~90MB | ~50MB |
| Runtime speed | Faster | Slower |
| Maintenance | Active | Deprecated |
| Cross-compilation | Yes | Limited |

### Bun vs Deno

| Feature | Bun | Deno |
|---------|-----|------|
| npm compatibility | Excellent | Good |
| Binary size | ~90MB | ~80MB |
| Compilation | Simple | Simple |
| Ecosystem | Growing | Mature |

### Bun vs Rust Rewrite

| Feature | Bun | Rust |
|---------|-----|------|
| Development time | Days | Months |
| Binary size | ~90MB | ~10MB |
| Maintenance | Easy | Hard |
| Dependencies | Bundled | Compiled |

**Verdict:** Bun provides the best balance of:
- Fast compilation
- Easy maintenance
- Good performance
- Small enough binaries

## Alternative Distribution Methods

### Option 1: Package Managers (Future)

We may add support for:

**Scoop (Windows):**
```powershell
scoop bucket add signaler https://github.com/Dendro-X0/scoop-signaler
scoop install signaler
```

**Homebrew (macOS/Linux):**
```bash
brew tap Dendro-X0/signaler
brew install signaler
```

**Advantages:**
- Familiar to users
- Automatic updates
- Version management

**Disadvantages:**
- Requires package manager
- Approval process
- Maintenance overhead

### Option 2: Docker (Available Now)

You can use Docker if you prefer:

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install && bun build
ENTRYPOINT ["bun", "dist/bin.js"]
```

```bash
docker run --rm -it signaler/signaler wizard
```

**Advantages:**
- Isolated environment
- Reproducible builds
- Works everywhere

**Disadvantages:**
- Requires Docker
- Larger size (~200MB)
- Slower startup

### Option 3: Build from Source (Available Now)

For developers:

```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install
pnpm build
node dist/bin.js wizard
```

**Advantages:**
- Full control
- Latest code
- Easy to modify

**Disadvantages:**
- Requires Node.js
- Requires build step
- Slower

## Platform Support

### Supported Platforms

- ✅ Windows x64
- ✅ Linux x64
- ✅ macOS x64 (Intel)
- ✅ macOS ARM64 (Apple Silicon)

### Unsupported Platforms

- ❌ Windows ARM64 (use WSL + Linux binary)
- ❌ Linux ARM64 (build from source)
- ❌ FreeBSD (build from source)

For unsupported platforms, build from source:
```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install && pnpm build
node dist/bin.js wizard
```

## Security Considerations

### Binary Verification

Each release includes SHA256 checksums:

```bash
# Download binary
curl -L https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-linux-x64 -o signaler

# Download checksum
curl -L https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-linux-x64.sha256 -o signaler.sha256

# Verify
sha256sum -c signaler.sha256
```

### Code Signing (Future)

We plan to add:
- **Windows:** Authenticode signing
- **macOS:** Notarization
- **Linux:** GPG signatures

### Supply Chain Security

- **Source:** GitHub repository (public)
- **Build:** GitHub Actions (reproducible)
- **Distribution:** GitHub Releases (verified)
- **No third-party registries:** Direct from source

## Troubleshooting

### "Binary won't run on my platform"

Check supported platforms above. If unsupported, build from source.

### "Binary is too large"

The binary includes the runtime and all dependencies. This is intentional to avoid requiring Node.js.

If size is critical:
- Use the npm package (requires Node.js)
- Build from source and use `node dist/bin.js`
- Use Docker with a smaller base image

### "I want automatic updates"

Currently, re-run the installer to update:
```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash
```

Future: We may add auto-update functionality.

### "I prefer npm"

The package is not published to npm by choice. However, you can:

1. **Install from source:**
```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install && pnpm build
pnpm link --global
```

2. **Use npx with GitHub:**
```bash
npx github:Dendro-X0/signaler wizard
```

## FAQ

**Q: Why is the binary so large?**  
A: It includes the Bun runtime (~80MB) plus your code and dependencies. This is necessary to avoid requiring Node.js.

**Q: Can I use this in CI/CD?**  
A: Yes! Download the binary in your CI pipeline:
```yaml
- run: curl -L https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-linux-x64 -o signaler
- run: chmod +x signaler
- run: ./signaler audit --ci
```

**Q: How do I update?**  
A: Re-run the installer. It will download and replace the old binary.

**Q: Can I distribute this binary?**  
A: Yes, under the MIT license. Include the LICENSE file.

**Q: Does this work offline?**  
A: Yes, once downloaded. The binary is self-contained.

**Q: Can I build my own binary?**  
A: Yes! See [scripts/build-standalone-bun.sh](scripts/build-standalone-bun.sh)

## Summary

Signaler uses **standalone executables** distributed via **GitHub Releases** because:

1. ✅ No npm registry required
2. ✅ No Node.js required
3. ✅ One command install
4. ✅ Fast and simple
5. ✅ Full distribution control

This provides the best user experience for a CLI tool that doesn't need to be on npm.

