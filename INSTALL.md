# Installation Guide

Signaler is not published to npm registry. You can install it using one of these methods:

## Method 1: One-Line Installer (Recommended)

This method downloads, builds, and installs Signaler automatically.

### Unix/Linux/macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.sh | bash
```

Or with custom install location:
```bash
SIGNALER_INSTALL_DIR=~/bin/signaler curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.sh | bash
```

### Windows (PowerShell)

```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.ps1 | iex
```

Or with custom install location:
```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.ps1 -OutFile install.ps1
.\install.ps1 -InstallDir "C:\signaler"
```

### After Installation

Restart your terminal and run:
```bash
signaler-cli wizard
signaler-cli audit
```

Or use the full path:
```bash
# Unix/Linux/macOS
~/.local/bin/signaler/signaler doctor

# Windows
%LOCALAPPDATA%\signaler\signaler.exe doctor
```

## Method 2: Manual Installation

### Prerequisites
- Node.js 18+ installed
- Git installed
- (Optional) Rust/Cargo for faster launcher

### Steps

1. **Clone the repository:**
```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
```

2. **Install dependencies:**
```bash
pnpm install
# or: npm install
```

3. **Build the project:**
```bash
pnpm build
# or: npm run build
```

4. **Build Rust launcher (optional but recommended):**
```bash
cd launcher
cargo build --release
cd ..
```

5. **Run directly:**
```bash
# With Rust launcher
./launcher/target/release/signaler engine run wizard

# Without Rust launcher
node dist/bin.js wizard
```

### Add to PATH (Optional)

**Unix/Linux/macOS:**
Add to `~/.bashrc` or `~/.zshrc`:
```bash
export PATH="/path/to/signaler/launcher/target/release:$PATH"
alias signaler='signaler engine run'
```

**Windows:**
Add `C:\path\to\signaler\launcher\target\release` to your PATH environment variable.

## Method 3: Standalone Package

Build a portable package that can be copied to any machine:

```bash
cd signaler
./scripts/create-standalone.sh
```

This creates `standalone-dist/signaler-standalone.zip` containing:
- Rust launcher binary
- Node.js engine (dist/)
- All dependencies (node_modules/)
- Helper scripts

Extract the zip and add the folder to your PATH.

## Method 4: Run Directly (No Installation)

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
- Restart your terminal
- Check that the install directory is in your PATH
- Use the full path to the binary

### Permission errors on Unix/Linux/macOS
You may need to make the bin file executable:
```bash
chmod +x ~/.local/bin/signaler/signaler
```

### Node.js version errors
Ensure you have Node.js 18+ installed:
```bash
node --version
```

## Updating

To update to the latest version:

### If installed via one-line installer
Run the installer again - it will replace the old version.

### If manually installed
```bash
cd signaler
git pull origin main
pnpm install
pnpm build
cd launcher && cargo build --release && cd ..
```

## Uninstalling

### If installed via one-line installer

**Unix/Linux/macOS:**
```bash
rm -rf ~/.local/bin/signaler
# Remove from PATH in ~/.bashrc or ~/.zshrc
```

**Windows:**
```powershell
Remove-Item -Recurse -Force $env:LOCALAPPDATA\signaler
# Remove from PATH in Environment Variables
```

### If manually installed
Simply delete the cloned repository directory.

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
