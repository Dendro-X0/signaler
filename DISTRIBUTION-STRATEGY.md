# Distribution Strategy for Signaler

## The Problem

- Not published to npm registry (by choice)
- Node.js apps require Node.js runtime + dependencies
- Windows PowerShell execution policies block scripts
- Users want: one command → working CLI (like `go install` or `cargo install`)

## Possible Solutions

### Option 1: Pre-built Binaries via GitHub Releases ⭐ RECOMMENDED

**How it works:**
1. Use GitHub Actions to build standalone executables
2. Upload to GitHub Releases
3. Users download with one command

**Tools to create standalone executables:**

#### A. Using `@vercel/ncc` + Node.js binary
- Bundle all code into single JS file
- Distribute with Node.js binary
- ~50MB per platform

#### B. Using Bun
```bash
bun build ./dist/bin.js --compile --outfile signaler
```
- Creates true standalone executable
- No Node.js required
- ~90MB per platform
- **BEST OPTION**

#### C. Using Deno
```bash
deno compile --allow-all --output signaler dist/bin.js
```
- Creates standalone executable
- ~80MB per platform

**Implementation:**

1. Add to `.github/workflows/release.yml`:
```yaml
- name: Build with Bun
  run: |
    bun build ./dist/bin.js --compile --outfile signaler-${{ matrix.platform }}
```

2. Users install with:
```bash
# Windows
iwr https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-windows.exe -OutFile signaler.exe

# macOS/Linux
curl -L https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-linux -o signaler
chmod +x signaler
```

### Option 2: Scoop (Windows) / Homebrew (macOS)

Create package definitions for package managers:

**Scoop (Windows):**
```json
{
  "version": "1.0.6",
  "url": "https://github.com/Dendro-X0/signaler/releases/download/v1.0.6/signaler-windows.exe",
  "bin": "signaler.exe"
}
```

Users install with:
```powershell
scoop install signaler
```

**Homebrew (macOS/Linux):**
```ruby
class Signaler < Formula
  desc "Web performance auditing tool"
  homepage "https://github.com/Dendro-X0/signaler"
  url "https://github.com/Dendro-X0/signaler/releases/download/v1.0.6/signaler-macos.tar.gz"
  
  def install
    bin.install "signaler"
  end
end
```

Users install with:
```bash
brew install signaler
```

### Option 3: Direct Download Script

Simple one-liner that downloads pre-built binary:

```bash
# Unix/Linux/macOS
curl -fsSL https://signaler.dev/install.sh | sh

# Windows
iwr https://signaler.dev/install.ps1 | iex
```

Script downloads the right binary for the platform and adds to PATH.

### Option 4: Container/Docker

```bash
docker run --rm -it signaler/signaler wizard
```

Not ideal for CLI tools, but works everywhere.

## Recommended Implementation Plan

### Phase 1: pkg Standalone Executables (CURRENT)

**UPDATE:** We switched from Bun to `pkg` due to path resolution issues with Lighthouse dependencies.

1. Install pkg in GitHub Actions
2. Build standalone executables for:
   - Windows x64
   - Linux x64
   - macOS x64
   - macOS ARM64
3. Upload to GitHub Releases
4. Create simple download scripts

**Pros:**
- True standalone executables
- No Node.js required
- No npm required
- Handles complex dependencies (Lighthouse, Chrome Launcher)
- Battle-tested with Node.js apps
- ~80-100MB per platform (acceptable)

**Cons:**
- Larger file size than npm package
- Requires GitHub Actions setup

**Why not Bun?**
Bun's compilation fails with Lighthouse because it tries to access locale files at runtime using paths that don't exist in the bundled executable (`B:\-BUN\root/locales/`). See [BUN-COMPILATION-ISSUE.md](BUN-COMPILATION-ISSUE.md) for details.

### Phase 2: Package Managers (OPTIONAL)

1. Create Scoop manifest (Windows)
2. Create Homebrew formula (macOS/Linux)
3. Submit to package manager repositories

**Pros:**
- Users can use familiar package managers
- Automatic updates
- No npm required

**Cons:**
- Requires maintaining package definitions
- Approval process for official repositories

### Phase 3: Custom Registry (FUTURE)

Host your own package registry:
- `signaler install signaler`
- Like npm but your own infrastructure

## Immediate Action Items

1. **Add Bun build to GitHub Actions:**
   ```yaml
   - uses: oven-sh/setup-bun@v1
   - run: bun install
   - run: bun build ./dist/bin.js --compile --outfile signaler
   ```

2. **Create release workflow** that builds for all platforms

3. **Create simple download scripts:**
   ```bash
   # install.sh
   curl -L https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-$(uname -s)-$(uname -m) -o /usr/local/bin/signaler
   chmod +x /usr/local/bin/signaler
   ```

4. **Update README:**
   ```bash
   # One command install
   curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | sh
   ```

## Why Bun is the Best Choice

1. **True standalone executable** - includes runtime
2. **No dependencies** - users don't need Node.js
3. **Fast** - Bun is faster than Node.js
4. **Simple** - one command to build
5. **Cross-platform** - works on Windows, macOS, Linux
6. **No npm** - completely independent

## Next Steps

Would you like me to:
1. Set up Bun compilation in GitHub Actions?
2. Create the release workflow?
3. Build standalone executables locally for testing?

This will give you the "one command install" experience you want, without npm.
