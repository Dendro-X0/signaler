# Shell Compatibility Guide

## The Issue You Discovered

You installed Signaler using **PowerShell** but your IDE uses **Bash** as the default shell. This causes compatibility issues because:

- PowerShell installer creates `signaler.cmd` (Windows batch file)
- Bash cannot execute `.cmd` files directly
- You need the Unix-style `signaler` script (no extension) for Bash

## Solution: Choose the Right Installer for Your Shell

### If You Use PowerShell (Windows Native)

**Install with:**
```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1 -UseBasicParsing | iex
```

**Run with:**
```powershell
signaler wizard
```

**Creates:** `signaler.cmd` (Windows batch file)

### If You Use Bash/Git Bash (Unix-like on Windows)

**Install with:**
```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.sh | bash
```

**Run with:**
```bash
signaler wizard
```

**Creates:** `signaler` (Unix shell script)

### If You Use Both Shells

**Option 1: Install Both Versions**
```powershell
# In PowerShell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1 -UseBasicParsing | iex
```

```bash
# In Bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.sh | bash
```

**Option 2: Use Portable Package (Recommended)**

Download the portable package which includes both wrapper scripts:
```powershell
# Download v1.0.7 portable package
iwr https://github.com/Dendro-X0/signaler/releases/download/v1.0.7/signaler-portable-windows-x64.zip -OutFile signaler.zip
Expand-Archive signaler.zip -DestinationPath signaler-portable
```

The portable package includes:
- `signaler.cmd` for PowerShell/CMD
- `signaler` for Bash/Git Bash

## Version Mismatch Issue

### Why You See v1.0.0

The installer downloads from the `main` branch and builds it. If you installed before we updated to v1.0.7, you got an older version.

**Check your current version:**
```bash
signaler --version  # or check the shell welcome screen
```

### How to Get v1.0.7

**Option 1: Reinstall from main branch**
```powershell
# Uninstall first
Remove-Item "$env:LOCALAPPDATA\signaler" -Recurse -Force

# Reinstall (gets latest from main)
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/quick-install.ps1 -UseBasicParsing | iex
```

**Option 2: Use v1.0.7 portable package (Recommended)**
```powershell
# Download specific version
iwr https://github.com/Dendro-X0/signaler/releases/download/v1.0.7/signaler-portable-windows-x64.zip -OutFile signaler.zip
Expand-Archive signaler.zip
cd signaler\portable-package

# Works in both PowerShell and Bash!
.\signaler.cmd wizard  # PowerShell
./signaler wizard      # Bash
```

## IDE Terminal Configuration

### If Your IDE Uses Bash by Default

**Option 1: Change IDE terminal to PowerShell**
- VS Code: Settings → Terminal → Default Profile → PowerShell
- WebStorm: Settings → Tools → Terminal → Shell path → `powershell.exe`

**Option 2: Install Bash-compatible version**
```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.sh | bash
```

**Option 3: Use portable package**
- Works with both shells
- Just use the appropriate wrapper script

### If Your IDE Uses PowerShell by Default

No changes needed! The PowerShell installer works perfectly.

## Portable Package: Best Solution

The **portable package** is the best solution for mixed shell environments:

### Advantages
✅ Works with both PowerShell and Bash
✅ Includes both wrapper scripts
✅ Specific version (not "latest from main")
✅ No build step required
✅ Easy to update

### Installation
```powershell
# Download
iwr https://github.com/Dendro-X0/signaler/releases/download/v1.0.7/signaler-portable-windows-x64.zip -OutFile signaler.zip

# Extract
Expand-Archive signaler.zip -DestinationPath signaler-portable

# Add to PATH (optional)
$env:PATH += ";$PWD\signaler-portable\portable-package"

# Use in PowerShell
cd signaler-portable\portable-package
.\signaler.cmd wizard

# Use in Bash
cd signaler-portable/portable-package
./signaler wizard
```

## Quick Reference

| Shell | Installer | Wrapper Script | Command |
|-------|-----------|----------------|---------|
| PowerShell | `quick-install.ps1` | `signaler.cmd` | `signaler wizard` |
| Bash/Git Bash | `install-standalone.sh` | `signaler` | `signaler wizard` |
| Both | Portable package | Both included | Use appropriate script |

## Troubleshooting

### "Command not found" in Bash
**Cause:** Installed with PowerShell installer (creates `.cmd` file)
**Solution:** Install with Bash installer or use portable package

### "Command not found" in PowerShell
**Cause:** Installed with Bash installer (creates Unix script)
**Solution:** Install with PowerShell installer or use portable package

### Wrong version showing
**Cause:** Installed from main branch before version bump
**Solution:** Reinstall or use portable package with specific version

### Works in PowerShell but not IDE
**Cause:** IDE uses different shell (probably Bash)
**Solution:** 
1. Change IDE terminal to PowerShell, OR
2. Install Bash-compatible version, OR
3. Use portable package (works with both)

## Recommendations

### For Development
Use the **portable package** because:
- Works with any shell
- Specific version (reproducible)
- Easy to update
- No build step

### For Production/CI
Use the **portable package** because:
- Consistent across environments
- Version-locked
- No compilation issues

### For Quick Testing
Use the **installer script** matching your shell:
- PowerShell → `quick-install.ps1`
- Bash → `install-standalone.sh`

## Your Specific Situation

Based on your discovery:

1. **You installed with PowerShell** → Created `signaler.cmd`
2. **Your IDE uses Bash** → Cannot run `.cmd` files
3. **Version shows v1.0.0** → Installed before version bump

**Best solution:**
```powershell
# Download v1.0.7 portable package
iwr https://github.com/Dendro-X0/signaler/releases/download/v1.0.7/signaler-portable-windows-x64.zip -OutFile signaler.zip
Expand-Archive signaler.zip

# Now works in both shells!
cd signaler\portable-package
.\signaler.cmd wizard  # PowerShell
./signaler wizard      # Bash (in IDE)
```

This gives you:
✅ v1.0.7 (correct version)
✅ Works in PowerShell
✅ Works in Bash/IDE
✅ No reinstallation needed
