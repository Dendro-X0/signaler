# Intelligent Audit Redesign

Status: Active  
Updated: 2026-06-18

## Problem

Signaler fails on real projects because it:

1. **Guesses serve** — monorepo root vs app root, wrong `pnpm run start`, hidden logs, 120s timeouts.
2. **Ignores running dev servers** — only probes the configured `baseUrl` port, not repo-configured or common dev ports.
3. **Blocks on auth misconfiguration** — health check fails when apps need lab bypass env (e.g. `BETTER_AUTH_SECRET`) that Signaler never injects by default.
4. **Bundles too much** — discover + managed serve + Lighthouse + analyze in one opaque `audit` step.

The artifact contract (`query`, `explain`, `verify`, tree layout) remains valuable. The **operational shell** must be redesigned.

## Target workflow (decoupled)

```text
explore  →  attach/serve  →  run  →  analyze  →  query
   │            │              │        │
   Rust         reuse          engine   artifacts
   (fast)       or start       (LH+)    (unchanged)
```

### Phase 1 — Attach-first (shipping now)

| Step | Behavior |
|------|----------|
| **Explore ports** | Read `.env*` + `package.json` scripts; scan loopback ports before starting anything. |
| **Reuse server** | If HTTP responds on a discovered port, attach — do not spawn managed serve. |
| **Auth bypass default** | When repo signals auth stack (`better-auth`, `BETTER_AUTH_SECRET` docs), inject `serveEnv` bypass flags on managed start. |
| **Observable serve** | Stream start logs; separate exit code for serve vs audit failures. |

### Phase 2 — Transparent lab env + explore manifest (shipping now)

| Step | Behavior |
|------|----------|
| **`serve-env-policy`** | Documents each injected key, offline/loopback scope, and cleanup on managed-serve stop. |
| **User consent** | Interactive prompt before inferred bypass env; `--yes` auto-confirms; non-interactive skips unless `--yes`. |
| **`signaler explore`** | Writes `.signaler/explore.json` (routes, port hints, running servers, bypass recommendation). |
| **Audit prelude** | `runPresetJob` runs explore before managed serve when attaching/starting. |

Security messaging (shown at prompt):

- Signaler is **offline** — injection is loopback-only, not remote intrusion.
- Values go to the **managed serve child** only — never project `.env` files.
- Child process is **stopped** after the audit when Signaler started it.

### Phase 4 — Default attach, opt-in serve (shipping now)

| Step | Behavior |
|------|----------|
| **Attach-first default** | `signaler audit` probes loopback via `explore`; does **not** managed-serve unless `--managed-serve`, `serve.mode`, or `SIGNALER_MANAGED_SERVE=1`. |
| **`serve` config block** | `signaler.config.json` `serve.mode`, `portHints`, `healthPath` for attach/managed policy. |
| **Streamed serve logs** | Managed serve child stdout/stderr prefixed `[serve]` (no silent `stdio: ignore`). |
| **Explore in docs** | `signaler explore` is the recommended bootstrap command. |

### Phase 5 — Rust explore command (planned)

Extend `signaler_hotpath`:

```bash
signaler_hotpath explore --project-root <path> --out explore.json
```

### Phase 6 — Engine isolation

- File-based job protocol only between shell and engine (see `engine-job-protocol.md`).
- CLI becomes a thin launcher; desktop/CI use the same engine API.

## Config shape (proposed)

```json
{
  "serve": {
    "mode": "attach",
    "portHints": [3000, 3001],
    "root": "apps/web",
    "start": "pnpm run dev",
    "healthPath": "/"
  },
  "auditBypass": true,
  "serveEnv": {
    "DEMO_AUTH_BYPASS": "true"
  }
}
```

`auditBypass: true` (default) merges inferred lab env when auth signals are detected.

## Success criteria

| Metric | Target |
|--------|--------|
| Time to first attach on running dev server | &lt; 3s |
| Monorepo projects without manual `serveEnv` | ≥ 80% attach or bypass success |
| `audit` failure rate due to managed serve | &lt; 10% of runs |
| Agent read path unchanged | `query` / `explain` / `verify` stable |

## Non-goals

- Replacing Lighthouse with a custom browser lab
- npm/JSR redistribution
- Requiring app code changes for every framework
