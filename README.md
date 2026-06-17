# Signaler CLI

> Agent-first web quality audits: route discovery, Lighthouse lab runs, side runners, and a unified CI gate — in one command.

![Version](http://img.shields.io/badge/version-5.1.9-blue.svg)
![License](http://img.shields.io/badge/license-MIT-green.svg)

**v5.0** adds **`--quality-profile web-quality`**: Lighthouse (ci-strict) plus headers, links, health, console, measure, accessibility, and bundle, with a single **`gates/quality-pack.json`** exit code. Artifacts use the **tree layout** (`.signaler/INDEX.md`, `agent/`, `runners/`, `gates/`).  
→ [v5 showcase guide](./docs/guides/v5-showcase.md) · [Release notes](./docs/archive/release-notes/RELEASE-NOTES-v5.0.0.md)

## What Signaler does

Signaler is a **CLI for route-scale web quality audits** for teams shipping Next.js (and similar) apps — and for the coding agents that fix them.

- **One command** — `signaler audit` discovers routes, runs Lighthouse (+ optional side runners), and writes agent-ready artifacts.
- **Fix loop** — `query`, `explain`, and `verify` give agents and CI pass/fail without ingesting all of `.signaler/`.
- **Production-like defaults** — managed production serve, parallel 6, tree artifact layout.

**Not a DevTools score clone.** Throughput-mode performance uses **issue-count triage** (P(ref)), not manual Lighthouse parity. See [Lab semantics](./docs/guides/lab-semantics.md).

**Distribution:** GitHub Release installers only — not npm or JSR. See [Install matrix](./docs/guides/install-matrix.md).

## Try it in 15 minutes

Prerequisites: Node.js 18+, a web app at a stable URL (Signaler can managed-serve production builds when configured).

1. **Install** (works in Git Bash and PowerShell; Node 18+):

   ```bash
   node -e "(async()=>{const {spawnSync}=require('child_process');const fs=require('fs');const os=require('os');const path=require('path');const isWin=process.platform==='win32';const looksLikeBash=isWin && !!process.env.MSYSTEM;const url=isWin?(looksLikeBash?'https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh':'https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1'):'https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh';const suffix=url.endsWith('.ps1')?'.ps1':'.sh';const file=path.join(os.tmpdir(),'signaler-install-'+Date.now()+suffix);const res=await fetch(url);if(!res.ok) throw new Error('download failed: '+res.status);const txt=await res.text();fs.writeFileSync(file,txt,'utf8');if(suffix==='.ps1'){spawnSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File',file],{stdio:'inherit'});} else {spawnSync('bash',[file],{stdio:'inherit'});} })().catch(e=>{console.error(e);process.exit(1);});"
   ```

   Optional pin: set `SIGNALER_VERSION` before running (bash: `export SIGNALER_VERSION=5.1.9`, PowerShell: `$env:SIGNALER_VERSION='5.1.9'`).

   Then: `signaler --version`

2. **Audit** from your project root:

   ```bash
   cd /path/to/your-app
   signaler audit --cwd . --base-url http://127.0.0.1:3000
   ```

3. **Read results** (agents):

   ```bash
   signaler query --view agent --dir .signaler
   signaler query --view perf --dir .signaler
   ```

4. **Human report:** `.signaler/INDEX.md` → `developer/report.html`

First install takes **5–15 minutes** (npm pulls Lighthouse, Playwright, axe-core inside the portable bundle). CI can skip a global install — use the [GitHub Action](./docs/guides/github-actions.md).

## Installation

Signaler installs from **GitHub Release portable installers** only (not npm/JSR). For details, see [`/docs`](./docs/README.md).

Universal install (Git Bash + PowerShell; requires Node 18+):

```bash
node -e "(async()=>{const {spawnSync}=require('child_process');const fs=require('fs');const os=require('os');const path=require('path');const isWin=process.platform==='win32';const looksLikeBash=isWin && !!process.env.MSYSTEM;const url=isWin?(looksLikeBash?'https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh':'https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1'):'https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh';const suffix=url.endsWith('.ps1')?'.ps1':'.sh';const file=path.join(os.tmpdir(),'signaler-install-'+Date.now()+suffix);const res=await fetch(url);if(!res.ok) throw new Error('download failed: '+res.status);const txt=await res.text();fs.writeFileSync(file,txt,'utf8');if(suffix==='.ps1'){spawnSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File',file],{stdio:'inherit'});} else {spawnSync('bash',[file],{stdio:'inherit'});} })().catch(e=>{console.error(e);process.exit(1);});"
```

Optional pin: set `SIGNALER_VERSION` before running. Then: `signaler --version` (compat alias: `signalar`).

## Quick Start

### Agent fix loop (default)

Discover → run → analyze. Managed serve starts your app when needed.

```bash
signaler audit --cwd . --base-url http://127.0.0.1:3000
signaler query --view perf --dir .signaler
signaler explain --id <issue-id> --dir .signaler
```

### Full web quality (v5 — recommended for CI)

Lighthouse policy gate **and** seven side runners → one quality-pack gate.

```bash
signaler audit --quality-profile web-quality --cwd . --base-url http://127.0.0.1:3000
signaler query --view agent --dir .signaler
# CI artifact: .signaler/gates/quality-pack.json
```

### PR / changed routes

```bash
signaler job run --quality-profile pr-quality --managed-serve --in-process --cwd .
```

**One-shot agent job** (explicit preset):

```bash
signaler job run --preset agent --base-url http://127.0.0.1:3000
signaler query --view perf
signaler explain --id <issue-id>
```

**PR / changed-files** (skip discover; audit only routes touched in git):

```bash
signaler job run --preset pr
# optional cache between CI runs:
signaler job run --preset pr --incremental --build-id "$(git rev-parse --short HEAD)"
```

Manual step-by-step:

```bash
signaler discover --scope full
signaler run --contract v3 --mode throughput
signaler analyze --contract v6
signaler verify --contract v6
signaler query --view delta
signaler report
signaler job --help
signaler query --help
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

Compatibility aliases (deprecation notices in v4):

- `init` / `wizard` / `guide` → `discover`
- `review` → `report`

`signaler run` is Lighthouse-only; `signaler audit` is the full orchestrator (discover + run + analyze).

## For teams

Signaler targets **platform and product engineering teams** running Next.js (and similar) apps in CI and with coding agents.

- **Route-scale labs** — many routes × devices in one job, not a single URL
- **Agent-first artifacts** — `query` / `explain` instead of ingesting all of `.signaler/`
- **Verify loop** — pass/fail after fixes for CI and PR gates
- **Managed serve** — production-like runs without hand-starting dev servers

**Trust semantics:** throughput mode scores are **P(ref)** lab trends, not DevTools parity. See [Lab semantics](./docs/guides/lab-semantics.md).

**Docs:**

- [B2B / team value](./docs/guides/b2b-team-value.md)
- [Migration to v4](./docs/guides/migration-v4.md)
- [Phase 1 roadmap](./docs/roadmap/phase1-v4.1-adoptability.md)
- [Dogfood checklist](./docs/operations/dogfood-checklist.md)

**CI today:**

```bash
signaler job run --run-profile ci-strict --managed-serve --in-process --cwd .
signaler job run --preset pr --managed-serve --in-process --cwd .
# v5: Lighthouse + headers + links + bundle in one job
signaler audit --quality-profile web-quality --managed-serve --in-process --cwd .
```

Official GitHub Action: [`.github/actions/signaler`](./.github/actions/signaler/action.yml). See [GitHub Actions guide](./docs/guides/github-actions.md).

```yaml
- uses: ./.github/actions/signaler
  with:
    version: "latest"   # GitHub Release tag, or pin e.g. "5.1.6"
    quality-profile: web-quality
    base-url: http://127.0.0.1:3000
```

## Usage

Signaler provides a CLI for auditing web applications that works well for both humans and agents. Run audits locally during development or in CI, then let an agent read the canonical v3 artifacts to identify high-impact fixes quickly.

### Basic Commands

```bash
# One-shot orchestrator (discover + run + analyze)
signaler audit --cwd . --base-url http://127.0.0.1:3000

# Step-by-step (finer control)
signaler discover --scope full
signaler run --mode throughput
signaler analyze --contract v6
signaler verify --contract v6
signaler report

# Setup aliases (still supported)
signaler init
signaler wizard

# Report alias
signaler review

# Quick performance check
signaler measure

# Focus on worst-performing pages
signaler run --focus-worst 10

# CI mode with budget enforcement
signaler run --ci --fail-on-budget

# Launch fullscreen interactive dashboard
signaler tui
```

### Demos

Four short clips showing the modern v5+ flow (init → audit → artifacts → dashboard).

![Init](https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/init.gif)
*Initialize a project with `signaler discover`*

![Audit](https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/audit.gif)
*One command: `signaler audit` (discover → run → analyze)*

![Artifacts](https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/artifacts.gif)
*Tree layout under `.signaler/` (start at `INDEX.md` → `developer/report.html`)*

![Analytics dashboard](https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/analytics_dashboard.gif)
*Developer report triage: KPI strip + issue-count performance view*

### Output layout (v4.5+ tree)

Signaler generates comprehensive reports in `.signaler/` (default **tree layout** since v4.5):

**Start here (developers):** open `.signaler/INDEX.md` → `developer/report.html`

**Agents:** use `signaler query` / `explain` (do not list the whole tree). Fallback: `.signaler/agent/entrypoints.json`

| Tree path | Purpose |
|-----------|---------|
| `agent/index.json` | Agent entrypoint (was `agent-index.json`) |
| `agent/analyze.json` | v6 action packet |
| `agent/performance-triage.json` | Performance issue-count triage |
| `runners/links/links.json` | Link check results |
| `runners/headers/headers.json` | Security header checks |
| `runners/health/health.json` | Route availability |
| `runners/console/console.json` | Console errors per combo |
| `runners/measure/measure-summary.json` | Fast CDP lab metrics |
| `runners/accessibility/accessibility-summary.json` | axe-core sweep |
| `runners/bundle/bundle-audit.json` | Bundle scan |
| `gates/quality-pack.json` | Unified web-quality gate (v5) |
| `runs/lighthouse/run.json` | Run identity + comparability |
| `manifest.json` | Machine index for all paths |

Use `--artifact-layout flat` only for legacy flat-root output (deprecated).

Recommended agent read order:

1. `signaler query --view agent` or `agent/analyze.json` (after analyze v6)
2. `signaler query --view perf` or `agent/performance-triage.json`
3. `signaler query --view delta` or `runs/verify/verify.json` (after verify v6)
4. `agent/index.json`, then `agent/suggestions.json` as needed
5. `signaler explain --id <id>` for one issue—avoid loading full `runs/lighthouse/results.json` by default

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
  "parallel": 6,
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
- `parallel` - Number of concurrent audits (default: **6** on most machines; auto-capped on low-memory hosts)
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
      - run: curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
      - run: signaler job run --preset ci --base-url http://127.0.0.1:3000 --scope full --dir .signaler
      - run: signaler report --dir .signaler
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

**Issue**: `signaler: command not found` after install (Windows Git Bash)  
**Solution**: Use `install.sh` in Bash — not `irm install.ps1 | iex`. Restart the terminal or `source ~/.bashrc`. See [Install matrix](./docs/guides/install-matrix.md).

**Issue**: `signaler upgrade` fails on Windows (path / extract errors)  
**Solution**: Re-run the install script for your shell. Upgrade requires 5.1.4+ on Windows.

**Issue**: `API rate limit exceeded` during `install.ps1` / `install.sh`  
**Solution**: Set `GITHUB_TOKEN` to a read-only PAT and retry, or download the portable zip from [Releases](https://github.com/Dendro-X0/signaler/releases). See [Installation](./docs/guides/installation.md).

**Issue**: Connection refused errors
**Solution**: Ensure your dev server is running before auditing. Use `baseUrl: "http://localhost:3000"` matching your server port.

**Issue**: Low performance scores vs DevTools
**Solution**: This is expected. Signaler runs in headless mode with simulated throttling. Scores are 10-30 points lower but consistent for comparisons.

**Issue**: Out of memory errors or very slow audits (single worker)
**Solution**: Use `--parallel 6` on most machines (fewer workers do not improve accuracy). If workers still disconnect, reduce scope (`discover --scope quick`), use production serve, or lower parallel only for stability — not score tuning. See [Lab Semantics](./docs/guides/lab-semantics.md).

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
- **🧠 Agent-ready reports**: token-efficient summaries for agent workflows
- **🔄 CI/CD Ready**: GitHub Actions, GitLab CI, Jenkins integration

## Documentation

Technical details live in [`/docs`](./docs):
- [Agent Quickstart](./docs/guides/agent-quickstart.md)
- [CLI Reference](./docs/reference/cli.md)
- [Configuration Reference](./docs/reference/configuration.md)
- [Lab semantics](./docs/guides/lab-semantics.md)
- [Install matrix](./docs/guides/install-matrix.md)

## Contributing

Contributions are welcome! Check our [Roadmap](./ROADMAP.md) for planned features.

## License

MIT © [Signaler Team](https://signaler.dev)
