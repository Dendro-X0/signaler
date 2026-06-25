# Release Notes - v5.2.1

**Date:** 2026-06-18  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

**v5.2.1** is a lean cleanup release after v5.2.0: faster attach retries via explore cache, `cli.ts` argument parsing extracted, dead code removed, and clearer deprecation warnings ahead of v5.3.0.

## Added

- **Explore cache** — fresh `.signaler/explore.json` reused for 5 minutes on rerun (no full rescan).
- **`pnpm run lint`** — Biome on explore/shell/run-args modules.
- **`server-not-ready.json`** — `portHints` and `serveRoot` fields for agents.

## Changed

- `parseRunCliArgs` moved to `src/cli/run-args.ts`.
- Alias warnings (`init`, `review`) target v5.3.0 removal.
- Version banner quick start reflects bootstrap-first flow.

## Removed

- Unused `measure-runner.ts` / `measure-types.ts` shims.
- Deprecated `resolveServeEnvForProject` wrapper.

## Fixed

- **`explore --cwd`** — writes `.signaler/explore.json` under the target project.

## Install / upgrade

```bash
SIGNALER_VERSION=5.2.1 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.2.1"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

Or: `signaler upgrade` (if already on the portable install).

## Try it (production CLI)

```bash
# Terminal 1
pnpm dev

# Terminal 2
signaler bootstrap --audit --yes --cwd .
signaler query --view agent --dir .signaler
```

## Deprecation warnings (no breaking changes in 5.2.1)

- Default `--contract legacy` — use `--contract v3`.
- `.apex-auditor` output dir fallback — use `.signaler`.

Removal planned in **v5.3.0**.
