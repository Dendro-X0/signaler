# Known Issues

## Critical: Bun Runtime Error (RESOLVED)

### Issue Description
When running `signaler` after installation from JSR, users encountered:
```
ENOENT: no such file or directory, scandir 'B:\-\BUN\root\locales/'
at B:\-\BUN\root\signaler-windows-x64.exe 284432:40
```

### Status
**✅ RESOLVED** - January 15, 2026

### Root Cause (Identified)
The error was NOT caused by Bun being installed on the system. It was caused by an **old Bun-compiled executable** that was installed on January 14, 2026 at:
```
C:\Users\Administrator\AppData\Local\Programs\signaler\signaler.exe
```

This 133MB executable was created by running `scripts/build-standalone-bun.sh` and was installed to the system PATH, taking priority over the JSR installation.

### Why Standard Cleanup Failed
All initial cleanup attempts focused on:
- ❌ Removing Bun itself (already uninstalled)
- ❌ Cleaning `B:\-\BUN\` paths (virtual path inside the executable)
- ❌ Removing Bun from PATH (not the actual issue)

The real problem was the **installed executable**, not Bun itself.

### The Solution
Delete the old installation directory:
```powershell
Remove-Item "C:\Users\Administrator\AppData\Local\Programs\signaler" -Recurse -Force
```

Then restart the terminal for PATH changes to take effect.

### Verification
After deletion and terminal restart:
```bash
where.exe signaler
# Should show only: C:\Users\Administrator\AppData\Local\signaler\bin\signaler.cmd

signaler --version
# Should work without Bun errors
```

### Key Insight
The error message `B:\-\BUN\root\locales/` was misleading - it's a hardcoded path **inside** the old Bun executable, not a real system path. The executable tried to access this non-existent path, causing the error.

### Lessons Learned
1. Bun's `--compile` flag creates executables with hardcoded virtual paths
2. These executables can persist in PATH even after Bun is uninstalled
3. Multiple installations can conflict based on PATH priority
4. The solution was simple: delete the old executable

### Current Status
- ✅ Old Bun executable deleted
- ✅ Only JSR version remains in PATH
- ✅ Package is fully functional
- ✅ No Bun dependencies or artifacts remain

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
**Status:** ✅ WORKING

Installation via JSR works correctly:
```bash
npx jsr add -g @signaler/cli
```

If you previously had the Bun runtime error, ensure the old executable at `C:\Users\Administrator\AppData\Local\Programs\signaler\` has been deleted and restart your terminal.

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
**Status:** ✅ WORKING

Local testing works correctly after removing any old Bun-compiled executables.

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

### Fresh Installation
✅ You can safely install and use this package:
```bash
npx jsr add -g @signaler/cli
signaler --version
```

### If You Previously Had the Bun Error
✅ After deleting the old executable at `C:\Users\Administrator\AppData\Local\Programs\signaler\`:
1. Restart your terminal
2. Verify with `where.exe signaler` (should show only JSR installation)
3. Test with `signaler --version`

### For Developers
- Do not use `scripts/build-standalone-bun.sh` (deprecated)
- Use JSR as the primary distribution method
- The package is clean and fully functional (v1.0.9+)

---

## Future Considerations

### Package Improvements
- ✅ Switched to JSR as primary distribution method
- ✅ Removed all Bun-related build scripts
- ✅ Documented the root cause for future reference
- Consider adding installation verification script
- Consider adding pre-installation cleanup script

---

**Last Updated:** January 15, 2026  
**Package Version:** 1.0.9  
**Status:** All critical issues resolved
