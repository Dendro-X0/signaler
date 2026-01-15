# Runtime Requirements

## ⚠️ Node.js Required - Bun Not Supported

Signaler **requires Node.js 18+** and **does not work with Bun**.

### Why Not Bun?

Signaler depends on:
- **Lighthouse** - Google's performance auditing tool
- **chrome-launcher** - Chrome/Chromium process management

These packages use Node.js-specific APIs and module resolution patterns that Bun doesn't fully support. When you try to run Signaler with Bun, you'll see errors like:

```
ENOENT: no such file or directory, scandir 'B:\-\BUN\root\locales/'
```

This happens because Bun's module resolution differs from Node.js, causing dependencies to look for files in incorrect locations.

## Solution: Use Node.js

### 1. Install Node.js

Download and install Node.js 18+ from:
- **Official**: https://nodejs.org/
- **nvm** (recommended): https://github.com/nvm-sh/nvm
- **fnm** (fast): https://github.com/Schniz/fnm

### 2. Verify Installation

```bash
node --version
# Should show v18.0.0 or higher
```

### 3. Install Signaler with Node.js

```bash
# Using npm (comes with Node.js)
npm install -g jsr:@signaler/signaler

# Or using pnpm
pnpm add -g jsr:@signaler/signaler

# Or add to project
npx jsr add @signaler/signaler
```

### 4. Run with Node.js

```bash
# If installed globally
signaler wizard

# Or run directly with npx
npx signaler wizard
```

## Why This Matters

Lighthouse (the core auditing engine) is tightly coupled to Node.js because it:
- Launches and controls Chrome/Chromium processes
- Uses Node.js-specific file system APIs
- Relies on Node.js module resolution for locale files
- Requires Node.js streams and child process APIs

These are fundamental dependencies that can't be easily replaced or shimmed for Bun compatibility.

## Alternative Runtimes

### ✅ Supported
- **Node.js 18+** - Fully supported
- **Node.js 20+** - Recommended
- **Node.js 22+** - Latest features

### ❌ Not Supported
- **Bun** - Module resolution incompatibilities
- **Deno** - Lighthouse doesn't support Deno
- **Browser** - Requires Node.js APIs

## Future Bun Support?

Bun support would require:
1. Bun to improve Node.js compatibility (especially module resolution)
2. Lighthouse to officially support Bun
3. chrome-launcher to work with Bun's process APIs

This is unlikely in the near term. For now, **use Node.js**.

## Quick Fix

If you accidentally installed with Bun:

```bash
# Uninstall from Bun
bun remove @signaler/signaler

# Install with Node.js/npm instead
npm install -g jsr:@signaler/signaler

# Verify it works
signaler --version
```

## Still Having Issues?

If you're using Node.js 18+ and still seeing errors:

1. **Check Node version**: `node --version`
2. **Reinstall**: `npm uninstall -g @signaler/signaler && npm install -g jsr:@signaler/signaler`
3. **Clear cache**: `npm cache clean --force`
4. **Check PATH**: Make sure Node.js bin directory is in your PATH

## Summary

- ✅ **Use Node.js 18+**
- ❌ **Don't use Bun**
- 🚀 **Install with npm/pnpm**
- 📦 **Lighthouse requires Node.js**

For more help, see:
- [Installation Guide](INSTALL-LOCAL.md)
- [JSR Publishing](PUBLISH-JSR.md)
- [Troubleshooting](README.md#troubleshooting)
