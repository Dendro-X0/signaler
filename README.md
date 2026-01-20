# Signaler CLI

[![Build Status](https://github.com/signaler/signaler/workflows/CI/badge.svg)](https://github.com/signaler/signaler/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen.svg)](https://github.com/signaler/signaler/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![JSR Score](https://img.shields.io/badge/JSR%20Score-80%25+-brightgreen.svg)](https://jsr.io/@signaler/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A comprehensive web performance auditing tool for batch Lighthouse audits with automatic route detection and intelligent reporting.**

Signaler is designed for teams who need to audit dozens or hundreds of pages efficiently. It combines automatic framework detection, intelligent route discovery, and batch execution to provide actionable performance insights at scale.

## Why Signaler?

**🎯 Batch-First**: Audit dozens or hundreds of pages in a single run  
**🤖 Smart Detection**: Automatically detects Next.js, Nuxt, Remix, SvelteKit, and static sites  
**🚀 Fast**: Parallel execution with auto-tuned workers and intelligent caching  
**🔧 Comprehensive**: Full Lighthouse audits plus bundle, health, links, headers, and console checks  
**📊 Actionable**: Rich HTML reports, triage guides, and AI-friendly JSON outputs  
**🧠 AI-Optimized**: New in v2.0.1 - Token-efficient reports for AI analysis (95% token reduction)

## 🆕 What's New in v2.0.1

### AI-Optimized Reporting System
- **`AI-ANALYSIS.json`**: Comprehensive structured report (75% fewer tokens)
- **`AI-SUMMARY.json`**: Ultra-condensed for quick assessment (95% fewer tokens)  
- **`QUICK-FIXES.md`**: Enhanced developer triage with time estimates
- **Performance Context**: Clear disclaimers about batch testing vs DevTools scores

### JSR Package Support
- Now available on JSR (JavaScript Registry): `npx jsr add @signaler/cli`
- Full compatibility with npm, pnpm, yarn, and Deno
- Modern package management for JavaScript/TypeScript projects

## Installation

Signaler supports multiple installation methods to fit different development workflows and package managers.

### NPM/PNPM/Yarn (Recommended)

Install Signaler globally for command-line usage:

```bash
# Using npm
npm install -g @signaler/cli

# Using pnpm (recommended for performance)
pnpm add -g @signaler/cli

# Using yarn
yarn global add @signaler/cli
```

Verify installation:
```bash
signaler --version
```

### JSR (JavaScript Registry) - Modern Package Management

For projects using JSR or Deno, install via the JavaScript Registry:

```bash
# Using JSR with npm/pnpm
npx jsr add @signaler/cli
pnpm dlx jsr add @signaler/cli

# Using Deno
deno add @signaler/cli
```

### Local Project Installation

For project-specific installations without global access:

```bash
# Install locally
npm install @signaler/cli

# Run with npx
npx signaler --version

# Or add to package.json scripts
{
  "scripts": {
    "audit": "signaler audit",
    "audit:quick": "signaler measure"
  }
}
```

### Git Bash on Windows Setup

If you're using Git Bash on Windows, run this one-time setup after installation:

```bash
bash <(curl -s https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh)
```

This creates proper shell integration for Git Bash environments.

### Troubleshooting Installation

**Command not found after installation:**
- Restart your terminal to refresh PATH variables
- On Windows: Run `$env:LOCALAPPDATA\signaler\signaler.cmd --version`
- On Unix: Run `~/.local/bin/signaler --version`

**Permission errors on Unix/macOS:**
```bash
sudo npm install -g @signaler/cli
# or use a Node version manager like nvm
```

**Node.js version issues:**
- Ensure Node.js 18+ is installed: `node --version`
- Update Node.js from https://nodejs.org/ if needed

## Quick Start

### 1. Initialize Configuration

Run the interactive wizard to auto-detect your project and routes:

```bash
signaler wizard
```

The wizard will:
- Detect your framework (Next.js, Nuxt, Remix, SvelteKit, or static HTML)
- Auto-discover routes from your filesystem, sitemap, or robots.txt
- Generate an `apex.config.json` configuration file
- Optionally filter routes with include/exclude patterns

### 2. Run Batch Audit

```bash
signaler audit
```

Or use the interactive shell for more control:

```bash
signaler shell
```

Inside the shell:
- `audit` - Full Lighthouse audits
- `measure` - Fast CDP-based metrics
- `bundle` - Build output analysis
- `health` - HTTP health checks
- `open` - View HTML report

### 3. View Results

Signaler generates comprehensive outputs in `.signaler/`:

- **`report.html`** - Beautiful, interactive HTML report
- **`triage.md`** - Prioritized issues for quick fixes
- **`QUICK-FIXES.md`** - ⭐ **NEW**: Time-efficient developer overview with clear action items
- **`summary.json`** - Complete audit results
- **`issues.json`** - Aggregated issues with offender tracking
- **`AI-ANALYSIS.json`** - ⭐ **NEW**: Comprehensive AI-optimized report with structured data
- **`AI-SUMMARY.json`** - ⭐ **NEW**: Ultra-condensed report for quick AI assessment
- **`ai-fix.json`** - AI-friendly fix recommendations

## Key Features

### Automatic Route Detection
- **Next.js**: Filesystem routes from `pages/` or `app/`
- **Nuxt**: Dynamic route detection with `[id]` and `_id` support
- **Remix/React Router**: Route module discovery
- **SvelteKit**: Route detection from `src/routes/`
- **Static HTML**: Scans `dist/`, `build/`, `out/`, `public/`
- **Sitemap/Robots**: Fallback discovery from sitemap.xml and robots.txt

### Batch Auditing
- Audit 10, 50, or 100+ pages in a single run
- Parallel execution with auto-tuned workers
- Mobile and desktop device emulation
- Incremental caching for faster re-runs
- Focus mode to re-audit only worst-performing pages

### Comprehensive Checks
- **Lighthouse**: Performance, Accessibility, Best Practices, SEO
- **Bundle**: Build output size analysis
- **Health**: HTTP status and response time checks
- **Links**: Broken link detection
- **Headers**: Security header validation
- **Console**: Runtime error detection

### Smart Outputs
- **Triage-first**: Start with `triage.md` for prioritized fixes
- **AI-ready**: `ai-fix.json` and `ai-ledger.json` for automated workflows
- **AI-optimized**: New `AI-ANALYSIS.json` (comprehensive), `AI-SUMMARY.json` (condensed), and `QUICK-FIXES.md` (developer-focused)
- **Offender tracking**: `issues.json.offenders` identifies repeated problems
- **PWA checks**: `pwa.json` for Progressive Web App validation
- **Diff view**: Compare runs to track regressions and improvements

### AI-Optimized Reports (New in v2.0)
- **`AI-ANALYSIS.json`**: Comprehensive structured report optimized for AI analysis (70-80% fewer tokens than parsing multiple files)
- **`AI-SUMMARY.json`**: Ultra-condensed report for quick AI assessment (500-1,000 tokens vs 15,000-20,000)
- **`QUICK-FIXES.md`**: Enhanced human triage with time estimates, impact analysis, and specific implementation guidance
- **Performance disclaimers**: Clear context about score accuracy and batch testing limitations

## Usage

Signaler can be used either as a CLI (most common) or as a programmatic API in Node.js. In both cases, the typical workflow is:

1. Create or generate an `apex.config.json` with `signaler wizard`
2. Run an audit against a running app (`signaler audit`)
3. Open and review `.signaler/report.html` and the generated JSON/Markdown summaries

For best results, run against a production-like server (`next build && next start`) and tune `--parallel` or `--stable` if your machine or Chrome becomes unstable.

## API Reference

Signaler provides both CLI and programmatic APIs for different use cases.

### Programmatic API

Use Signaler programmatically in your Node.js applications:

```typescript
import { SignalerAPI } from '@signaler/cli/api';

// Create API instance
const signaler = new SignalerAPI();

// Create configuration
const config = signaler.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [
    { path: '/', label: 'Home', devices: ['mobile', 'desktop'] },
    { path: '/about', label: 'About', devices: ['mobile'] }
  ],
  budgets: {
    categories: { performance: 90, accessibility: 95 },
    metrics: { lcpMs: 2500, cls: 0.1 }
  }
});

// Validate configuration
const validation = signaler.validateConfig(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  process.exit(1);
}

// Run audit
const result = await signaler.audit(config);
console.log(`Audit completed in ${result.meta.elapsedMs}ms`);
console.log(`Audited ${result.results.length} page/device combinations`);
```

### CLI API

Complete command-line interface for batch auditing:

```bash
# Interactive setup wizard
signaler wizard

# Run full Lighthouse audits
signaler audit

# Fast performance metrics only
signaler measure

# Bundle size analysis
signaler bundle

# HTTP health checks
signaler health

# Interactive shell mode
signaler shell
```

### Configuration API

The `apex.config.json` configuration supports extensive customization:

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 4,
  "parallel": 2,
  "warmUp": true,
  "incremental": true,
  "buildId": "v1.2.3",
  "pages": [
    {
      "path": "/",
      "label": "Home",
      "devices": ["mobile", "desktop"],
      "scope": "public"
    }
  ],
  "budgets": {
    "categories": {
      "performance": 90,
      "accessibility": 95,
      "bestPractices": 90,
      "seo": 95
    },
    "metrics": {
      "lcpMs": 2500,
      "fcpMs": 1800,
      "tbtMs": 300,
      "cls": 0.1,
      "inpMs": 200
    }
  }
}
```

### Output API

Signaler generates structured outputs for programmatic consumption:

- **`summary.json`** - Complete audit results with all metrics
- **`AI-ANALYSIS.json`** - AI-optimized comprehensive report
- **`AI-SUMMARY.json`** - Ultra-condensed report for quick analysis
- **`issues.json`** - Aggregated issues with severity and frequency
- **`pwa.json`** - Progressive Web App validation results

## Configuration

Minimal `apex.config.json`:

```json
{
  "baseUrl": "http://localhost:3000",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile", "desktop"] }
  ]
}
```

Advanced options:

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 4,
  "parallel": 2,
  "warmUp": true,
  "incremental": true,
  "buildId": "abc123",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] }
  ],
  "budgets": {
    "categories": { "performance": 90, "accessibility": 95 },
    "metrics": { "lcpMs": 2500, "inpMs": 200, "cls": 0.1 }
  }
}
```

