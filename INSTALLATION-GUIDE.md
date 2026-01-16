# Installation Guide

## Quick Install

```bash
npx jsr add @signaler/cli
```

## Platform-Specific Setup

### Windows (PowerShell/CMD)
Works out of the box after installation:
```powershell
signaler wizard
```

### Windows (Git Bash)
Run the setup script once after installation:
```bash
curl -s https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh | bash
```

Then use normally:
```bash
signaler wizard
```

### macOS/Linux
Works out of the box after installation:
```bash
signaler wizard
```

## Verification

```bash
signaler --version
```

Should display:
```
Signaler CLI
...
```

## Troubleshooting

### "signaler: command not found"

**Solution 1: Restart your terminal**
Close and reopen your terminal, then try again.

**Solution 2: Use npx directly**
```bash
npx @jsr/signaler__cli wizard
```

### Git Bash on Windows

If `signaler` doesn't work in Git Bash, run the setup script:
```bash
curl -s https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh | bash
```

## Uninstall

```bash
npm uninstall -g @signaler/cli
```

## Links

- **JSR Package:** https://jsr.io/@signaler/cli
- **GitHub:** https://github.com/Dendro-X0/signaler
- **Documentation:** https://github.com/Dendro-X0/signaler/tree/main/docs
