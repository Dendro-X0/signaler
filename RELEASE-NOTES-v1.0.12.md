# Signaler CLI v1.0.12

**Release Date:** January 16, 2026

## 🎉 Major Milestone: JSR-First Distribution

Starting with v1.0.12, Signaler CLI is distributed primarily through JSR (JavaScript Registry), making installation simple and reliable across all platforms.

## 🎨 Branding & Identity

- **Rebranded from "ApexAuditor" to "Signaler"**
  - CLI now displays "Signaler CLI" instead of "ApexAuditor CLI"
  - Interactive shell shows "Signaler v1.0.12" with correct version
  - Version number now syncs automatically from package.json

## 🚀 Installation

### Method 1: JSR (Recommended)

```bash
npx jsr add @signaler/cli
```

**For Git Bash on Windows**, run the setup script once after installation:

```bash
curl -s https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh | bash
```

### Method 2: Download Release Package

Download the release package from GitHub Releases:
- **signaler-v1.0.12.tar.gz** (28 MB) - For Unix/macOS/Linux
- **signaler-v1.0.12.zip** (35 MB) - For Windows

Extract and run:
```bash
# Unix/macOS/Linux
./signaler wizard

# Windows
signaler.cmd wizard
```

**Requirements**: Node.js 18 or higher must be installed.

### Verify Installation

```bash
signaler --version
```

## ✨ What's New

### JSR as Primary Distribution Method
- Published to JSR: https://jsr.io/@signaler/cli
- Simple installation with `npx jsr add @signaler/cli`
- Works with npm, pnpm, yarn, and deno
- No more complex standalone executables or registry-free installers

### Bug Fixes
- Fixed version display (was showing hardcoded v1.0.0, now shows correct version)
- Resolved Bun runtime error caused by old executable installation
- Fixed circular dependency in package.json
- Improved cross-platform compatibility

### Documentation
- Updated README with JSR installation instructions
- Added INSTALLATION-GUIDE.md for platform-specific setup
- Cleaned up obsolete documentation files
- Added Git Bash setup script for Windows users

### Repository Cleanup
- Removed obsolete build scripts (Bun, pkg)
- Removed unused directories (app, dcos, launcher, portable-package, release-assets)
- Removed redundant documentation files
- Streamlined repository structure for JSR-first distribution

## 📦 What's Included

Signaler CLI is a comprehensive web performance auditing tool with:

- **Batch Auditing**: Audit dozens or hundreds of pages in a single run
- **Automatic Route Detection**: Detects Next.js, Nuxt, Remix, SvelteKit, and static sites
- **Parallel Execution**: Auto-tuned workers for fast audits
- **Comprehensive Checks**: Lighthouse, bundle analysis, health checks, link validation
- **Rich Reporting**: HTML reports, triage guides, AI-friendly JSON outputs

## 🔧 Requirements

- **Node.js 18+** (required)
- **Chrome/Chromium** (automatically managed by Lighthouse)

**⚠️ Important**: Signaler requires Node.js and does not work with Bun or Deno due to Lighthouse dependencies.

## 📚 Documentation

- **Installation Guide**: [INSTALLATION-GUIDE.md](INSTALLATION-GUIDE.md)
- **Getting Started**: [docs/getting-started.md](docs/getting-started.md)
- **CLI & CI**: [docs/cli-and-ci.md](docs/cli-and-ci.md)
- **Configuration**: [docs/configuration-and-routes.md](docs/configuration-and-routes.md)

## 🐛 Known Issues

All critical issues have been resolved in v1.0.12. See [KNOWN-ISSUES.md](KNOWN-ISSUES.md) for details.

## 🔄 Upgrading from Previous Versions

If you previously installed Signaler using standalone executables or other methods:

1. Uninstall old version: `npm uninstall -g @signaler/cli`
2. Install from JSR: `npx jsr add @signaler/cli`
3. Restart your terminal
4. Verify: `signaler --version`

## 🙏 Acknowledgments

Thank you to everyone who reported issues and provided feedback during the transition to JSR distribution.

## 📝 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

---

**JSR Package**: https://jsr.io/@signaler/cli  
**GitHub**: https://github.com/Dendro-X0/signaler  
**License**: MIT
