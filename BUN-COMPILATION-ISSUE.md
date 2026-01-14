# Bun Compilation Issue

## Problem

When compiling Signaler with `bun build --compile`, the resulting executable fails with:

```
ENOENT: no such file or directory, scandir 'B:\-BUN\root/locales/'
```

## Root Cause

The issue occurs because:

1. **Lighthouse dependency** tries to access locale files at runtime using hardcoded paths
2. **Bun's bundler** doesn't properly handle these dynamic file system accesses
3. The bundled executable looks for files at `B:\-BUN\root/locales/` which doesn't exist

This is a known limitation with Bun's compilation when dealing with complex Node.js packages that:
- Use `import.meta.url` for path resolution
- Access files dynamically at runtime
- Have native dependencies or locale files

## Solutions

### Option 1: Use `pkg` instead of Bun (RECOMMENDED)

`pkg` is specifically designed to bundle Node.js applications and handles dependencies better:

```bash
# Build with pkg
./scripts/build-with-pkg.sh

# Or manually:
pnpm install -g pkg
pnpm build
pkg dist/bin.js --targets node18-win-x64 --output signaler.exe
```

**Pros:**
- Handles Lighthouse and Chrome Launcher correctly
- Properly bundles locale files and assets
- Creates true standalone executables
- Battle-tested with complex Node.js apps

**Cons:**
- Slightly larger file size (~80-100MB)
- Requires pkg to be installed

### Option 2: Portable Package with Node.js

Create a portable package that requires Node.js on the target machine:

```bash
./scripts/build-portable-package.sh
```

This creates a `portable-package/` directory with:
- Compiled code
- All dependencies
- Wrapper scripts

**Pros:**
- No compilation issues
- Smaller download size
- Easy to update

**Cons:**
- Requires Node.js on target machine
- Not a single executable

### Option 3: Fix Bun Compilation (EXPERIMENTAL)

To make Bun compilation work, we would need to:

1. **Patch Lighthouse** to use relative paths
2. **Bundle locale files** explicitly
3. **Override path resolution** in the compiled binary

This is complex and not recommended because:
- Requires maintaining patches for dependencies
- May break with dependency updates
- Bun's compilation is still experimental for complex apps

## Recommended Approach

**For Windows users who want one-click installation:**

Use `pkg` to create standalone executables:

```bash
# Install pkg globally
pnpm add -g pkg

# Build for Windows
pnpm build
pkg dist/bin.js --targets node18-win-x64 --output signaler.exe

# Build for all platforms
pkg dist/bin.js --targets node18-win-x64,node18-linux-x64,node18-macos-x64,node18-macos-arm64
```

**For distribution via GitHub Releases:**

Update `.github/workflows/build-binaries.yml` to use `pkg` instead of Bun.

## Why This Happens

The error trace shows:
1. Bun compiles everything into a single executable
2. At runtime, Lighthouse tries to access `chrome-launcher` locale files
3. The path resolution uses `import.meta.url` which points to Bun's internal virtual filesystem
4. The virtual filesystem path `B:\-BUN\root/locales/` doesn't exist on disk
5. The `scandir` operation fails

This is fundamentally a limitation of how Bun handles dynamic file system access in compiled executables.

## Next Steps

1. **Immediate fix:** Use `pkg` for building standalone executables
2. **Update CI:** Modify GitHub Actions workflow to use `pkg`
3. **Update docs:** Change installation instructions to reference `pkg`-built binaries
4. **Test:** Verify the `pkg`-built executable works on Windows

## References

- [Bun compilation limitations](https://bun.sh/docs/bundler/executables#limitations)
- [pkg documentation](https://github.com/vercel/pkg)
- [Lighthouse file system access](https://github.com/GoogleChrome/lighthouse/issues)
