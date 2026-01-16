# Immediate Workaround: Run CLI Directly

## Problem
- JSR installation fails due to Bun runtime error
- npm installation not available
- Standalone binaries removed
- System has persistent Bun artifacts that cannot be removed

## Solution: Run Directly from Source

### Step 1: Navigate to the signaler directory
```bash
cd signaler
```

### Step 2: Build the project (if not already built)
```bash
pnpm install
pnpm run build
```

### Step 3: Run directly with Node.js

**Option A: Using node directly**
```bash
# From signaler directory
node dist/bin.js wizard
node dist/bin.js audit
node dist/bin.js --help
```

**Option B: Create a shell alias (Bash)**
```bash
# Add to ~/.bashrc or ~/.bash_profile
alias signaler='node /e/Web\ Project/experimental-workspace/apex-auditor-workspace/signaler/dist/bin.js'

# Reload shell
source ~/.bashrc

# Use anywhere
cd ~/my-project
signaler wizard
```

**Option C: Create a PowerShell alias**
```powershell
# Add to $PROFILE
function signaler { node "E:\Web Project\experimental-workspace\apex-auditor-workspace\signaler\dist\bin.js" $args }

# Reload profile
. $PROFILE

# Use anywhere
cd C:\my-project
signaler wizard
```

**Option D: Create a wrapper script**

Create `signaler/run.sh`:
```bash
#!/bin/bash
node "$(dirname "$0")/dist/bin.js" "$@"
```

Make it executable:
```bash
chmod +x run.sh
```

Use it:
```bash
./run.sh wizard
./run.sh audit
```

### Step 4: Use in your project

**From your project directory:**
```bash
# Absolute path
node /e/Web\ Project/experimental-workspace/apex-auditor-workspace/signaler/dist/bin.js wizard

# Or if you created an alias
signaler wizard
```

## Why This Works

This bypasses ALL installation methods:
- ✅ No npm/JSR installation needed
- ✅ No PATH manipulation needed
- ✅ No Bun executable involved
- ✅ Direct Node.js execution
- ✅ Works immediately

## Context of What Happened

### Timeline of Issues

1. **Original Problem (January 14, 2026)**
   - Someone ran `scripts/build-standalone-bun.sh`
   - This created a Bun-compiled executable at `B:\-\BUN\root\signaler-windows-x64.exe`
   - Bun's compiler has a bug with Lighthouse dependencies
   - The executable has hardcoded paths that don't exist

2. **First Attempted Fix**
   - Tried to fix circular dependency in package.json
   - Published v1.0.9 to JSR
   - Assumed this would solve the issue

3. **Reality**
   - The Bun executable is in your system PATH
   - When you type `signaler`, Windows executes the Bun executable
   - The npm/JSR version never gets a chance to run
   - Even JSR installation triggers the Bun executable somehow

4. **Cleanup Attempts**
   - Removed 40+ redundant files
   - Removed all Bun/pkg build scripts
   - Removed circular dependencies
   - Regenerated lockfiles

5. **Current State**
   - The package itself is clean (v1.0.9)
   - But your system has persistent Bun artifacts
   - Standard cleanup procedures don't work
   - The Bun executable path `B:\-\BUN\root\` persists

### Why Standard Solutions Failed

1. **Bun Uninstallation**: Doesn't remove the compiled executable
2. **PATH Cleanup**: The Bun path persists or gets re-added
3. **JSR Installation**: Still triggers the Bun executable somehow
4. **npm Installation**: Not available (package only on JSR)

### The Real Problem

The `B:\-\BUN\root\signaler-windows-x64.exe` executable is:
- In your system PATH (first priority)
- Cannot be removed by standard means
- Gets executed before any npm/JSR installation
- Has hardcoded paths that don't exist

This is a **system-level issue** that cannot be fixed by:
- Code changes
- Package updates
- Installation method changes
- Standard cleanup procedures

## Recommended Approach

**For immediate use:**
1. Use the direct Node.js execution method above
2. Create an alias or wrapper script
3. This bypasses all installation issues

**For long-term:**
1. Use a different machine without Bun history
2. Use a virtual machine or container
3. Wait for a complete system reinstall
4. Or continue using the direct execution method

## Quick Reference

**Run from signaler directory:**
```bash
node dist/bin.js wizard
node dist/bin.js audit --config /path/to/apex.config.json
```

**Run from any directory (with absolute path):**
```bash
node /e/Web\ Project/experimental-workspace/apex-auditor-workspace/signaler/dist/bin.js wizard
```

**With alias (after setup):**
```bash
signaler wizard
signaler audit
```

This is the most reliable method given your system's state.
