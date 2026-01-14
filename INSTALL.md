# Installation Guide

Signaler is not published to npm registry. You can install it using one of these methods:

## Method 1: One-Line Installer (Recommended) ⭐

This method downloads a pre-built standalone executable from GitHub Releases. **No Node.js, no npm, no dependencies required!**

### Unix/Linux/macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash
```

Or with custom install location:
```bash
INSTALL_DIR=~/bin curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.ps1 -UseBasicParsing | iex
```

> **Note:** If you get a PowerShell execution policy error, see [INSTALL-WINDOWS.md](INSTALL-WINDOWS.md) for a simple manual installation method.

Or with custom install location:
```powershell
$env:SIGNALER_INSTALL_DIR="C:\signaler"; iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.ps1 -UseBasicParsing | iex
```

### After Installation

Restart your terminal and run:
```bash
signaler wizard
signaler audit
```

Or use the full path:
```bash
# Unix/Linux/macOS
~/.local/bin/signaler wizard

# Windows
%LOCALAPPDATA%\signaler\signaler.exe wizard
```

### What Gets Installed

- A single standalone executable (~90MB)
- Includes Bun runtime + all dependencies
- No Node.js required
- No npm required
- Just download and run!

## Method 2: Direct Download (Manual)

Download the pre-built binary directly from GitHub Releases:

### Windows
```powershell
iwr https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-windows-x64.exe -OutFile signaler.exe
.\signaler.exe --help
```

### macOS (Intel)
```bash
curl -L https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-macos-x64 -o signaler
chmod +x signaler
./signaler --help
```

### macOS (Apple Silicon)
```bash
curl -L https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-macos-arm64 -o signaler
chmod +x signaler
./signaler --help
```

### Linux
```bash
curl -L https://github.com/Dendro-X0/signaler/releases/latest/download/signaler-linux-x64 -o signaler
chmod +x signaler
./signaler --help
```

Then move the binary to a directory in your PATH:
```bash
# Unix/Linux/macOS
sudo mv signaler /usr/local/bin/

# Windows (as Administrator)
move signaler.exe C:\Windows\System32\
```

## Method 3: Build from Source

### Prerequisites
- Node.js 18+ installed
- Git installed
- pnpm installed (`npm install -g pnpm`)

### Steps

1. **Clone the repository:**
```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Build the project:**
```bash
pnpm build
```

4. **Run directly:**
```bash
node dist/bin.js wizard
node dist/bin.js audit
```

### Add to PATH (Optional)

Create a wrapper script and add to PATH:

**Unix/Linux/macOS:**
```bash
echo '#!/bin/bash' > ~/bin/signaler
echo 'node /path/to/signaler/dist/bin.js "$@"' >> ~/bin/signaler
chmod +x ~/bin/signaler
```

**Windows:**
Create `signaler.bat`:
```batch
@echo off
node C:\path\to\signaler\dist\bin.js %*
```
Add the directory containing `signaler.bat` to your PATH.

## Method 4: Run from Source (No Installation)

If you don't want to install, run directly from the repository:

```bash
# Clone and setup (one time)
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install
pnpm build

# Run commands
node dist/bin.js --help
node dist/bin.js wizard
node dist/bin.js audit
```

## Troubleshooting

### "Cannot find module" errors
Make sure you've run `pnpm install` and `pnpm build` in the signaler directory.

### "signaler: command not found" after installation
- Restart your terminal (required for PATH changes to take effect)
- Check that the install directory is in your PATH: `echo $PATH` (Unix) or `echo %PATH%` (Windows)
- Use the full path to the binary: `~/.local/bin/signaler` (Unix) or `%LOCALAPPDATA%\signaler\signaler.exe` (Windows)

### Permission errors on Unix/Linux/macOS
The binary should be executable after installation. If not:
```bash
chmod +x ~/.local/bin/signaler
```

### Node.js version errors
Ensure you have Node.js 18+ installed:
```bash
node --version
```

## Updating

To update to the latest version:

### If installed via one-line installer
Run the installer again - it will download and replace the old version:
```bash
# Unix/Linux/macOS
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.sh | bash

# Windows
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/install.ps1 -UseBasicParsing | iex
```

### If manually downloaded
Download the latest binary from GitHub Releases and replace the old one.

### If built from source
```bash
cd signaler
git pull origin main
pnpm install
pnpm build
```

## Uninstalling

### If installed via one-line installer

**Unix/Linux/macOS:**
```bash
rm ~/.local/bin/signaler
# If you manually edited PATH, remove the entry from ~/.bashrc or ~/.zshrc
```

**Windows:**
```powershell
Remove-Item -Recurse -Force $env:LOCALAPPDATA\signaler
# Remove from PATH in Environment Variables (if added)
```

### If manually downloaded
Simply delete the binary file.

### If built from source
Delete the cloned repository directory.

## Development

To work on Signaler:

```bash
# Clone and setup
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install

# Run in development mode (auto-rebuild)
pnpm dev wizard
pnpm dev audit

# Build for production
pnpm build

# Run tests
pnpm test
```
