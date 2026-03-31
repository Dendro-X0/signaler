# Launch Checklist

Use this checklist before publishing a release candidate or GA release.

Playbook:

- [`release-playbook.md`](release-playbook.md)

## SLO and Gate Status

- [ ] Cross-platform smoke matrix is green (Windows/macOS/Linux).
- [x] Phase 0/2/4 benchmark and soft gates are green.
- [x] Phase 6 release gate report status is `ok` or `warn` (no blocking failures).
- [x] Release-standardization gate report status is `ok` or `warn` (no blocking failures).
- [ ] Workstream J optional-input overhead evidence is refreshed and passing.
- [x] Canonical workflow (`discover -> run -> report`) is verified end-to-end.

Run:

```bash
pnpm run bench:phase0:ci
pnpm run bench:phase0:validate
pnpm run bench:phase2:gate
pnpm run bench:phase4:gate
pnpm run bench:workstream-j:overhead
pnpm run test:phase6:gate
pnpm run bench:phase6:gate
pnpm run bench:phase6:validate
pnpm run bench:v3:phase1
pnpm run bench:v3:phase2
pnpm run bench:v3:gate
pnpm run bench:v3:validate
pnpm run release -- --target-version 3.1.0
```

Cross-platform note:

- CI emits `benchmarks/out/cross-platform-smoke-<os>.json` evidence artifacts in the `cross-platform-smoke` matrix job and Phase 6 gate validates them in CI mode.

## Docs Consistency

- [x] `README.md` command examples use canonical flow by default.
- [x] `docs/README.md` links include all Phase 6 docs.
- [x] `docs/reference/cli.md` includes Phase 6 scripts and template references.
- [x] Migration docs (`migration-v3.md`, `migration-v4.md`) are still linked and present.
- [x] Release notes file exists for current package version.

## Dogfood Evidence (Manual, Warn-Only)

Complete at least 3 real repos with 2+ weeks of usage evidence.

Primary source for the release-standardization gate:

- `release/v3/dogfood-evidence.json` (preferred machine-readable source)

Helpers:

```bash
pnpm run v3:dogfood:list
pnpm run v3:dogfood upsert --repo <repo> --owner <owner> --start <YYYY-MM-DD> --end <YYYY-MM-DD> --notes "<notes>"
```

| Repo | Owner | Start Date | End Date | Notes |
| --- | --- | --- | --- | --- |
| next-blogkit-pro | Dendro-X0 | 2026-02-20 | 2026-03-12 | Local unpublished build dogfood discover run analyze verify report |
| next-ecommercekit-monorepo | Dendro-X0 | 2026-02-18 | 2026-03-09 | Monorepo audit loops with baseline versus current checks and report artifacts |
| nuxt-t | Dendro-X0 | 2026-02-22 | 2026-03-14 | Cross framework smoke and analyzer ranking validation using local dist bin |

