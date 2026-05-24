# Managed Production Serve

Status: Active (v1)
Owner: Signaler core
Last updated: 2026-05-24

## Goal

Let agents run audits against a **production-like** server without manual `build` + `start` choreography, while avoiding dev-mode artifacts (unbundled JS, HMR, turbopack quirks).

## Behavior

When `--managed-serve` is enabled:

1. Probe `baseUrl` (default `http://127.0.0.1:3000`).
2. If already reachable (HTTP 2xx/3xx): reuse it; Signaler does not start or stop anything.
3. If unreachable:
   - Run `pnpm|npm|yarn run build` in the target project (unless `.next/BUILD_ID` exists or `--managed-serve-skip-build`).
   - Run `run start` with `PORT` / `HOST=127.0.0.1`.
   - Wait until the URL responds.
4. Run the job (discover → run → analyze).
5. Stop the server Signaler started (also on SIGINT/SIGTERM).

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
| `--managed-serve-skip-build` | Skip build if output exists (also skips when `.next/BUILD_ID` present) |
| `--base-url` | URL/port to probe and bind (default `:3000`) |

## Permissions and feasibility

**Yes — a local CLI can do this.**

- Spawning `build` / `start` uses normal child-process APIs (`spawn` / `spawnSync`).
- No elevated OS permissions are required for ports ≥ 1024 on localhost.
- Cleanup uses `SIGTERM` (Unix) or `taskkill /T` (Windows) — same as other dev tools.
- CI sandboxes must allow network localhost and subprocess execution (typical for Node CI).

**Caveats:**

- Production builds can be **slow** and may require env vars (DB, secrets) in real apps.
- Signaler does not inject database migrations or seed data.
- If port 3000 is occupied by an unrelated process that returns non-2xx, managed serve will still attempt build+start (future: port auto-selection).

## Related

- `src/engine/serve/` — implementation
- `src/start-static-server.ts` — folder-mode static server (separate path)
- `engine-job-protocol.md` — job presets
