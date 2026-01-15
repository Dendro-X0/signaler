# Standalone Installation (No npm Required)

## Quick Install

### Windows
```powershell
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.ps1 -OutFile install.ps1
.\install.ps1
```

This downloads a pre-built `.exe` file. **No Node.js or npm required.**

### Manual Download

1. Go to [Releases](https://github.com/Dendro-X0/signaler/releases/latest)
2. Download `signaler-win.exe` (or your platform)
3. Put it somewhere in your PATH
4. Run `signaler wizard`

## For Developers (Local Build)

If you want to build from source:

```bash
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install
pnpm run build
pnpm link
```

Now `signaler` command works globally.

## Building Standalone Executables

To create standalone executables:

```bash
pnpm install
pnpm run package:all
```

Executables will be in `release-assets/`:
- `signaler-win.exe` - Windows
- `signaler-linux` - Linux
- `signaler-macos` - macOS

## Why Standalone?

- ✅ No npm registry issues
- ✅ No Node.js required for end users
- ✅ Single executable file
- ✅ Works immediately
- ✅ No installation complexity

## Usage

After installation:

```bash
# Create configuration
signaler wizard

# Run audit
signaler audit

# See all commands
signaler --help
```

## Updates

To update:

```powershell
# Re-run installer
iwr https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/install-standalone.ps1 -OutFile install.ps1
.\install.ps1
```

Or download the latest release manually.
