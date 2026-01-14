# Windows Installation Guide

If you're having PowerShell execution policy issues, use this manual installation method.

## Simple Manual Installation

### Step 1: Download and Extract

1. Download the repository as ZIP:
   - Go to: https://github.com/Dendro-X0/signaler
   - Click the green "Code" button
   - Click "Download ZIP"

2. Extract the ZIP to a location like `C:\signaler`

### Step 2: Build

Open PowerShell or Command Prompt in the `C:\signaler` directory and run:

```powershell
# Install dependencies
npm install

# Build the project
npm run build
```

### Step 3: Test

Test that it works:

```powershell
node dist\bin.js --help
```

You should see the help output.

### Step 4: Create a Shortcut (Optional)

Create a batch file `signaler.cmd` in a directory that's in your PATH (like `C:\Windows\System32` or create `C:\bin` and add it to PATH):

```batch
@echo off
node "C:\signaler\dist\bin.js" %*
```

Now you can run `signaler` from anywhere:

```powershell
signaler wizard
signaler audit
```

## Alternative: Use Git Clone

If you have Git installed:

```powershell
# Clone the repository
git clone https://github.com/Dendro-X0/signaler.git C:\signaler
cd C:\signaler

# Install and build
npm install
npm run build

# Test
node dist\bin.js --help
```

## Alternative: Build Rust Launcher (Faster)

If you have Rust installed:

```powershell
cd C:\signaler\launcher
cargo build --release
cd ..
```

Then you can use the faster Rust launcher:

```powershell
.\launcher\target\release\signaler.exe engine run wizard
```

Create a batch file `signaler.cmd`:

```batch
@echo off
"C:\signaler\launcher\target\release\signaler.exe" engine run %*
```

## Troubleshooting

### PowerShell Execution Policy Error

If you see "running scripts is disabled", you have two options:

1. **Bypass for current session** (run PowerShell as Administrator):
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   ```

2. **Use Command Prompt instead** - it doesn't have execution policy restrictions

### "npm: command not found"

Install Node.js from https://nodejs.org/

### "Cannot find module" errors

Make sure you ran `npm install` and `npm run build` in the signaler directory.

## Updating

To update to the latest version:

```powershell
cd C:\signaler
git pull origin main
npm install
npm run build
```

Or if you downloaded the ZIP, download a new ZIP and repeat the installation steps.

## Quick Start After Installation

```powershell
# Using node directly
node C:\signaler\dist\bin.js wizard
node C:\signaler\dist\bin.js audit

# Or if you created the batch file
signaler wizard
signaler audit
```
