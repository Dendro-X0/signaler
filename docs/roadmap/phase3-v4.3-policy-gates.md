# Phase 3 — v4.3.0 Policy Gates

Status: Planned  
Parent: [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)

## Theme

**Policy-as-code** — named profiles, baseline comparison, single CI exit semantics.

## User outcome

Engineering managers configure gates in `signaler.config.json` or a policy file; CI fails on regressions with comparability-aware deltas.

## Deliverables

| ID | Deliverable |
|----|-------------|
| 4.3.1 | Named **run profiles**: `ci-strict`, `pr-quick`, `release-full` (scope, parallel, artifact profile, budgets) |
| 4.3.2 | **Quality gate** block in config: max red perf issues, min category scores, headers must-pass |
| 4.3.3 | **Baseline compare** in CI: branch vs `main` via `query --view delta` + `--baseline` |
| 4.3.4 | Unified **exit code matrix** documented for `audit`, `job run`, and Action |
| 4.3.5 | **Comparability hash** surfaced in PR output when delta is invalid |

## Exit criteria

- [ ] Team can enable `ci-strict` with one config block
- [ ] PR fails when red perf issue count increases vs baseline (configurable)
- [ ] Docs: “When deltas lie” (throughput mode, scope change, build id)

## Not in Phase 3

- New lab engines
- Multi-repo org dashboard

## Depends on

- Phase 2 GitHub Action and artifact upload
- Existing `incrementalSkip`, budgets, `comparabilityHash` in artifacts
