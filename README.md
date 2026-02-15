# Signaler CLI

> Comprehensive web quality platform with AI-powered insights, accessibility, security, and performance audits.

![Version](https://img.shields.io/badge/version-2.5.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Installation

Signaler is distributed via JSR (JavaScript Registry), the modern package registry for JavaScript and TypeScript. JSR provides better performance, native TypeScript support, and improved security compared to traditional npm packages.

```bash
# Add to your project
npx jsr add @signaler/cli

# Or run directly without installation
npx jsr run @signaler/cli audit
```

**Requirements**: Node.js 18.x or higher. Compatible with npm, pnpm, yarn, and Deno package managers.

## Quick Start

Get up and running in seconds with the interactive wizard. The wizard automatically detects your framework, scans for routes, and creates an optimized configuration file. No manual setup required!

```bash
# Initialize your project with the wizard
npx signaler wizard

# Run your first audit
npx signaler audit

# View all available commands
npx signaler --help
```

The wizard will automatically detect your framework (Next.js, Nuxt, Remix, SvelteKit, Astro) and configure optimal settings including parallel workers, throttling method, and performance budgets.

## Usage

Signaler provides a comprehensive CLI for auditing web applications. Run audits locally during development or integrate into your CI/CD pipeline for continuous quality monitoring. All commands support both interactive and non-interactive modes.

### Basic Commands

```bash
# Interactive setup wizard
signaler wizard

# Run full audit suite
signaler audit

# Quick performance check
signaler measure

# Focus on worst-performing pages
signaler audit --focus-worst 10

# CI mode with budget enforcement
signaler audit --ci --fail-on-budget
# CI mode with budget enforcement
signaler audit --ci --fail-on-budget

# Launch Cortex Dashboard (AI Engineer)
signaler cortex
```

### 🧠 Signaler Cortex (New in v2.6)

Signaler Cortex is your automated performance engineer. It uses AI to:

1.  **Diagnose**: Real-time analysis of your application with tech stack detection.
2.  **Fix**: Interactive triage of audit issues with AI-suggested code patches.
3.  **Test**: Auto-generation of Playwright tests to verify fixes.

Supported AI Providers:
- **Google**: Gemini 3 Pro, Gemini 3 Flash
- **Anthropic**: Claude 3.5 Sonnet, Claude 4.5 Opus
- **OpenAI**: GPT-4o, GPT-5.2
- **Local**: Ollama, DeepSeek


### Demos

![Init and Audit Workflow](https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/init_and_audit.gif)
*Initializing a project and running an audit in interactive mode*

### Output Files

![File Tree Report](https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/file_tree_report.gif)
*Comprehensive file tree generation*

![HTML Report](https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/HTML_report.gif)
*Interactive HTML report with AI insights*

Signaler generates comprehensive reports in `.signaler/`:

- `report.html` - Interactive visual report
- `triage.md` - Prioritized fix guide
- `AI-ANALYSIS.json` - AI-optimized structured report (75% token reduction)
- `AI-SUMMARY.json` - Ultra-condensed report (95% token reduction)
- `summary.json` - Complete audit results

## API

Use Signaler programmatically in your Node.js applications:

```typescript
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

const config = signaler.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [
    { path: '/', label: 'Home', devices: ['mobile', 'desktop'] },
    { path: '/about', label: 'About', devices: ['mobile'] }
  ]
});

const result = await signaler.audit(config);
console.log(`Audit completed: ${result.meta.elapsedMs}ms`);
```

For complete API documentation, see [API Reference](./docs/api-reference.md).

## Configuration

Create a `signaler.config.json` file in your project root:

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] }
  ],
  "budgets": {
    "categories": { "performance": 90, "accessibility": 95 },
    "metrics": { "lcpMs": 2500, "cls": 0.1 }
  }
}
```

**Key Options**:
- `baseUrl` - Base URL of your application
- `parallel` - Number of concurrent audits (default: auto-detected)
- `warmUp` - Run warm-up request before auditing (recommended)
- `budgets` - Performance budgets for CI/CD gates

See [Configuration Guide](./docs/configuration-and-routes.md) for all options.

## Examples

### GitHub Actions Integration

```yaml
name: Performance Audit
on: [push]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx jsr add @signaler/cli
      - run: npx signaler audit --ci --fail-on-budget
```

### Framework-Specific Usage

**Next.js**:
```bash
# Wizard auto-detects Next.js and scans pages/ or app/
signaler wizard
```

**Nuxt**:
```bash
# Auto-detects pages/ directory with dynamic routes
signaler wizard
```

More examples in [`/docs/examples`](./docs/examples).

## Troubleshooting

### Common Issues

**Issue**: "Connection refused" errors
**Solution**: Ensure your dev server is running before auditing. Use `baseUrl: "http://localhost:3000"` matching your server port.

**Issue**: Low performance scores vs DevTools
**Solution**: This is expected. Signaler runs in headless mode with simulated throttling. Scores are 10-30 points lower but consistent for comparisons.

**Issue**: Out of memory errors
**Solution**: Reduce `parallel` workers or enable incremental mode with `incremental: true` in config.

**Issue**: Missing routes
**Solution**: Use `signaler wizard` to auto-detect routes, or manually add them to `signaler.config.json`.

For more solutions, see [Troubleshooting Guide](./docs/troubleshooting.md).

## Features

- **⚡ Performance**: Web Vitals, image optimization, bundle analysis, font loading
- **♿ Accessibility**: WCAG 2.1/2.2 compliance with axe-core integration
- **🛡️ Security**: OWASP Top 10, security headers, cookie validation
- **🔍 SEO**: Meta tags, structured data, canonical URLs, heading hierarchy
- **📱 Mobile UX**: Touch targets, viewport validation, responsive design
- **🎯 Third-Party Analysis**: Performance impact of external scripts
- **🧠 AI-Optimized Reports**: 95% token reduction for AI analysis
- **🔄 CI/CD Ready**: GitHub Actions, GitLab CI, Jenkins integration

## Documentation

Comprehensive guides available in [`/docs`](./docs):

- [Getting Started](./docs/getting-started.md)
- [CLI & CI Usage](./docs/cli-and-ci.md)
- [Configuration Reference](./docs/configuration-and-routes.md)
- [API Documentation](./docs/api-reference.md)
- [Features Guide](./docs/FEATURES.md)
- [Troubleshooting](./docs/troubleshooting.md)

## Contributing

Contributions are welcome! Check our [Roadmap](./ROADMAP.md) for planned features.

## License

MIT © [Signaler Team](https://signaler.dev)
