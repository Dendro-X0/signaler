# Signaler

Signaler (formerly ApexAuditor) helps web teams move from noisy Lighthouse runs to structured, actionable insight.

This repository contains the **remastered** Signaler distribution:

- **Engine (Node.js/TypeScript)**: the audit/measure logic and artifact writers.
- **Launcher (Rust)**: a small orchestrator that resolves/runs the engine in a distribution-friendly way.
- **App (Tauri v2 + SvelteKit)**: optional desktop UI that runs the launcher as a sidecar.

The docs in this repo (`README.md` + `docs/`) focus on:

- Developer-first CLI flows.
- Registry-free distribution.
- Stable artifacts and a small engine contract for UIs.

## Quick start

### 1. Install (Single Command)

**Windows (PowerShell):**
```powershell
iwr https://github.com/Dendro-X0/signaler/releases/latest/download/install.ps1 | iex
```

**macOS/Linux/Unix:**
```bash
curl -fsSL https://github.com/Dendro-X0/signaler/releases/latest/download/install.sh | bash
```

**Manual Installation:**
- Download the latest `signaler-*-portable.zip` from [GitHub Releases](https://github.com/Dendro-X0/signaler/releases)
- Extract and run `./release-assets/install.sh` (Unix) or `./release-assets/install.ps1` (Windows)

**Troubleshooting Installation:**

If the single-command installation fails:

1. **Windows PowerShell Issues:**
   - Ensure you're running PowerShell (not Command Prompt)
   - If you get "execution policy" errors, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
   - Or use: `powershell -ExecutionPolicy Bypass -Command "iwr https://github.com/Dendro-X0/signaler/releases/latest/download/install.ps1 | iex"`
   - Try running as Administrator if you get permission errors
   - If you get encoding errors, try: `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` first
   - Alternative: Download the portable zip manually and run `release-assets\install.ps1`

2. **Unix/Linux/macOS Issues:**
   - Ensure you have `curl` and `unzip` installed
   - Check that you have write permissions to `~/.local/share/signaler`
   - Try the manual installation if the script fails

3. **Node.js Requirement:**
   - Signaler requires Node.js 18+ to be installed
   - Check with: `node --version`
   - Install from [nodejs.org](https://nodejs.org/) if needed

4. **PATH Issues:**
   - After installation, restart your terminal
   - If `signaler` command not found, add the bin directory to your PATH manually
   - Windows: `%LOCALAPPDATA%\signaler\bin`
   - Unix: `~/.local/share/signaler/bin`

### 2. Create a config:

```bash
signaler wizard
```

### 3. Run an audit (URL/config mode):

```bash
signaler audit --config apex.config.json
```

### 4. Run folder mode (static build output):

```bash
signaler folder --root ./dist
```

Artifacts are written under `.signaler/` by default.

## Architecture

### Launcher vs engine

- The **launcher** is the stable entrypoint for the desktop app.
- The **engine** is treated like a bundle that can be resolved locally (and later cached/downloaded).

This separation makes it possible to ship Signaler as:

- A portable zip that “just runs”.
- A desktop app that can stream progress over NDJSON.

## Installation

### Registry-free (recommended)

No registries are required. The most reliable way to install Signaler is to run the installer script from this Git repository.

This installer downloads and installs the latest tagged GitHub Release portable zip.

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

After install:

```bash
signaler --help
```

Upgrade later (no registry):

```bash
signaler upgrade
```

1. Download `signaler-<version>-portable.zip` from GitHub Releases.
2. Unzip it.
3. Run from the unpacked folder:

Windows (PowerShell):

```powershell
cmd /c ".\\release-assets\\run.cmd --help"
```

macOS/Linux:

```bash
./release-assets/run.sh --help
```

If you want to run it without changing your system PATH, keep using `run.cmd` / `run.sh` from the unpacked folder.

Tip: the portable zip contains installer scripts under `release-assets/`, but global installation is not guaranteed to work in all environments.

### Portable zip

You can download the portable ZIP from GitHub Releases and run it without installing.

### Advanced: global install (experimental)

The portable zip includes installer scripts:

- Windows: `release-assets\\install.ps1`
- macOS/Linux: `release-assets/install.sh`

These attempt to install a global launcher and optionally update your PATH. If they fail in your environment, use the portable zip runner (`run.cmd` / `run.sh`) instead.

## Most common commands

Notes:

- `init` auto-detects your stack from `package.json` (Next.js, Nuxt, Remix/React Router, SvelteKit, SPA) and can scan `apps/*` or `packages/*` inside monorepos.
- The wizard can discover routes from the filesystem plus `robots.txt`/`sitemap.xml` and lets you filter includes/excludes (default filtering may be `Yes` for large route sets).
- Static projects are discovered via HTML files in `dist/`, `build/`, `out/`, `public/`, and `src/`.
- When using a localhost base URL (e.g. `http://localhost:3000`), keep the dev server port in sync to avoid auditing a different project.

Inside the interactive shell:

- **measure**
- **audit**
- **bundle** (scan build output sizes; writes `.signaler/bundle-audit.json`)
- **health** (HTTP status/latency checks; writes `.signaler/health.json`)
- **links** (broken links crawl; writes `.signaler/links.json`)
- **headers** (security headers check; writes `.signaler/headers.json`)
- **console** (console errors + runtime exceptions; writes `.signaler/console.json`)
- **open** (open the latest HTML report)
- **open-triage** (open `.signaler/triage.md`)
- **open-screenshots** (open `.signaler/screenshots/`)
- **open-diagnostics** (open `.signaler/lighthouse-artifacts/diagnostics/`)
- **open-lhr** (open `.signaler/lighthouse-artifacts/lhr/`)
- **open-artifacts** (open `.signaler/lighthouse-artifacts/`)
- **pages** / **routes** (print configured pages/routes from the current config)
- **add-page** (interactive: append a page to `apex.config.json`)
- **rm-page** (interactive: remove a page from `apex.config.json`)
- **clear-screenshots** (remove `.signaler/screenshots/`)
- **init** (launch config wizard)
- **config <path>** (switch config file)

Cancel long-running commands:

- **Esc** (returns you to the shell prompt)

## Launcher CLI (Rust)

The launcher is designed to be machine-friendly and UI-friendly, and is currently used by the desktop app.

Note: the registry-free installer and the portable zip runner install/run the Node.js CLI (`node dist/bin.js`). The Rust launcher is not the primary distribution entrypoint yet.

- `signaler doctor`
- `signaler engine resolve --json`
- `signaler engine path --json`
- `signaler run audit --json -- <engine args...>`
- `signaler run folder --json -- <engine args...>`

For UIs, the engine can emit NDJSON events with `--engine-json`.

## Install & release

### GitHub Release asset (recommended)

Download the portable zip (no registries, no package managers):

1. Download `signaler-<version>-portable.zip` from the latest GitHub Release.
2. Unzip it.
3. Run:

Windows:

```bash
release-assets\\run.cmd audit
```

macOS/Linux:

```bash
./release-assets/run.sh audit
```

This runs `node dist/bin.js` from the unpacked folder. Ensure you have Node.js installed.

### Launcher (Rust)

The desktop app uses a small Rust launcher sidecar. It provides:

- `signaler doctor` (environment checks)
- `signaler run audit -- <engine args...>`
- `signaler run folder -- <engine args...>`
- `signaler engine resolve` (prints the engine entrypoint)
- `signaler engine run -- <engine args...>`

If you prefer installing into an existing project, you can also use the `.tgz` asset:

1. Download the `signaler-<version>.tgz` asset from the latest GitHub Release.
2. Install it:

```bash
pnpm add -D ./signaler-<version>.tgz
```

Run the CLI with the project-local binary:

```bash
pnpm exec signaler --help
```

Note: `pnpm exec signaler` runs the version installed in your current project, which may be older than the latest release; repeat the download/`pnpm add` step whenever you need a newer build.

### JSR install (optional)

```bash
npx jsr add @auditorix/signaler
```

or (pnpm 10.9+/yarn 4.9+/deno):

```bash
pnpm add jsr:@auditorix/signaler
```

JSR installs the published artifact and keeps you pinned to the release version.

If you want a fully registry-free workflow, prefer GitHub Releases + `install.ps1`/`install.sh` + `signaler upgrade`.

## Outputs

All outputs are written under `.signaler/` in your project.

Start here for a human-first prioritized list:

- `red-issues.md`

### `audit` outputs

- `summary.json`
- `summary-lite.json`
- `summary.md`
- `triage.md`
- `issues.json`
- `ai-ledger.json`
- `ai-fix.json` (unless `audit --no-ai-fix`)
- `ai-fix.min.json` (unless `audit --no-ai-fix`)
- `pwa.json`
- `export.json` (unless `audit --no-export`)
- `report.html`
- `screenshots/` (when `audit --diagnostics` or `audit --lhr` is used)
- `lighthouse-artifacts/diagnostics/` (when `audit --diagnostics` or `audit --lhr` is used)
- `lighthouse-artifacts/diagnostics-lite/` (when `audit --diagnostics` or `audit --lhr` is used)
- `lighthouse-artifacts/lhr/` (when `audit --lhr` is used)
- `accessibility-summary.json`
- `accessibility/` (axe-core artifacts per page/device)

Notes:

- **Runs-per-combo is always 1**. Re-run the same command to compare results.
- During an audit you will see a runtime progress line like `page X/Y — /path [device] | ETA ...`.
- After `audit` completes, type `open` to open the latest HTML report.
- Large JSON files may also be written as gzip copies (`*.json.gz`) to reduce disk size.
- `ai-ledger.json` is the AI-first, one-run-sufficient index. It includes `regressions`/`improvements` (when a previous `.signaler/summary.json` exists) and evidence pointers into `issues.json` and `lighthouse-artifacts/diagnostics-lite/`.
- `issues.json` includes an `offenders` section that aggregates repeated offenders (for example unused JS files) and links each offender back to the exact combo(s) and artifact pointers that contain the evidence.

Speed and output controls:

- `audit --ai-min-combos <n>` limits `ai-fix.min.json` to the worst N combos (default 25).
- `audit --no-ai-fix` skips writing `ai-fix.json` and `ai-fix.min.json` entirely.
- `audit --no-export` skips writing `export.json`.
- `audit --focus-worst <n>` re-runs only the worst N combos from the previous `.signaler/summary.json`.

### `measure` outputs

- `measure-summary.json`
- `measure-summary-lite.json`
- `measure/` (screenshots and artifacts)

### `bundle` outputs

- `bundle-audit.json`

### `health` outputs

- `health.json`

### `links` outputs

- `links.json`

### `headers` outputs

- `headers.json`

### `console` outputs

- `console.json`

## Configuration

Signaler reads `apex.config.json` by default.

Common fields:

- `baseUrl`
- `pages` (routes + devices)
- `pages[].scope` (optional: `public` | `requires-auth`)
- `throttlingMethod` (`simulate` or `devtools`)
- `cpuSlowdownMultiplier`
- `parallel`
- `warmUp`
- `auditTimeoutMs`
- `incremental` + `buildId`
- `gitIgnoreApexAuditorDir` (auto-add `.signaler/` to `.gitignore`)
- `budgets`

Example:

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 4,
  "parallel": 4,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "home", "devices": ["mobile", "desktop"], "scope": "public" },
    { "path": "/account", "label": "account", "devices": ["mobile"], "scope": "requires-auth" },
    { "path": "/docs", "label": "docs", "devices": ["desktop"], "scope": "public" }
  ],
  "budgets": {
    "categories": { "performance": 80, "accessibility": 90, "bestPractices": 90, "seo": 90 },
    "metrics": { "lcpMs": 2500, "inpMs": 200, "cls": 0.1 }
  }
}
```

## CLI tips

- Use `audit --flags` to print all audit flags/options.
- Use `audit --diagnostics` or `audit --lhr` when you want per-combo JSON artifacts and screenshots.
- Start with `triage.md` and `issues.json` when the suite is large.

Recommended workflow for large suites:

- Run a broad sweep with `throttlingMethod: simulate` (fast feedback).
- Then re-run only the worst routes with `audit --focus-worst <n>` and `throttlingMethod: devtools` for a more DevTools-like focused rerun.
- If parallel mode flakes (Chrome disconnects / Lighthouse target errors), retry with `audit --stable` (forces parallel=1).

## Documentation

The docs in `docs/` reflect the current workflows:

- `docs/getting-started.md`
- `docs/configuration-and-routes.md`
- `docs/cli-and-ci.md`

## Known issues

- **Large-run Lighthouse stability**: very large audits (many page/device combinations) may show higher score variance than manual Lighthouse runs and can intermittently hit worker/Chrome disconnects. Workaround: reduce parallelism (e.g. `--stable`) and retry.

## License

MIT
