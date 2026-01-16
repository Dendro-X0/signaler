# Quick Start: Signaler v1.0.9

## What's Fixed

Version 1.0.9 fixes the critical **circular dependency bug** that was causing:
```
ENOENT: no such file or directory, scandir 'B:\-\BUN\root\locales/'
```

## Installation (Fresh Install)

```bash
npx jsr add -g @signaler/cli
```

Or with deno:
```bash
deno install -Agf jsr:@signaler/cli
```

## Upgrade from v1.0.8

If you already have v1.0.8 installed:

```bash
# 1. Uninstall old version
npm uninstall -g @jsr/signaler__cli
npm uninstall -g @signaler/cli

# 2. Clear cache
npm cache clean --force

# 3. Install fixed version
npx jsr add -g @signaler/cli

# 4. Verify it works
signaler --version
```

## Test the Fix

Run the test script to verify everything works:

```bash
pwsh ./test-v1.0.9-fix.ps1
```

Expected output:
```
=== Testing Signaler v1.0.9 Fix ===

Step 1: Checking current installation...
  ✓ Found signaler at: C:\Users\...\npm\signaler.cmd

Step 2: Testing signaler execution...
  ✓ Signaler executed successfully

Step 3: Checking for Bun-related errors...
  ✓ No Bun-related errors detected

Step 4: Verifying package version...
  ✓ Installed version: 1.0.9
  ✓ Version is 1.0.9 or higher (fixed version)

=== Test Summary ===
✓ All tests passed! Signaler v1.0.9 is working correctly.
```

## Usage

After installation, you can use all signaler commands:

```bash
# Interactive wizard
signaler wizard

# Quick audit
signaler quick --config apex.config.json

# Full audit
signaler audit

# Bundle analysis
signaler bundle

# Health check
signaler health
```

## Documentation

- **Release Notes:** `V1.0.9-RELEASE-NOTES.md`
- **Root Cause Analysis:** `ROOT-CAUSE-AND-FIX.md`
- **Full Changelog:** `CHANGELOG.md`
- **Main README:** `README.md`

## Links

- **JSR Package:** https://jsr.io/@signaler/cli@1.0.9
- **GitHub:** https://github.com/Dendro-X0/signaler
- **Issues:** https://github.com/Dendro-X0/signaler/issues

## Troubleshooting

If you still see errors after upgrading:

1. **Check which signaler is being used:**
   ```bash
   where signaler  # Windows
   which signaler  # Linux/Mac
   ```

2. **Verify it's the npm version:**
   Should show: `C:\Users\...\AppData\Roaming\npm\signaler.cmd`
   
   If it shows something else (like a Bun path), you have multiple installations.

3. **Remove all installations and reinstall:**
   ```bash
   npm uninstall -g @signaler/cli
   npm uninstall -g @jsr/signaler__cli
   npm cache clean --force
   npx jsr add -g @signaler/cli
   ```

4. **Check PATH for Bun remnants:**
   ```bash
   echo $env:PATH | Select-String -Pattern "BUN"
   ```
   
   If found, remove those entries from your PATH environment variable.

## Support

If you encounter any issues:

1. Run the test script: `pwsh ./test-v1.0.9-fix.ps1`
2. Check the documentation files listed above
3. Open an issue on GitHub with the test script output

## What Changed

The fix was simple but critical:

**Before (v1.0.8 - BROKEN):**
```json
{
  "dependencies": {
    "@signaler/cli": "npm:@jsr/signaler__cli@^1.0.8"  // Circular!
  }
}
```

**After (v1.0.9 - FIXED):**
```json
{
  "dependencies": {
    "ansi-colors": "^4.1.3",
    "lighthouse": "^13.0.1"
    // No self-reference
  }
}
```

This circular dependency was causing the module resolver to generate phantom paths, leading to the Bun error even when Bun wasn't installed.

---

**Status:** ✅ Published and ready to use  
**Version:** 1.0.9  
**Release Date:** January 15, 2026
