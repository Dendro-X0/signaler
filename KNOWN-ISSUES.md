# Known Issues

## Current Status

**Package Version:** 1.0.12  
**Last Updated:** January 16, 2026  
**Status:** ✅ All critical issues resolved

## Installation

### JSR Installation (Recommended)
**Status:** ✅ WORKING

```bash
npx jsr add @signaler/cli
signaler --version
```

### Git Bash on Windows
**Status:** ✅ WORKING (requires one-time setup)

After installation, run the setup script once:
```bash
curl -s https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh | bash
```

### npm Installation
**Status:** ❌ NOT SUPPORTED

The package is only published to JSR, not npm.

## Previously Resolved Issues

### Bun Runtime Error (v1.0.9)
**Resolved:** January 15, 2026

Old Bun-compiled executable caused path errors. Solution: Delete old installation at `C:\Users\Administrator\AppData\Local\Programs\signaler\` and restart terminal.

### Circular Dependency (v1.0.9)
**Resolved:** January 15, 2026

Removed self-referencing JSR dependency from package.json.

### Version Display (v1.0.12)
**Resolved:** January 16, 2026

CLI now displays correct version synced from package.json instead of hardcoded v1.0.0.

### Branding (v1.0.12)
**Resolved:** January 16, 2026

CLI rebranded from "ApexAuditor" to "Signaler" throughout.

## Testing

### Unit Tests
**Status:** ✅ PASSING

All 27 tests pass:
```bash
pnpm test
```

### CI/CD
**Status:** ✅ WORKING

GitHub Actions CI passes with build and test steps.

## Troubleshooting

### "signaler: command not found"
1. Restart your terminal
2. Or use: `npx @jsr/signaler__cli wizard`

### Git Bash Issues
Run the setup script:
```bash
curl -s https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh | bash
```

### Old Version Showing
1. Uninstall: `npm uninstall -g @signaler/cli`
2. Reinstall: `npx jsr add @signaler/cli`
3. Restart terminal

## For Developers

- ✅ Use JSR as primary distribution method
- ✅ Version syncs automatically from package.json
- ✅ All Bun-related build scripts removed
- ✅ Clean repository structure

## Links

- **JSR Package:** https://jsr.io/@signaler/cli
- **GitHub:** https://github.com/Dendro-X0/signaler
- **Documentation:** https://github.com/Dendro-X0/signaler/tree/main/docs
