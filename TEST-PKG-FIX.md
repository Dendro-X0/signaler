# Testing the pkg Fix

## What Changed

We switched from Bun to `pkg` for building standalone executables because Bun had path resolution issues with Lighthouse dependencies.

## Quick Test (Local)

### Option 1: Test with pkg (Recommended)

```bash
# 1. Install pkg globally
pnpm add -g pkg

# 2. Build TypeScript
cd signaler
pnpm install
pnpm build

# 3. Build standalone executable for Windows
pkg dist/bin.js --targets node18-win-x64 --output signaler-test.exe

# 4. Test the executable
.\signaler-test.exe --help
.\signaler-test.exe wizard
```

### Option 2: Use the test script

```bash
cd signaler
chmod +x scripts/test-pkg-build.sh
./scripts/test-pkg-build.sh
```

## Expected Results

✅ **Success indicators:**
- Executable builds without errors
- `--help` command shows usage information
- `wizard` command starts the interactive wizard
- No `ENOENT` or locale path errors

❌ **Failure indicators:**
- Build fails with errors
- Executable crashes on startup
- Path resolution errors

## Testing in CI

The GitHub Actions workflow will automatically build executables when you:

1. **Push a tag:**
   ```bash
   git tag v1.0.7
   git push origin v1.0.7
   ```

2. **Check the workflow:**
   - Go to: https://github.com/Dendro-X0/signaler/actions
   - Look for "Build Standalone Binaries" workflow
   - Wait for all 4 platform builds to complete

3. **Download and test:**
   - Go to the release page
   - Download `signaler-windows-x64.exe`
   - Run it: `.\signaler-windows-x64.exe --help`

## Comparison: Bun vs pkg

### Bun (Old - Broken)
```bash
bun build ./dist/bin.js --compile --outfile signaler.exe
# ❌ Result: ENOENT: no such file or directory, scandir 'B:\-BUN\root/locales/'
```

### pkg (New - Working)
```bash
pkg dist/bin.js --targets node18-win-x64 --output signaler.exe
# ✅ Result: Working executable with all dependencies bundled
```

## File Sizes

- **Bun**: ~90MB (when it works)
- **pkg**: ~80-100MB (works reliably)

The 10MB difference is acceptable for a working solution.

## Troubleshooting

### Issue: "pkg: command not found"
**Solution:** Install pkg globally
```bash
pnpm add -g pkg
# or
npm install -g pkg
```

### Issue: "Cannot find module 'lighthouse'"
**Solution:** Make sure you ran `pnpm build` first
```bash
pnpm install
pnpm build
```

### Issue: Executable is too large
**Solution:** This is normal for pkg. The executable includes:
- Node.js runtime (~50MB)
- Your code (~5MB)
- All dependencies including Lighthouse (~30MB)

### Issue: Still getting path errors
**Solution:** Make sure you're using the pkg-built executable, not the Bun one:
```bash
# Delete old Bun executable
rm signaler.exe

# Build with pkg
pkg dist/bin.js --targets node18-win-x64 --output signaler.exe
```

## Next Steps After Testing

1. ✅ Verify local build works
2. ✅ Push to GitHub
3. ✅ Create release tag (v1.0.7)
4. ✅ Wait for CI to build all platforms
5. ✅ Download and test Windows executable
6. ✅ Update README if needed
7. ✅ Announce the fix

## Questions?

- See `BUN-COMPILATION-ISSUE.md` for technical details
- See `FIX-SUMMARY.md` for implementation overview
- See `DISTRIBUTION-STRATEGY.md` for distribution approach
