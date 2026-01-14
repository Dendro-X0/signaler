# How to Check Build Status

## 1. Check GitHub Actions

Visit: https://github.com/Dendro-X0/signaler/actions

Look for the workflow run named "Build Standalone Binaries" triggered by tag `v1.0.6`

### Expected Timeline:
- **0-2 min:** Workflow starts, jobs queued
- **2-5 min:** Dependencies installed, TypeScript built
- **5-10 min:** Bun compiling standalone executables
- **10-12 min:** Artifacts uploaded
- **12-15 min:** Release created with all binaries

### What to Look For:
- ✅ 4 build jobs (Windows, Linux, macOS x64, macOS ARM64)
- ✅ 1 release job
- ✅ All jobs show green checkmarks
- ✅ No red X marks (failures)

## 2. Check GitHub Release

Visit: https://github.com/Dendro-X0/signaler/releases

Look for release `v1.0.6`

### Expected Files:
- `signaler-windows-x64.exe` (~90MB)
- `signaler-windows-x64.exe.sha256`
- `signaler-linux-x64` (~90MB)
- `signaler-linux-x64.sha256`
- `signaler-macos-x64` (~90MB)
- `signaler-macos-x64.sha256`
- `signaler-macos-arm64` (~90MB)
- `signaler-macos-arm64.sha256`

### Release Notes Should Include:
- Installation instructions for each platform
- Feature list (standalone, no Node.js, etc.)
- Usage examples

## 3. Test Installation (After Build Completes)

### Windows:
```powershell
# One-line installer
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.ps1 -UseBasicParsing | iex

# Or manual download
iwr https://github.com/Dendro-X0/signaler/releases/download/v1.0.6/signaler-windows-x64.exe -OutFile signaler.exe
.\signaler.exe --help
```

### macOS/Linux:
```bash
# One-line installer
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash

# Or manual download (Linux)
curl -L https://github.com/Dendro-X0/signaler/releases/download/v1.0.6/signaler-linux-x64 -o signaler
chmod +x signaler
./signaler --help
```

## 4. Verify Functionality

After installation:
```bash
signaler --help
signaler wizard
signaler audit
```

## Troubleshooting

### If Build Fails:

1. **Check the logs:**
   - Click on the failed job in GitHub Actions
   - Read the error message
   - Common issues: missing dependencies, TypeScript errors, Bun compilation errors

2. **Fix and retry:**
   - Fix the issue in code
   - Commit and push
   - Delete and recreate tag:
     ```bash
     git tag -d v1.0.6
     git push origin :refs/tags/v1.0.6
     git tag v1.0.6
     git push origin v1.0.6
     ```

### If Installer Fails:

1. **Check release exists:**
   - Visit https://github.com/Dendro-X0/signaler/releases/tag/v1.0.6
   - Verify binaries are uploaded

2. **Try manual download:**
   - Download binary directly from release page
   - Test if it runs: `./signaler --help`

3. **Check PATH:**
   - Restart terminal after installation
   - Verify install directory is in PATH

## Quick Commands

```bash
# Check if workflow is running
# Visit: https://github.com/Dendro-X0/signaler/actions

# Check if release exists
# Visit: https://github.com/Dendro-X0/signaler/releases/tag/v1.0.6

# Test installer (after build completes)
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash

# Test binary directly
curl -L https://github.com/Dendro-X0/signaler/releases/download/v1.0.6/signaler-linux-x64 -o signaler
chmod +x signaler
./signaler --help
```

## Success Indicators

✅ All GitHub Actions jobs completed successfully  
✅ Release v1.0.6 exists with 8 files (4 binaries + 4 checksums)  
✅ One-line installer downloads and installs successfully  
✅ `signaler --help` shows help text  
✅ `signaler wizard` runs without errors  
✅ No Node.js or npm required  

---

**Current Status:** Tag `v1.0.6` pushed, waiting for GitHub Actions to build

**Next Step:** Check https://github.com/Dendro-X0/signaler/actions in 2-3 minutes