## Examples

Signaler provides comprehensive examples for different use cases and frameworks.

### Basic Usage Examples

```typescript
// Programmatic API usage
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();
const config = signaler.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [
    { path: '/', label: 'Home', devices: ['mobile', 'desktop'] }
  ]
});

const result = await signaler.audit(config);
console.log(`Performance score: ${result.results[0].scores.performance}`);
```

### Framework Integration Examples

```bash
# Next.js project
npm run build
signaler wizard  # Auto-detects Next.js routes
signaler audit

# Nuxt project  
npm run build
signaler wizard  # Auto-detects Nuxt routes
signaler audit

# SvelteKit project
npm run build
signaler wizard  # Auto-detects SvelteKit routes
signaler audit
```

### CI/CD Integration Examples

```yaml
# GitHub Actions
- name: Performance Audit
  run: |
    npm install -g @signaler/cli
    signaler audit --ci --fail-on-budget
```

```yaml
# GitLab CI
audit:
  script:
    - npm install -g @signaler/cli
    - signaler audit --ci --fail-on-budget
```

### Configuration Examples

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": { "performance": 90, "accessibility": 95 },
    "metrics": { "lcpMs": 2500, "cls": 0.1 }
  }
}
```

For more detailed examples, see the [examples documentation](docs/examples/).

## Command Line Usage

```bash
signaler wizard                    # Interactive setup wizard
signaler shell                     # Interactive shell mode
signaler audit                     # Run Lighthouse audits
signaler audit --focus-worst 10    # Re-audit worst 10 pages
signaler measure                   # Fast CDP metrics
signaler bundle                    # Build output analysis
signaler health                    # HTTP health checks
```

## CI/CD Integration

```yaml
- run: pnpm exec signaler audit --ci --no-color --fail-on-budget
```

See `docs/cli-and-ci.md` for complete CI integration guide.

## Output Structure

```
.signaler/
├── report.html              # Interactive HTML report
├── triage.md                # Prioritized fix guide
├── QUICK-FIXES.md           # ⭐ NEW: Time-efficient developer overview
├── summary.json             # Complete results
├── summary-lite.json        # Lightweight summary
├── issues.json              # Aggregated issues
├── AI-ANALYSIS.json         # ⭐ NEW: Comprehensive AI-optimized report
├── AI-SUMMARY.json          # ⭐ NEW: Ultra-condensed AI report
├── ai-fix.json              # AI-friendly fixes
├── ai-ledger.json           # One-run AI index
├── pwa.json                 # PWA validation
├── bundle-audit.json        # Build analysis
├── health.json              # HTTP checks
└── lighthouse-artifacts/    # Detailed Lighthouse data
```

## What Makes Signaler Different

### Built for Scale
- Designed for batch audits of dozens or hundreds of pages
- Single-page audits are better done in Chrome DevTools
- Automatic route detection saves manual configuration
- Parallel execution with intelligent worker tuning

### Framework-Aware
- Detects Next.js, Nuxt, Remix, SvelteKit automatically
- Understands dynamic routes and filesystem conventions
- Monorepo support with app/package selection
- Static site support for pre-built outputs

### Production-Ready
- Registry-free installation via GitHub Releases
- Self-upgrade capability without npm
- Comprehensive error handling and retry logic
- CI/CD integration with budget enforcement

## Requirements

- **Node.js 18+** (required - Bun/Deno not supported)
- **Chrome/Chromium** (automatically managed by Lighthouse)

**⚠️ Important**: Signaler requires Node.js and does not work with Bun or Deno due to Lighthouse dependencies. See [RUNTIME-REQUIREMENTS.md](RUNTIME-REQUIREMENTS.md) for details.

## Common Use Cases

**Large Site Audits**: Audit 50-100+ pages in a single batch run  
**CI/CD Integration**: Automated performance checks with budget enforcement  
**Framework Migration**: Track performance across route refactors  
**Performance Monitoring**: Regular audits with diff tracking and regression detection  
**Multi-Device Testing**: Simultaneous mobile and desktop audits

## Troubleshooting

### Installation Issues

**Node.js Not Found:**
- Install Node.js 16+ from https://nodejs.org/
- Restart terminal after installation
- Verify: `node --version`

**Command Not Found After Installation:**
- Restart your terminal to refresh PATH
- Windows: Run directly with `$env:LOCALAPPDATA\signaler\signaler.cmd wizard`
- Unix: Run directly with `~/.local/bin/signaler wizard`

**Installer Fails on Windows:**
- Ensure Node.js is installed and in PATH
- Run PowerShell as Administrator if PATH update fails
- Check available disk space and memory

### Audit Failures
- Verify your `baseUrl` is accessible (start dev server first)
- For large batches, reduce `parallel` or use `--stable` flag
- Chrome disconnects: Retry with `--stable` to force single-worker mode
- Timeout errors: Increase `auditTimeoutMs` in config

### Configuration Problems
- Run `signaler wizard` to auto-generate valid config
- Validate JSON syntax in `apex.config.json`
- Ensure `baseUrl` starts with `http://` or `https://`
- Verify page paths start with `/`
- For dynamic routes, ensure they're resolved (no `[slug]` patterns)

