# Known Issues

## Critical: Bun Runtime Error (Unresolved)

### Issue Description
When running `signaler` after installation from JSR, some users encounter:
```
ENOENT: no such file or directory, scandir 'B:\-\BUN\root\locales/'
at B:\-\BUN\root\signaler-windows-x64.exe 284432:40
```

### Status
**UNRESOLVED** - This issue persists even after:
- Complete Bun uninstallation
- PATH environment variable cleanup
- Fresh installation from JSR
- System restart

### Root Cause
The error originates from a Bun-compiled executable created by `scripts/build-standalone-bun.sh` (commit `15cc8e9`, January 14, 2026). This script used:
```bash
bun build ./dist/bin.js --compile --outfile standalone-binaries/signaler
```

Bun's `--compile` flag has a known bug with Lighthouse dependencies, hardcoding non-existent paths like `B:\-\BUN\root\locales/`.

### Why It Persists
The executable at `B:\-\BUN\root\signaler-windows-x64.exe` remains in the system PATH even after:
- Bun uninstallation
- Environment variable cleanup
- Multiple system restarts

The path `B:\-\BUN\` appears to be a virtual/phantom path created by Bun's compiler that persists in the system.

### Project Response
On January 14, 2026 (commit `67b6fd7`), the project switched from Bun to `pkg` for standalone executables:
```
fix: switch from Bun to pkg for standalone executables

- Bun compilation failed with locale path resolution issues
- pkg properly handles Lighthouse and Chrome Launcher dependencies
```

### Attempted Solutions (All Failed)
1. ❌ Complete Bun uninstallation
2. ❌ PATH environment variable cleanup (User and System)
3. ❌ Registry key removal
4. ❌ Manual deletion of Bun directories
5. ❌ System restart
6. ❌ Fresh JSR installation
7. ❌ npm cache cleanup

### Current Workaround
**None available.** The issue cannot be resolved through:
- Code changes in this repository
- Package dependency updates
- Installation method changes

This is a **system-level issue** that requires manual intervention at the OS level, but standard cleanup procedures have proven ineffective.

### Impact
- Users cannot use the CLI after JSR installation
- The package is effectively broken for affected systems
- No reliable workaround exists

### Recommendation
**Do not use this package if you have ever:**
- Installed Bun on your system
- Run `scripts/build-standalone-bun.sh`
- Created Bun-compiled executables

The Bun executable creates persistent system-level artifacts that cannot be removed through standard means.

---

## Package Dependency Issues

### Circular Dependency (Fixed in v1.0.9)
**Status:** ✅ RESOLVED

The package.json contained a circular dependency in v1.0.8:
```json
"@signaler/cli": "npm:@jsr/signaler__cli@^1.0.8"
```

This was removed in v1.0.9, and the pnpm-lock.yaml was regenerated.

---

## Installation Issues

### JSR Installation
**Status:** ⚠️ PARTIALLY WORKING

Installation via JSR works for users who have never installed Bun:
```bash
npx jsr add -g @signaler/cli
```

However, users with Bun history encounter the runtime error described above.

### npm Installation
**Status:** ❌ NOT SUPPORTED

The package is not published to npm. Only JSR installation is supported.

---

## Build Issues

### Bun Compilation
**Status:** ❌ DEPRECATED

The `scripts/build-standalone-bun.sh` script is deprecated and should not be used. It creates broken executables with hardcoded paths.

**Do not run:**
```bash
./scripts/build-standalone-bun.sh
```

### pkg Compilation
**Status:** ✅ WORKING

The project now uses `pkg` for standalone executables:
```bash
./scripts/build-with-pkg.sh
```

This method works correctly and does not have path resolution issues.

---

## Testing Issues

### CI/CD
**Status:** ✅ WORKING

GitHub Actions CI passes with:
- `pnpm install --frozen-lockfile`
- `pnpm run build`
- `pnpm test`

All 27 tests pass successfully.

### Local Testing
**Status:** ⚠️ DEPENDS ON SYSTEM

Local testing works on systems without Bun history. Systems with Bun artifacts encounter the runtime error.

---

## Documentation

### Redundant Documentation Removed
The following redundant documentation files have been removed:
- All Bun removal guides (ineffective)
- All diagnostic scripts (unable to fix the issue)
- All installation troubleshooting guides (no working solution)
- All publish/release notes (consolidated into CHANGELOG.md)

### Remaining Documentation
- `README.md` - Main documentation
- `CHANGELOG.md` - Version history
- `KNOWN-ISSUES.md` - This file
- `ROOT-CAUSE-IDENTIFIED.md` - Technical analysis of the Bun issue

---

## Recommendations for Users

### If You Have Never Installed Bun
✅ You can safely install and use this package:
```bash
npx jsr add -g @signaler/cli
signaler --version
```

### If You Have Bun History
❌ **Do not install this package.** The runtime error cannot be resolved.

Alternative options:
1. Use a different machine without Bun history
2. Use a virtual machine or container
3. Wait for a complete system reinstall

### For Developers
- Do not use `scripts/build-standalone-bun.sh`
- Use `scripts/build-with-pkg.sh` for standalone builds
- The package itself is clean (v1.0.9+)
- The issue is environmental, not code-related

---

## Future Considerations

### Potential Solutions (Unverified)
1. Complete Windows reinstall (nuclear option)
2. Advanced registry cleanup tools
3. Low-level PATH manipulation
4. Boot-time cleanup scripts

None of these have been tested or verified.

### Package Improvements
- Consider adding runtime detection for Bun artifacts
- Add clear warning in installation documentation
- Investigate alternative distribution methods

---

**Last Updated:** January 15, 2026  
**Package Version:** 1.0.9  
**Status:** Critical issue unresolved
