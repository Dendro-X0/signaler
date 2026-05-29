# Benchmark output (ephemeral)

This directory is **gitignored**. Local runs and CI write gate reports, baselines, and smoke evidence here.

**Do not commit** files from this folder — they change on every `bench:*:gate` run (`generatedAt` timestamps and version strings).

## Committed snapshots

Release preflight and validators read committed copies under [`../fixtures/`](../fixtures/).

After regenerating gates locally, refresh fixtures once per release:

```bash
pnpm run bench:phase6:gate
pnpm run bench:v3:gate
pnpm run bench:v63:gate
pnpm run bench:workstream-j:gate
pnpm run bench:sync-fixtures
git add benchmarks/fixtures/
```

## JSR publish

`jsr publish` requires a clean git worktree. If only `benchmarks/out/` changed, discard those files or run from a clean tree:

```bash
git restore benchmarks/out/
pnpm run jsr:publish
```
