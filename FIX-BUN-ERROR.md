# Fix: Bun Error - "ENOENT: no such file or directory, scandir 'B:\-\BUN\root\locales/'"

## The Problem

You installed Signaler using Bun, but **Signaler requires Node.js** and doesn't work with Bun.

The error happens because Lighthouse (the core auditing engine) uses Node.js-specific module resolution that Bun doesn't support.

## The Solution

### Step 1: Uninstall from Bun

```bash
bun remove @signaler/signaler
```

### Step 2: Install Node.js

If you don't have Node.js 18+ installed:

**Windows**:
- Download from https://nodejs.org/
- Or use `winget install OpenJS.NodeJS`

**macOS**:
```bash
brew install node
```

**Linux**:
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
```

### Step 3: Verify Node.js

```bash
node --version
# Should show v18.0.0 or higher
```

### Step 4: Install Signaler with Node.js

```bash
# Install globally with npm
npm install -g jsr:@signaler/signaler

# Or with pnpm
pnpm add -g jsr:@signaler/signaler
```

### Step 5: Test It

```bash
signaler --version
signaler wizard
```

## Why Can't I Use Bun?

Signaler depends on:
- **Lighthouse** - Google's performance auditing tool (Node.js only)
- **chrome-launcher** - Chrome process management (Node.js only)

These packages use Node.js-specific APIs that Bun doesn't fully support:
- Node.js module resolution for locale files
- Child process APIs for Chrome management
- File system APIs with specific Node.js behavior

## Can This Be Fixed?

Not easily. It would require:
1. Bun to fully implement Node.js module resolution
2. Lighthouse to officially support Bun
3. Significant changes to how Signaler manages Chrome

For now, **just use Node.js** - it's the standard runtime for Lighthouse-based tools.

## Quick Reference

```bash
# ❌ Don't do this
bun add @signaler/signaler
bun run signaler wizard

# ✅ Do this instead
npm install -g jsr:@signaler/signaler
signaler wizard
```

## Still Need Help?

See [RUNTIME-REQUIREMENTS.md](RUNTIME-REQUIREMENTS.md) for more details.
