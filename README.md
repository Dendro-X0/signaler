# Signaler

**A comprehensive web performance auditing tool for batch Lighthouse audits with automatic route detection and intelligent reporting.**

Signaler is designed for teams who need to audit dozens or hundreds of pages efficiently. It combines automatic framework detection, intelligent route discovery, and batch execution to provide actionable performance insights at scale.

## Why Signaler?

**🎯 Batch-First**: Audit dozens or hundreds of pages in a single run  
**🤖 Smart Detection**: Automatically detects Next.js, Nuxt, Remix, SvelteKit, and static sites  
**🚀 Fast**: Parallel execution with auto-tuned workers and intelligent caching  
**🔧 Comprehensive**: Full Lighthouse audits plus bundle, health, links, headers, and console checks  
**📊 Actionable**: Rich HTML reports, triage guides, and AI-friendly JSON outputs

## Quick Start

### Installation

**Recommended: Local Installation (No npm Registry)**

```bash
# Clone and build
git clone https://github.com/Dendro-X0/signaler.git
cd signaler
pnpm install
pnpm run build

# Link globally (makes 'signaler' command available everywhere)
pnpm link --global

# Now use it in any project
cd ~/my-project
signaler wizard
signaler audit
```

**Why local installation?**
- ✅ No npm registry issues
- ✅ No packaging complications
- ✅ Works immediately
- ✅ Easy to update (`git pull && pnpm install && pnpm run build`)
- ✅ You control everything

See [INSTALL-LOCAL.md](INSTALL-LOCAL.md) for detailed instructions and alternative methods.

### 2. Initialize Configuration

Run the interactive wizard to auto-detect your project and routes:

```bash
signaler wizard
```

The wizard will:
- Detect your framework (Next.js, Nuxt, Remix, SvelteKit, or static HTML)
- Auto-discover routes from your filesystem, sitemap, or robots.txt
- Generate an `apex.config.json` configuration file
- Optionally filter routes with include/exclude patterns

### 3. Run Batch Audit

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

### 4. View Results

Signaler generates comprehensive outputs in `.signaler/`:

- **`report.html`** - Beautiful, interactive HTML report
- **`triage.md`** - Prioritized issues for quick fixes
- **`summary.json`** - Complete audit results
- **`issues.json`** - Aggregated issues with offender tracking
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
- **Offender tracking**: `issues.json.offenders` identifies repeated problems
- **PWA checks**: `pwa.json` for Progressive Web App validation
- **Diff view**: Compare runs to track regressions and improvements

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
├── summary.json             # Complete results
├── summary-lite.json        # Lightweight summary
├── issues.json              # Aggregated issues
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

- **Node.js 18+** (for npm installation)
- **Chrome/Chromium** (automatically managed by Lighthouse)
- For registry-free installation: No Node.js required (Rust launcher handles everything)

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

## Documentation

- **[Installation Guide](INSTALL.md)** - Detailed installation instructions and troubleshooting
- **[Getting Started](docs/getting-started.md)** - Installation and first run
- **[CLI & CI](docs/cli-and-ci.md)** - Command reference and CI integration
- **[Configuration](docs/configuration-and-routes.md)** - Config file format and options

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