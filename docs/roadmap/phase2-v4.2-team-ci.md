# Phase 2 — v4.2.0 Team CI Pack

Status: **Shipped** (v4.2.0 tagged)  
Target line: `@signaler/cli@4.2.0`  
Parent: [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)

## Theme

**Drop into GitHub in ~10 minutes** — official Action, PR feedback, artifact upload.

## User outcome

A team adds Signaler to PR CI without writing custom shell scripts; reviewers see a one-screen summary and pass/fail without opening HTML reports.

## Deliverables

| ID | Deliverable | Owner surface | Status |
|----|-------------|---------------|--------|
| 4.2.1 | Official **composite GitHub Action** | `.github/actions/signaler/action.yml` | Done |
| 4.2.2 | Upload `.signaler/` artifacts | action input `upload-artifacts` | Done |
| 4.2.3 | **Job summary** from `report --summary` + `query --view perf` | action step | Done |
| 4.2.4 | Optional **Check Run** annotation from verify/triage | TBD | Todo |
| 4.2.5 | Document matrix / monorepo `cwd` | `docs/guides/github-actions.md` | Done |
| 4.2.6 | Workflow templates use managed serve + v4 presets | `.github/workflow-templates/` | Done |
| 4.2.7 | `preset ci` exit-code doc for Action consumers | `docs/guides/github-actions.md` | Todo |
| 4.2.8 | Meta-CI dogfood workflow on this repo | `.github/workflows/` | Todo |

## Exit criteria

- [ ] Sample repo PR shows Signaler summary in job summary panel
- [ ] Failed verify/triage fails the check with readable message
- [ ] Action documented with copy-paste YAML ([`github-actions.md`](../guides/github-actions.md))
- [ ] Dogfood Action on `signaler` repo (workflow_dispatch)
- [ ] **Version bump to 4.2.0** in `package.json` + `jsr.json` before JSR publish

## Kickoff — first slices

### Slice A — Action + docs (done in repo)

1. Composite action: `.github/actions/signaler/action.yml`
2. Guide: `docs/guides/github-actions.md`
3. Workflow templates updated (pnpm/npm/yarn)

### Slice B — Dogfood (next)

1. Add `.github/workflows/signaler-dogfood.yml` (`workflow_dispatch` only)
2. Run against a minimal fixture or `site/` if applicable

### Slice C — Release 4.2.0

1. Bump **4.2.0** in `package.json`, `jsr.json`, CHANGELOG, release notes
2. Update default `cli-version` in action + templates to `4.2.0`
3. `pnpm run release:preflight` → `pnpm run jsr:publish`

## Not in Phase 2

- SARIF export (optional stretch → Phase 3 or 4.2.x patch)
- Hosted dashboard
- Org-level config service

## Depends on

- Phase 1 adoptability docs (shipped on git as 4.1.0 line)
- Stable `signaler audit --summary` and `query --view delta`

## Related

- [`../guides/github-actions.md`](../guides/github-actions.md)
- [`../operations/jsr-release.md`](../operations/jsr-release.md)
