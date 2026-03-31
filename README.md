# Signaler CLI

> Agent-first web lab runner for route discovery, Lighthouse triage, and fix-oriented reports.

![Version](http://img.shields.io/badge/version-3.1.0-blue.svg)
![License](http://img.shields.io/badge/license-MIT-green.svg)

## Installation

Signaler is distributed via JSR (JavaScript Registry), the modern package registry for JavaScript and TypeScript. JSR provides better performance, native TypeScript support, and improved security compared to traditional npm packages.

```bash
# Add to your project
npx jsr add @signaler/cli

# Or run directly without installation
npx jsr run @signaler/cli run --mode throughput
```

**Requirements**: Node.js 18.x or higher. Compatible with npm, pnpm, yarn, and Deno package managers.

## Quick Start

Get up and running in minutes with the canonical workflow. Start by discovering routes, run a throughput audit, generate a V6 analyze packet, verify fixes on focused reruns, and then render reports.

```bash
# Discover routes and create config (full scope, v4 target)
npx signaler discover --scope full

# Run your first canonical audit
npx signaler run --mode throughput

# Generate machine-facing action packets (V6-gated)
npx signaler analyze --contract v6

# Run focused verify loop (V6-gated)
npx signaler verify --contract v6

# Generate report/review outputs
npx signaler report

# View all available commands
npx signaler --help
```

Discovery/setup auto-detects your framework and project root, resolves base URL defaults, and writes `.signaler/discovery.json` with selected/excluded route counts, scope details, and route strategy metadata so runs are transparent and reproducible.

For editor and terminal agents, use the dedicated guide:

- [Agent Quickstart](./docs/guides/agent-quickstart.md)
- [Agent Prompt Pack](./docs/examples/agent-prompt-pack.md)
- [Repository Agent Defaults](./AGENTS.md)
- [Agent Bootstrap Block](./docs/reference/cli.md)
- [Agent Bootstrap (bash/PowerShell)](./scripts/agent-bootstrap.md)
- [Agent Bootstrap Scripts](./scripts/agent-bootstrap.sh)

Quick launch commands:

```bash
corepack pnpm run agent:bootstrap:sh
corepack pnpm run agent:bootstrap:ps
```

Compatibility aliases:

- `init` -> `discover`
- `audit` -> `run`
- `review` -> `report`

## Usage

Signaler provides a CLI for auditing web applications that works well for both humans and agents. Run audits locally during development or in CI, then let an agent read the canonical v3 artifacts to identify high-impact fixes quickly.

### Basic Commands

```bash
# Canonical workflow (transition-safe)
signaler discover --scope full
signaler run --mode throughput
signaler analyze --contract v6
signaler verify --contract v6
signaler report

# Legacy-compatible commands (still supported)
signaler audit
signaler review

# Legacy setup aliases
signaler init
signaler wizard

# Quick performance check
signaler measure

# Focus on worst-performing pages
signaler run --focus-worst 10

# CI mode with budget enforcement
signaler run --ci --fail-on-budget

# Launch Cortex Dashboard (optional assistant surface)
signaler cortex

# Launch fullscreen interactive dashboard
signaler tui
```

### Optional Cortex Surface

Cortex is optional. The preferred AI workflow is now direct agent usage through the CLI and canonical artifacts.

If you still want the assistant surface, Cortex can help to:

1.  **Diagnose**: Real-time analysis of your application with tech stack detection.
2.  **Fix**: Interactive triage of audit issues with AI-suggested code patches.
3.  **Test**: Auto-generation of Playwright tests to verify fixes.

Supported providers:
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

- `run.json` - Run identity + protocol + comparability metadata
- `results.json` - Normalized per-combo metrics/opportunities
- `suggestions.json` - Ranked actions with confidence + evidence pointers
- `agent-index.json` - Token-conscious AI entrypoint (v3 canonical)
- `analyze.json` - Deterministic action packet for agents (v6)
- `analyze.md` - Human digest for top actions and verify intent
- `verify.json` - Focused before/after check results with pass/fail
- `verify.md` - Human digest for verification outcomes
- `report.html` - Interactive visual report
- `summary.json`, `issues.json`, `triage.md` - Legacy compatibility artifacts

Recommended agent read order:

1. `analyze.json` (after `signaler analyze --contract v6`)
2. `verify.json` (after `signaler verify --contract v6`)
3. `agent-index.json`
4. `suggestions.json`
5. `issues.json`
6. `results.json`

## API

Use Signaler programmatically in your Node.js applications:

```typescript
import { createSignalerAPI } from '@signaler/cli/api';

const signaler = createSignalerAPI();

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

For complete API documentation, see [API Reference](./docs/reference/api.md).

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

See [Configuration Guide](./docs/reference/configuration.md) for all options.

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
      - run: corepack enable
      - run: pnpm install
      - run: pnpm start &
      - run: npx wait-on http://127.0.0.1:3000
      - run: npx jsr run @signaler/cli discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
      - run: npx jsr run @signaler/cli run --contract v3 --mode throughput --ci --no-color --yes
      - run: npx jsr run @signaler/cli report --dir .signaler
```

Reusable templates:

- [pnpm template](./.github/workflow-templates/signaler-audit-pnpm.yml)
- [npm template](./.github/workflow-templates/signaler-audit-npm.yml)
- [yarn template](./.github/workflow-templates/signaler-audit-yarn.yml)

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

For more solutions, see [Troubleshooting Guide](./docs/guides/troubleshooting.md).

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

- [Docs Index](./docs/README.md)
- [Getting Started](./docs/guides/getting-started.md)
- [Agent Quickstart](./docs/guides/agent-quickstart.md)
- [CLI Reference](./docs/reference/cli.md)
- [Configuration Reference](./docs/reference/configuration.md)
- [API Documentation](./docs/reference/api.md)
- [Features Guide](./docs/reference/features.md)
- [Troubleshooting](./docs/guides/troubleshooting.md)
- [Known Limits](./docs/guides/known-limits.md)
- [Production Playbook](./docs/operations/production-playbook.md)
- [Launch Checklist](./docs/operations/launch-checklist.md)
- [Release Playbook](./docs/operations/release-playbook.md)
- [Release Notes](./docs/operations/release-notes.md)
- [Active Roadmap](./docs/roadmap/active-roadmap.md)
- [Migration Guide](./docs/guides/migration.md)
- [Contracts (V3)](./docs/reference/contracts-v3.md)

## Contributing

Contributions are welcome! Check our [Roadmap](./ROADMAP.md) for planned features.

## License

MIT © [Signaler Team](https://signaler.dev)
