# Release Notes - v5.1.6

**Date:** 2026-06-14  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

**Agent-ready release** — ranked fix queue, route coverage honesty, Windows-stable parallel throughput, and a refreshed developer dashboard. Dogfooded on a 45-route pnpm monorepo (**90 combos in ~1m 45s** at `--parallel 6`).

Lead with: *artifact-first audit loop for agents and CI*, not DevTools score parity.

## Added

- **`agent/fix-queue.json`** — ranked surgical fix list written by `analyze`; each item includes `path`, `device`, `url`, `issueIds`, `estimatedSavingsMs`, and JSON pointers into triage.
- **`agent/coverage.json`** — scored vs skipped combos (`authWall`, `unreachable`, runner errors) with per-route guidance.
- **`query --view fix-queue`** and **`query --view coverage`** — machine-readable agent projections.
- **`query --view agent`** prefers fix-queue when present; **`explain --id`** resolves fix-queue items first.
- **Developer dashboard** — `.signaler/developer/report.html` KPI strip (median LCP, red/yellow issue counts, category medians), route card grid, lab-semantics trust banner, links to fix-queue and coverage JSON.
- **Route preflight** — skip auth-wall and unreachable routes before Lighthouse (`skip:auth`, `skip:err`); audit plan logs skip counts upfront.
- **`auth` config block** — cookies, cookie file, or warmup URL for protected routes.
- **Issue-count performance TUI** — summary table shows Red/Yel counts per route (not P(ref) alone).

## Fixed

- **Windows parallel throughput** — parallel Lighthouse uses an **NDJSON stdio worker subprocess pool** (no fork+IPC). Eliminates `Worker disconnected` failures on Windows at `--parallel 6`. Opt out with `SIGNALER_IN_PROCESS_PARALLEL=0`.
- **`signaler audit`** — loads `serveEnv` from default `signaler.config.json` when `--config` is omitted.
- **`discover --cwd`** — `--cwd` is now an alias for `--project-root` (monorepo discovery from `signaler audit` / one-liners).

## Changed

- **`perfIncludeYellow` config** — red-only triage by default on lean profile; set `true` or use `--perf-include-yellow` for yellow issues.
- **Agent read order** — `fix-queue.json` → `coverage.json` → `performance-triage.json` → `analyze.json` (see `AGENTS.md`).
- **Triage roadmap markdown** — removed sprint/week scheduling language from generated reports.

## Dogfood evidence

| App | Combos | Scored | Runtime | Runner errors |
|-----|--------|--------|---------|---------------|
| next-ecommercekit-monorepo (45 routes × 2 devices) | 90 | 40 (50 auth-wall skips) | ~1m 45s | 0 |

Public demo script: [GIF recording guide](../../guides/gif-demo-script.md).

## Upgrade

Re-run your original install method with a pinned version:

```bash
SIGNALER_VERSION=5.1.6 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.1.6"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

From a built checkout:

```bash
pnpm run build
node dist/cli-entry.js --version   # 5.1.6
```

## Known limits (unchanged)

- Throughput P(ref) ≠ DevTools Lighthouse — use issue-count triage and optional `--mode fidelity --focus-worst 5`.
- Protected routes need `auth` config or app-side lab bypass — otherwise preflight correctly skips them.
- First portable install: 5–15 minutes (Lighthouse + Playwright bundle).

See [Known limits](../../guides/known-limits.md) and [Lab semantics](../../guides/lab-semantics.md).

## Quick agent loop

```bash
signaler audit --cwd . --base-url http://127.0.0.1:3000
signaler query --view fix-queue --dir .signaler --json
signaler query --view coverage --dir .signaler --json
signaler explain --id action-triage-redirects --dir .signaler --json
# after fixes:
signaler audit --incremental-skip --cwd . --base-url http://127.0.0.1:3000
signaler verify --contract v6 --dir .signaler
```
