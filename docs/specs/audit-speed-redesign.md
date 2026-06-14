# Audit speed redesign

Status: Active  
Target dogfood app: `next-ecommercekit-monorepo-main` (45 routes, 90 combos, 28 dashboard paths)  
Goal: **full production-build audit in minutes, not hours**

## Problem

Full-suite audits on ecommercekit hit **worker disconnect** on auth-protected `/dashboard/*` routes. The throughput runner treats those as a **failure storm**, cuts parallelism to 1, adds cooldowns, and retries each combo up to 5 times. Wall-clock grows to **1–3+ hours** — slower than manual checks.

Production serve (`pnpm build && pnpm start`) is correct for lab accuracy; dev-server mode is **not** an acceptable trade (false positives on bundle/perf).

## Root causes (confirmed)

| Cause | Effect |
|-------|--------|
| Global failure-storm backoff on **per-route** worker errors | Parallel 6 → 1 |
| Up to 5 retries per combo on auth-wall routes | Multiplies wasted time |
| No preflight skip for login redirects | Lighthouse runs on impossible routes |
| Cooldown pauses after consecutive route failures | Adds seconds between each failure |
| 90 combos × serial effective throughput | ETA 56m+ observed at page 28/90 |

## Design principles

1. **Route failures stay route-local** — never collapse the whole pool.
2. **Fail fast on auth walls** — HTTP preflight before Lighthouse.
3. **Keep production lab conditions** — managed production serve unchanged.
4. **Plan before run** — print combos, parallel, skips, ETA; abort early if absurd.
5. **Measure on target app** — gate changes on ecommercekit full audit wall-clock.

## Phase 1 (implemented)

- `route-preflight.ts` — parallel GET probe; skip `auth-wall` / unreachable routes.
- `runner-failure-policy.ts` — route-scoped vs infrastructure failures.
- **Remove failure-storm backoff from per-task retry path** in `lighthouse-runner.ts`.
- Route-scoped max attempts **2** (was 5).
- Reset retry streak when giving up on a route (avoid cooldown spiral).
- Audit plan line at run start.

## Phase 2 (next)

- **Combo-level skip cache** in `.signaler/route-preflight.json` (persist auth-wall paths across runs).
- **Chrome session reuse** across devices for same path (mobile then desktop on one worker).
- **Rust core path** enabled by default when sidecar available (already wired; validate on Windows).
- **Monorepo serve plan** — single `apps/storefront` target for ecommercekit (avoid wrong app root).

## Phase 3 (architecture)

- Split **scan** (throughput, all routes, issue-count triage) from **check** (fidelity, worst-N only).
- Optional **auth cookie** injection for dashboard routes (explicit config, not default).
- **Budget cap**: `--max-audit-minutes` stops queue and writes partial artifacts.

## Success criteria (ecommercekit)

| Metric | Target |
|--------|--------|
| Full 90-combo audit (production serve already up) | **≤ 15 min** on 16GB+ Windows |
| Dashboard auth-wall routes | Skipped in **&lt; 30s** preflight, not retried |
| Stable parallel workers | **≥ 4** for public routes through completion |
| Agent artifacts | `analyze.json` + `performance-triage.json` still emitted |

## Verify

```bash
cd "E:/Web Projects/starterkit/next-ecommercekit-workspace/next-ecommercekit-monorepo-main"
pnpm build && pnpm start   # separate terminal
signaler audit --cwd . --base-url http://127.0.0.1:3000 --skip-discover --yes --parallel 6
```

Record wall-clock and `runnerStability.finalParallel` in `.signaler/runs/lighthouse/run.json`.
