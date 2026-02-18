# Signaler Documentation

Welcome to the comprehensive Signaler documentation. This directory contains detailed guides, API references, and examples for using Signaler effectively.

## Quick Navigation

### Getting Started
- **[Getting Started Guide](/docs/signaler/getting-started)** - Installation and first run
- **[Basic Usage Examples](/docs/signaler/examples/basic-usage)** - Common use cases and patterns
- **[Framework Integration](/docs/signaler/examples/framework-integration)** - Next.js, Nuxt, Remix, SvelteKit examples

### Configuration & Usage
- **[Configuration Guide](/docs/signaler/configuration)** - Config file format and options
- **[CLI & CI Integration](/docs/signaler/cli)** - Command reference and CI setup
- **[API Reference](/docs/signaler/api-reference)** - Complete programmatic API documentation

### Advanced Topics
- **[Features Guide](/docs/signaler/FEATURES)** - Comprehensive feature documentation
- **[Testing Guide](/docs/signaler/testing)** - Testing strategy and property-based testing approach
- **[Test Status Dashboard](/docs/signaler/test-status)** - Current test coverage and quality metrics
- **[AI-Optimized Reports](/docs/signaler/AI-OPTIMIZED-REPORTS)** - AI-friendly output formats
- **[Troubleshooting Guide](/docs/signaler/troubleshooting)** - Common issues and solutions

### Migration & Updates
- **[Migration Guide](/docs/signaler/MIGRATION)** - Upgrading from v1.x to v2.0
- **[Release Notes v2.0](/docs/signaler/RELEASE-NOTES-v2.0)** - Complete v2.0 release notes
- **[Implementation Summary](/docs/signaler/IMPLEMENTATION-SUMMARY)** - Technical implementation details

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── getting-started.md           # Installation and first run
├── api-reference.md             # Complete API documentation
├── testing.md                   # Testing strategy and property-based testing
├── test-status.md              # Test coverage and quality metrics
├── troubleshooting.md           # Common issues and solutions
├── configuration-and-routes.md  # Configuration guide
├── cli-and-ci.md               # CLI commands and CI integration
├── FEATURES.md                 # Feature documentation
├── AI-OPTIMIZED-REPORTS.md     # AI-friendly outputs
├── MIGRATION.md                # Migration guide
├── RELEASE-NOTES-v2.0.md       # Release notes
├── IMPLEMENTATION-SUMMARY.md   # Technical details
└── examples/
    ├── basic-usage.md          # Common usage patterns
    └── framework-integration.md # Framework-specific examples
```

## Quick Start

1. **Install Signaler:**
   ```bash
   npx jsr add @signaler/cli
   ```

2. **Initialize your project:**
   ```bash
   signaler wizard
   ```

3. **Run your first audit:**
   ```bash
   signaler audit
   ```

## Key Features

- **🎯 Batch-First**: Audit dozens or hundreds of pages in a single run
- **🤖 Smart Detection**: Automatically detects Next.js, Nuxt, Remix, SvelteKit, and static sites
- **🚀 Fast**: Parallel execution with auto-tuned workers and intelligent caching
- **🔧 Comprehensive**: Full Lighthouse audits plus bundle, health, links, headers, and console checks
- **📊 Actionable**: Rich HTML reports, triage guides, and AI-friendly JSON outputs
- **🧠 AI-Optimized**: Token-efficient reports for AI analysis (95% token reduction)

## API Overview

### Programmatic Usage

```typescript
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

const config = signaler.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [
    { path: '/', label: 'Home', devices: ['mobile', 'desktop'] }
  ]
});

const result = await signaler.audit(config);
console.log(`Audit completed in ${result.meta.elapsedMs}ms`);
```

### CLI Usage

```bash
# Interactive setup
signaler wizard

# Full audit
signaler audit

# Quick metrics
signaler measure

# Focus on worst pages
signaler audit --focus-worst 10

# CI mode with budget enforcement
signaler audit --ci --fail-on-budget
```

## Configuration Example

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

## Output Files

Signaler generates comprehensive outputs in `.signaler/`:

- **`report.html`** - Interactive HTML report
- **`triage.md`** - Prioritized fix guide
- **`QUICK-FIXES.md`** - Time-efficient developer overview
- **`summary.json`** - Complete results
- **`AI-ANALYSIS.json`** - Comprehensive AI-optimized report
- **`AI-SUMMARY.json`** - Ultra-condensed AI report
- **`issues.json`** - Aggregated issues with offender tracking

## Framework Support

Signaler automatically detects and supports:

- **Next.js** - Pages and App Router, dynamic routes
- **Nuxt** - Pages directory, dynamic routes with `_id` patterns
- **Remix** - Route modules and nested routing
- **SvelteKit** - File-based routing from `src/routes/`
- **Astro** - Static and hybrid rendering
- **Static Sites** - Pre-built HTML in `dist/`, `build/`, `out/`, `public/`

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Signaler Audit
  run: |
    npm install -g @signaler/cli
    signaler audit --ci --fail-on-budget
```

### GitLab CI

```yaml
audit:
  script:
    - npm install -g @signaler/cli
    - signaler audit --ci --fail-on-budget
  artifacts:
    paths:
      - .signaler/
```

## Common Use Cases

1. **Large Site Audits** - Audit 50-100+ pages in a single batch run
2. **CI/CD Integration** - Automated performance checks with budget enforcement
3. **Framework Migration** - Track performance across route refactors
4. **Performance Monitoring** - Regular audits with diff tracking
5. **Multi-Device Testing** - Simultaneous mobile and desktop audits

## Getting Help

- **[GitHub Issues](https://github.com/Dendro-X0/ApexAuditor/issues)** - Bug reports and feature requests
- **[Troubleshooting Guide](/docs/signaler/troubleshooting)** - Common issues and solutions
- **[API Reference](/docs/signaler/api-reference)** - Complete API documentation
- **[Examples](examples/)** - Practical usage examples

## Contributing

We welcome contributions! Please see our contributing guidelines and feel free to:

- Report bugs or request features via GitHub Issues
- Submit pull requests for improvements
- Share usage examples and integrations
- Improve documentation

## License

MIT License - see LICENSE file for details.

---

**Built for scale. Designed for teams. Optimized for batch audits.**