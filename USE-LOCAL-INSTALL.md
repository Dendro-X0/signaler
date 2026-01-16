# Using Local Installation

## Good News!

The local installation is working perfectly and shows the correct version:
```
Signaler v1.0.12 ✅
```

## Quick Solution: Add to PATH

### Option 1: Temporary (Current Session Only)

**In Git Bash:**
```bash
export PATH="$PATH:$(pwd)/node_modules/.bin"
signaler
```

**In PowerShell:**
```powershell
$env:PATH += ";$(Get-Location)\node_modules\.bin"
signaler
```

### Option 2: Permanent Alias

**In Git Bash:**
Add to your `~/.bashrc`:
```bash
alias signaler='/e/Web\ Project/experimental-workspace/apex-auditor-workspace/signaler/node_modules/.bin/signaler'
```

Then reload:
```bash
source ~/.bashrc
signaler
```

**In PowerShell:**
Add to your PowerShell profile:
```powershell
# Find your profile location
$PROFILE

# Edit it (creates if doesn't exist)
notepad $PROFILE

# Add this line:
function signaler { & "E:\Web Project\experimental-workspace\apex-auditor-workspace\signaler\node_modules\.bin\signaler.cmd" $args }
```

Then reload:
```powershell
. $PROFILE
signaler
```

### Option 3: Use npx (No Installation Needed)

```bash
npx @jsr/signaler__cli@1.0.12 wizard
npx @jsr/signaler__cli@1.0.12 audit
```

### Option 4: Run Directly

```bash
# From the signaler directory
./node_modules/.bin/signaler wizard

# From anywhere
/e/Web\ Project/experimental-workspace/apex-auditor-workspace/signaler/node_modules/.bin/signaler wizard
```

## Recommended: Option 2 (Permanent Alias)

This is the cleanest solution:
1. Works in all terminals after setup
2. Always uses the latest local version
3. No global installation conflicts

### Setup for Git Bash

```bash
# Add alias to .bashrc
echo 'alias signaler="/e/Web\ Project/experimental-workspace/apex-auditor-workspace/signaler/node_modules/.bin/signaler"' >> ~/.bashrc

# Reload
source ~/.bashrc

# Test
signaler
```

### Setup for PowerShell

```powershell
# Create/edit profile
if (!(Test-Path $PROFILE)) { New-Item -Path $PROFILE -ItemType File -Force }
Add-Content $PROFILE 'function signaler { & "E:\Web Project\experimental-workspace\apex-auditor-workspace\signaler\node_modules\.bin\signaler.cmd" $args }'

# Reload
. $PROFILE

# Test
signaler
```

## Why This Works Better

1. **No global installation issues** - Uses local version
2. **Always up-to-date** - When you update the package, alias still works
3. **No PATH conflicts** - Doesn't interfere with other installations
4. **Works everywhere** - Once alias is set, works in all new terminals

## Verification

After setting up the alias, you should see:

```bash
$ signaler
┌──────────────────────────────────────────────────────────────┐
│ Signaler v1.0.12                                             │
│ ──────────────────────────────────────────────────────────── │
│ Performance + metrics assistant (measure-first, Lighthouse   │
│ optional)                                                    │
│ ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

✅ Name: "Signaler" (not "ApexAuditor")  
✅ Version: "v1.0.12" (not "v1.0.0")

---

**Recommended:** Set up the permanent alias (Option 2)  
**Quick test:** Use Option 4 to run directly  
**No install:** Use Option 3 with npx
