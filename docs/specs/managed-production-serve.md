# Managed Production Serve

Status: Active (v1.1 / Phase 2)
Owner: Signaler core
Last updated: 2026-05-24

## Goal

Let agents run audits against a **production-like** server without manual `build` + `start` choreography, while avoiding dev-mode artifacts (unbundled JS, HMR, turbopack quirks).

## Behavior

When `--managed-serve` is enabled:

1. Probe `baseUrl` (default `http://127.0.0.1:3000`).
2. If already reachable (HTTP 2xx/3xx): reuse it; Signaler does not start or stop anything.
3. If unreachable but `--managed-serve-reuse` and something responds (including 4xx/5xx): reuse with warning.
4. If still unreachable:
   - Skip build when `apps/web/.next/BUILD_ID` (or app `.next/BUILD_ID`) is **fresh** vs `package.json` mtime, or `--managed-serve-skip-build`.
   - Run `pnpm|npm|yarn run build` at the **serve plan root** (monorepo root when scripts delegate via `--filter`).
   - On failure, retry `next build --webpack` in the resolved **Next app root** (`apps/web` in monorepos).
   - Run `start` with `PORT` / `HOST=127.0.0.1`.
   - Wait until the URL responds with 2xx/3xx.
5. Run audits / job steps.
6. Stop the server Signaler started (also on SIGINT/SIGTERM).

## Job exit codes (v3.3+)

| Code | Meaning |
|------|---------|
| 0 | All steps succeeded |
| 1 | Discover or run failed |
| 2 | Run succeeded; analyze failed — use `performance-triage.json` / `query --view perf` |

## CLI

```bash
signaler job run --preset agent --managed-serve --in-process --cwd ../next-blogkit-pro
# aliases / env
signaler job run --preset agent --auto-serve
SIGNALER_MANAGED_SERVE=1 signaler job run --preset agent
```

Flags:

| Flag | Purpose |
|------|---------|
| `--managed-serve` / `--auto-serve` | Enable managed production server |
| `--managed-serve-skip-build` | Skip build when fresh `.next/BUILD_ID` exists or flag set |
| `--managed-serve-reuse` | Reuse server on port even when HTTP status is not 2xx/3xx (`SIGNALER_MANAGED_SERVE_REUSE=1`) |
| `--base-url` | URL/port to probe and bind (default `:3000`) |

## Monorepo serve plan (v3.4+)

`resolveProductionServePlan` returns:

- `projectRoot` — where `pnpm run build` / `start` execute (repo root for filter-based scripts)
- `nextAppRoot` — where `.next/` is written (e.g. `apps/web`)

Build skip checks and webpack fallback use `nextAppRoot`.

## Permissions and feasibility

**Yes — a local CLI can do this.**

- Spawning `build` / `start` uses normal child-process APIs (`spawn` / `spawnSync`).
- No elevated OS permissions are required for ports ≥ 1024 on localhost.
- Cleanup uses `SIGTERM` (Unix) or `taskkill /T` (Windows) — same as other dev tools.
- CI sandboxes must allow network localhost and subprocess execution (typical for Node CI).

**Caveats:**

- Production builds can be **slow** and may require env vars (DB, secrets) in real apps.
- Signaler does not inject database migrations or seed data.
- If port 3000 is occupied by an unrelated process, Signaler auto-selects another free port when starting a new server.
- `--managed-serve-reuse` is opt-in for broken servers (HTTP 500); prefer fixing the app or rebuilding.

## Related

- `src/engine/serve/` — implementation
- `src/start-static-server.ts` — folder-mode static server (separate path)
- `engine-job-protocol.md` — job presets
