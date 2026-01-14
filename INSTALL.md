# Installation Guide

Since Signaler is not published to npm registry, you can install it directly from the repository.

## Method 1: Local Installation (Recommended)

### Prerequisites
- Node.js 18+ installed
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

4. **Link globally (makes `signaler` command available):**
```bash
pnpm link --global
```

5. **Verify installation:**
```bash
signaler --help
```

### Usage

After installation, you can use `signaler` from any directory:

```bash
signaler wizard
signaler audit
signaler shell
```

### Uninstall

To uninstall:
```bash
pnpm uninstall -g @auditorix/signaler
```

## Method 2: Run Directly (No Installation)

If you don't want to install globally, you can run it directly from the repository:

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

## Method 3: Create Alias (Unix/Linux/macOS)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias signaler='node /path/to/signaler/dist/bin.js'
```

## Method 4: Add to PATH (Windows)

1. Build the project as shown in Method 1
2. Create a batch file `signaler.cmd` in a directory that's in your PATH:

```batch
@echo off
node "C:\path\to\signaler\dist\bin.js" %*
```

## Troubleshooting

### "Cannot find module" errors
Make sure you've run `pnpm install` and `pnpm build` in the signaler directory.

### "signaler: command not found" after pnpm link
- Restart your terminal
- Check that pnpm's global bin directory is in your PATH
- Run `pnpm bin -g` to see where global packages are installed

### Permission errors on Unix/Linux/macOS
You may need to make the bin file executable:
```bash
chmod +x dist/bin.js
```

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
