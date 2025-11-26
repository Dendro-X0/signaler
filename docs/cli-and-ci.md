# CLI Reference and CI Integration

This document describes the ApexAuditor CLI commands, flags, and how to integrate audits into CI pipelines.

---

## 1. CLI commands

ApexAuditor exposes a single binary: `apex-auditor`.

### `quickstart`

```bash
apex-auditor quickstart --base-url <url> [--project-root <path>]
```

- **Purpose:** run a one-off audit with sensible defaults and auto-detected routes.
- **Flags:**
  - `--base-url <url>` (required) – base URL of the running app.
  - `--project-root <path>` (optional) – directory to scan for routes (default: current directory).
- **Side effects:**
  - Writes `.apex-auditor/quickstart.config.json`.
  - Runs `audit` against that temporary config.

### `wizard`

```bash
apex-auditor wizard [--config <path>]
```

- **Purpose:** create or update a reusable `apex.config.json` for your project.
- **Flags:**
  - `--config <path>` (optional) – path to write the config (default: `apex.config.json`).
- **Behavior:**
  - Asks about project type, base URL, runs, and optional query string.
  - Detects routes for supported frameworks and lets you choose which to include.
  - Allows manual addition of pages.

### `audit`

```bash
apex-auditor audit [--config <path>] [--ci] [--no-color|--color] [--log-level <level>]
```

- **Purpose:** run Lighthouse audits based on an existing config file.
- **Flags:**
  - `--config <path>` – config file path (default: `apex.config.json`).
  - `--ci` – enable CI mode with budgets and non-zero exit codes on threshold failures.
  - `--no-color` – disable ANSI colours in console output.
  - `--color` – force ANSI colours even when stdout is not a TTY.
  - `--log-level <level>` – override Lighthouse log level (`silent`, `error`, `info`, `verbose`).
- **Behavior:**
  - Runs a pre-flight HTTP request to ensure the first page is reachable.
  - Launches a dedicated headless Chrome instance (unless `chromePort` is set in config).
  - Runs Lighthouse for each `page × device` combination, `runs` times.
  - Aggregates scores and metrics across runs.
  - Writes results to `.apex-auditor/summary.json` and `.apex-auditor/summary.md`.
  - Prints a compact table to stdout with Lighthouse-style colour coding.

Exit codes:

- `0` – audits completed, and CI budgets (if any) passed.
- `1` – a runtime error occurred or CI budgets failed.

---

## 2. CI mode and budgets

CI mode is enabled via `--ci` on the `audit` command:

```bash
npx apex-auditor audit --ci --no-color
```

In CI mode, ApexAuditor:

- Evaluates configured budgets (see `configuration-and-routes.md`).
- Prints a summary of any violations.
- Sets `process.exitCode = 1` when there are violations.
- Disables colours by default unless you pass `--color`.

Example output snippet:

```text
CI budgets FAILED (2 violations):
- home / [mobile] – category performance: 88 vs limit 90
- search /search [desktop] – metric lcpMs: 2800 vs limit 2500
```

If no budgets are configured:

```text
CI mode: no budgets configured. Skipping threshold checks.
```

---

## 3. GitHub Actions example

Below is a minimal GitHub Actions job that runs ApexAuditor in CI mode. It assumes your app can be started with `pnpm dev` and becomes available at `http://localhost:3000`.

```yaml
name: Performance CI

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  lighthouse:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: pnpm install

      - name: Start dev server
        run: pnpm dev &

      - name: Wait for dev server
        run: npx wait-on http://localhost:3000

      - name: Run ApexAuditor (CI mode)
        run: npx apex-auditor audit --ci --no-color
```

You can adapt this pattern for other CI providers (GitLab CI, CircleCI, etc.) by:

- Ensuring the app is running and reachable.
- Running `apex-auditor audit --ci` as a separate step.
- Relying on the exit code to fail or pass the pipeline.

---

## 4. Local gating before merge

You can also use CI mode locally to enforce performance budgets before merging:

```bash
npx apex-auditor audit --ci --no-color
```

If the command exits with a non-zero code, treat it like a failing test that must be addressed before merging.
