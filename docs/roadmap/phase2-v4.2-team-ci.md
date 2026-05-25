# Phase 2 — v4.2.0 Team CI Pack

Status: Planned (starts after Phase 1 exit criteria)  
Parent: [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)

## Theme

**Drop into GitHub in ~10 minutes** — official Action, PR feedback, artifact upload.

## User outcome

A team adds Signaler to PR CI without writing custom shell scripts; reviewers see a one-screen summary and pass/fail without opening HTML reports.

## Deliverables

| ID | Deliverable |
|----|-------------|
| 4.2.1 | Official **GitHub Action** (`signaler audit` or `job run --preset pr`) |
| 4.2.2 | Upload `.signaler/` artifacts on workflow completion |
| 4.2.3 | **PR comment** or job summary from `report --summary` + `query --view perf` |
| 4.2.4 | Optional **GitHub Check Run** annotation from `verify.json` / triage reds |
| 4.2.5 | Document matrix strategy (Node 20, pnpm, monorepo `cwd`) |
| 4.2.6 | `preset ci` hardened defaults for `--artifact-profile lean`, exit codes |

## Exit criteria

- [ ] Sample repo PR shows Signaler summary comment within 2 min of workflow start (cached build)
- [ ] Failed verify/triage fails the check with readable message
- [ ] Action README on JSR / repo docs with copy-paste YAML
- [ ] Dogfood Action on `signaler` repo itself (meta-CI)

## Not in Phase 2

- SARIF export (optional stretch — may move to 4.2.1 or 4.3)
- Hosted dashboard
- Org-level config service

## Depends on

- Phase 1 trust docs and install smoke
- Stable `signaler audit --summary` and `query --view delta`
