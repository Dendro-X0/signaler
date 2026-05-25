# Phase 1 — v4.1.x Adoptability

Status: Shipped (git **4.1.0** line)  
Parent: [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)

> Superseded by [Phase 2 — v4.2 team CI](./phase2-v4.2-team-ci.md) for active development.

## Theme

Make v4 **easy to install, easy to trust, and easy to dogfood** before investing in GitHub Action and policy work (Phase 2–3).

## User outcome

A platform engineer or agent integrator can:

1. Install from JSR and run `signaler audit` on a Next app without reading chat logs.
2. Explain to their team what P(ref) and throughput mode mean.
3. Point two reference repos at shared CI templates with predictable exit codes.

## Deliverables

| ID | Deliverable | Owner surface | Status |
|----|-------------|-------------|--------|
| 4.1.1 | **Patch release hygiene**: `4.0.1`+ on JSR with changelog for CI/test fixes post-4.0.0 | `CHANGELOG.md`, `jsr.json`, `docs/operations/jsr-release.md` | In progress |
| 4.1.2 | **Trust doc for teams**: P(ref), throughput vs fidelity, artifact order on README + site | `README.md`, `site/`, `docs/guides/lab-semantics.md` | Todo |
| 4.1.3 | **Team onboarding page**: link B2B guide, migration v4, canonical CI commands | `docs/guides/b2b-team-value.md`, `docs/guides/getting-started.md` | Todo |
| 4.1.4 | **JSR install smoke** documented and scripted | `docs/operations/jsr-release.md`, `pnpm test:smoke` | Todo |
| 4.1.5 | **CI template audit**: verify `.github` workflow templates use `job run --preset ci` + v4 flags | `docs/examples/`, template YAML if present | Todo |
| 4.1.6 | **Dogfood checklist**: blogkit + ecommerce monorepo steps with expected timings | `docs/operations/dogfood-checklist.md` | Todo |
| 4.1.7 | **Portable test fixtures only**: no hardcoded `E:/` paths in tests (CI green) | `test/fixtures/`, `vitest.config.ts` | Done |
| 4.1.8 | **Active roadmap sync**: `active-roadmap.md` points here | `docs/roadmap/` | Done |

## Exit criteria

- [ ] `@signaler/cli@4.1.0` (or latest patch) published on JSR; install smoke passes
- [ ] README “For teams” section links trust + B2B guide + migration v4
- [ ] `docs/operations/dogfood-checklist.md` exists with two reference apps and pass/fail signals
- [ ] CI templates documented for `preset ci` and `preset pr`
- [ ] All GitHub CI jobs green on `main` (test 18/20/22, quality, cross-platform-smoke, phase6-gate)
- [ ] No test references machine-specific absolute paths outside fixtures

## Not in Phase 1

- Official GitHub Action (Phase 2)
- SARIF / PR comment bot (Phase 2)
- Named policy profiles / budget packs (Phase 3)
- Bundled `web-quality` profile (v5)
- New audit engines beyond existing side runners

## Kickoff — first implementation slice

Work in this order:

### Slice A — Docs (no code risk)

1. Add README “For teams” section (trust + links).
2. Create `docs/operations/dogfood-checklist.md`.
3. Cross-link from `docs/README.md` and `active-roadmap.md`.

### Slice B — Release

1. Bump to `4.1.0` when Phase 1 doc slice lands (or `4.0.2` if only CI fixes).
2. `pnpm run release:preflight` + `pnpm run jsr:publish`.
3. Tag `v4.1.0` for portable GitHub Release if needed.

### Slice C — Template verification

1. Find CI workflow templates in repo; align with v4 `audit` / `job run --preset ci`.
2. Add one integration test or doc-only gate that lists required template strings.

## Verification commands

```bash
# Local parity with CI
CI=true pnpm test:full
CI=true pnpm test:coverage
pnpm run release:preflight

# Install smoke (post-publish)
npx jsr run @signaler/cli@4.1.0 -- --version
npx jsr run @signaler/cli@4.1.0 -- help audit

# Dogfood (manual — see dogfood-checklist)
signaler audit --cwd ../next-blogkit-pro --base-url http://127.0.0.1:3000
```

## Success metrics (Phase 1)

| Metric | Target |
|--------|--------|
| New team time-to-first-audit (following docs) | &lt; 15 min |
| Support questions about “score vs DevTools” | Addressed by trust doc |
| CI green rate on `main` | 100% over 7 days |

## After Phase 1

Proceed to [Phase 2 — v4.2 team CI](./phase2-v4.2-team-ci.md): GitHub Action, PR summary, check annotations.