### Performance Tips
- Use `--focus-worst N` to re-audit only problematic pages
- Enable `incremental: true` with `buildId` for faster re-runs
- Use `throttlingMethod: "simulate"` for faster audits
- Use `--no-ai-fix` and `--no-export` to reduce output size

## Testing and Quality Assurance

Signaler maintains high code quality through comprehensive testing:

### Testing Strategy
- **Property-Based Testing**: Universal properties tested across randomized inputs (100+ iterations per property)
- **Unit Testing**: Specific examples, edge cases, and error conditions
- **Integration Testing**: End-to-end workflows and CLI command validation
- **Type Safety**: Complete TypeScript coverage with strict mode enabled

### Quality Metrics
- **Test Coverage**: 85%+ line coverage across core functionality
- **Property Coverage**: 100% coverage of all defined correctness properties
- **Type Safety**: Full TypeScript declarations for all exports
- **JSR Score**: 80%+ package quality rating

### Running Tests
```bash
# Run complete test suite
pnpm test:full

# Run property-based tests only
pnpm test:full --grep "Property"

# Run with coverage report
pnpm test:coverage
```

For detailed testing information, see our [Testing Documentation](docs/testing.md) and [Contributing Guide](CONTRIBUTING.md).

## Documentation

- **[Installation Guide](INSTALL.md)** - Detailed installation instructions and troubleshooting
- **[Getting Started](docs/getting-started.md)** - Installation and first run
- **[CLI & CI](docs/cli-and-ci.md)** - Command reference and CI integration
- **[Configuration](docs/configuration-and-routes.md)** - Config file format and options
- **[Features Guide](docs/FEATURES.md)** - Comprehensive feature documentation for v2.0
- **[Testing Guide](docs/testing.md)** - Testing strategy and property-based testing approach
- **[Test Status](docs/test-status.md)** - Current test coverage and quality metrics
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute with testing instructions
- **[Migration Guide](docs/MIGRATION.md)** - Migration instructions from v1.x to v2.0
- **[Release Notes](docs/RELEASE-NOTES-v2.0.md)** - Complete v2.0 release notes

## Updating

To update to the latest version:

```bash
cd signaler
git pull origin main
pnpm install
pnpm build
```

If you used `pnpm link --global`, the global command will automatically use the updated version.

## License

MIT

---

**Built for scale. Designed for teams. Optimized for batch audits.**