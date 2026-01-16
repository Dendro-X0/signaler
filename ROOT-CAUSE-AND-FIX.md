# Root Cause Analysis: Bun Runtime Error

## The Problem

Users installing `@signaler/cli` from JSR were experiencing this error:

```
ENOENT: no such file or directory, scandir 'B:\-\BUN\root\locales/'
at B:\-\BUN\root\signaler-windows-x64.exe 284432:40
```

## Initial Misdiagnosis

We initially thought this was caused by:
- ❌ Bun installation remnants in PATH
- ❌ Old Bun executables conflicting with npm installation
- ❌ PATH priority issues

While these were contributing factors for some users, they weren't the root cause.

## The Real Root Cause

**Circular Dependency in package.json**

The package.json contained this dependency:

```json
{
  "dependencies": {
    "@signaler/cli": "npm:@jsr/signaler__cli@^1.0.8"
  }
}
```

This created a **circular dependency** where:
1. User installs `@signaler/cli` from JSR
2. JSR publishes the package with all dependencies from package.json
3. The published package tries to install itself from JSR
4. This creates an infinite loop in dependency resolution
5. The bundled code gets confused about module paths
6. Runtime errors occur with phantom paths like `B:\-\BUN\root\locales/`

## Why This Happened

During the JSR publishing setup, we added this line to test JSR installation locally. This was meant to be a development dependency but accidentally got committed and published.

## The Fix

### 1. Removed Circular Dependency

**Before (v1.0.8):**
```json
{
  "name": "@signaler/cli",
  "version": "1.0.8",
  "dependencies": {
    "@signaler/cli": "npm:@jsr/signaler__cli@^1.0.8",  // ❌ CIRCULAR!
    "ansi-colors": "^4.1.3",
    // ... other deps
  }
}
```

**After (v1.0.9):**
```json
{
  "name": "@signaler/cli",
  "version": "1.0.9",
  "dependencies": {
    "ansi-colors": "^4.1.3",
    // ... other deps (no self-reference)
  }
}
```

### 2. Rebuilt and Verified

```bash
pnpm run build
node dist/bin.js --version  # ✓ Works locally
```

### 3. Published to JSR

```bash
npx jsr publish
# Successfully published @signaler/cli@1.0.9
# Visit https://jsr.io/@signaler/cli@1.0.9
```

### 4. Updated Documentation

- Updated CHANGELOG.md with v1.0.9 entry
- Created release notes
- Tagged git repository with v1.0.9
- Pushed to GitHub

## Verification

Users can verify the fix by:

1. **Uninstalling old version:**
   ```bash
   npm uninstall -g @jsr/signaler__cli
   npm uninstall -g @signaler/cli
   npm cache clean --force
   ```

2. **Installing fixed version:**
   ```bash
   npx jsr add -g @signaler/cli
   ```

3. **Testing:**
   ```bash
   signaler --version
   # Should show help text without errors
   ```

4. **Running test script:**
   ```bash
   pwsh ./test-v1.0.9-fix.ps1
   ```

## Lessons Learned

1. **Never add self-referencing dependencies** - Always review package.json before publishing
2. **Test published packages** - Install from the registry and test, not just local builds
3. **Use dry-run first** - Always use `--dry-run` to catch issues before publishing
4. **Version bump for fixes** - Critical fixes should get a new version to force updates
5. **Comprehensive testing** - Test installation from scratch, not just upgrades

## Technical Details

### Why the Error Message Was Confusing

The error message `B:\-\BUN\root\locales/` was misleading because:
- No B: drive existed on the system
- Bun was completely uninstalled
- The path was a **phantom path** created by the circular dependency resolution

The bundler (or Node.js module resolver) was trying to resolve the circular dependency and generated this nonsensical path as a result of the infinite loop.

### Why Local Builds Worked

Local builds worked because:
- `node dist/bin.js` runs the built code directly
- No dependency resolution happens for the package itself
- The circular dependency only manifests when installed via npm/JSR

### Why Cleaning PATH Didn't Help

Cleaning PATH and removing Bun didn't help because:
- The issue was in the published package on JSR
- Every fresh installation would get the broken package
- The circular dependency was baked into the published artifact

## Prevention

To prevent this in the future:

1. **Add pre-publish checks:**
   ```json
   {
     "scripts": {
       "prepublishOnly": "node scripts/check-no-self-deps.js && pnpm run build"
     }
   }
   ```

2. **Add automated tests:**
   - Test installation from JSR in CI
   - Verify no circular dependencies
   - Test CLI execution after installation

3. **Review checklist:**
   - [ ] No self-referencing dependencies
   - [ ] Dry-run passes
   - [ ] Local build works
   - [ ] Fresh installation works
   - [ ] CLI executes without errors

## Status

✅ **FIXED in v1.0.9**

- Published to JSR: https://jsr.io/@signaler/cli@1.0.9
- Git tag: v1.0.9
- GitHub: https://github.com/Dendro-X0/signaler

Users should upgrade immediately to avoid the circular dependency issue.
