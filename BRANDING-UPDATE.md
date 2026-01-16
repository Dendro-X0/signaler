# ✅ Branding Update - v1.0.12

## Changes Made

### CLI Name
- **Before:** ApexAuditor CLI
- **After:** Signaler CLI

### Version Display
- **Before:** Hardcoded "v1.0.0"
- **After:** Dynamic version from package.json (currently v1.0.12)

### Interactive Shell Title
- **Before:** "ApexAuditor v1.0.0"
- **After:** "Signaler v1.0.12"

## What Was Changed

### Source Files
1. **src/bin.ts** - Line 176
   - Changed `"ApexAuditor CLI"` to `"Signaler CLI"`

2. **src/shell-cli.ts** - Line 808
   - Changed `ApexAuditor v${version}` to `Signaler v${version}`

### Version Sync
The version is now automatically read from `package.json` via the `readCliVersion()` function in `shell-cli.ts`. This means:
- No more hardcoded versions
- Version always matches the package version
- Automatic sync on every release

## Verification

### Help Text
```bash
$ signaler help
Signaler CLI

Usage:
  signaler wizard
  signaler audit
  ...
```

### Interactive Shell
```bash
$ signaler
┌─────────────────────────────────────────────────────────────┐
│ Signaler v1.0.12                                            │
│                                                             │
│ Performance + metrics assistant (measure-first, Lighthouse │
│ optional)                                                   │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

## Package Information

- **Package Name:** @signaler/cli
- **CLI Display Name:** Signaler CLI
- **Version:** 1.0.12
- **Published:** January 15, 2026
- **JSR URL:** https://jsr.io/@signaler/cli@1.0.12

## Consistency

Everything is now aligned:
- ✅ Package name: @signaler/cli
- ✅ CLI display: Signaler CLI
- ✅ Interactive shell: Signaler v1.0.12
- ✅ Version: Synced from package.json

## Future Updates

When releasing new versions:
1. Update `package.json` version
2. Update `jsr.json` version
3. Build and publish
4. The CLI will automatically display the new version

No need to update any hardcoded version strings!

---

**Status:** ✅ Branding updated and published  
**Version:** 1.0.12  
**Consistency:** Fully aligned across package and CLI
