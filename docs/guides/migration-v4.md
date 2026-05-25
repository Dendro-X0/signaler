# Migration to v4.0

This guide covers breaking and behavioral changes when upgrading to Signaler v4.

## `signaler audit` is no longer an alias of `run`

**Before (v3):**

```bash
signaler audit --config signaler.config.json --contract v3 --mode throughput
# Printed: Compatibility alias: 'audit' maps to primary 'run'
# Ran the Lighthouse runner only (same as `signaler run`)
```

**After (v4):**

```bash
signaler audit --cwd . --base-url http://127.0.0.1:3000
# Orchestrator: discover → run (v3) → analyze (v6)
# Defaults: --scope full, managed serve (auto: dev first), in-process steps
```

To run **only** Lighthouse (previous `audit` behavior), use `signaler run`:

```bash
signaler run --config signaler.config.json --contract v3 --mode throughput --yes --no-color
```

## Command mapping

| v3 habit | v4 canonical |
|----------|----------------|
| `signaler audit` (Lighthouse only) | `signaler run` |
| Full agent loop in one command | `signaler audit` or `signaler job run --preset agent` |
| Setup / route discovery | `signaler discover` |
| Human report from artifacts | `signaler report` or `signaler report --summary` |

## `signaler audit` flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--scope` | `full` | Discover scope before run |
| `--managed-serve` | on | Start server when URL is down |
| `--managed-serve-mode` | `auto` | `dev` (pnpm dev), `production` (build+start), or `auto` |
| `--no-managed-serve` | | Use existing server only |
| `--in-process` | on | Run job steps without subprocess per step |
| `--no-in-process` | | Subprocess step runner |
| `--skip-discover` | off | Skip discover when config exists |
| `--summary` | off | Print one-screen summary after completion |

Environment overrides (audit orchestrator):

- `SIGNALER_DISCOVER_SCOPE` — default discover scope
- `SIGNALER_MANAGED_SERVE=0` — disable managed serve
- `SIGNALER_MANAGED_SERVE_MODE=dev|production|auto` — serve strategy when URL is down
- `SIGNALER_JOB_IN_PROCESS=0` — disable in-process steps

## Programmatic API

Import the engine surface without the CLI god-file:

```ts
import {
  runPresetJob,
  executeEngineJob,
  ensureManagedProductionServer,
  buildAgentPresetJob,
} from "@signaler/cli/engine";
```

See `docs/specs/engine-entry-surface.md` for job presets and step runners.

## Shell routing

Argv parsing and command dispatch live under `src/shell/`. `src/bin.ts` delegates to `dispatchShellCommand`. Help text remains in `bin.ts` for now; topic help for `audit` and `run` are separate.

## Remaining compatibility aliases (unchanged in v4)

- `init` / `wizard` / `guide` → `discover` (deprecation notice)
- `review` → `report` (deprecation notice)

## Related

- `docs/roadmap/version-roadmap.md` — Phase 4 deliverables
- `AGENTS.md` — agent golden path
