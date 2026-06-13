# Signaler for Teams and B2B

Status: Active  
Audience: platform engineers, DX leads, agency tech leads, solo maintainers planning product direction  
Last updated: 2026-05-25

## One-line pitch

Signaler turns **route-scale web labs** into a **deterministic CI and agent workflow** — discover, audit, triage, verify, and report — with machine outputs sized for automation, not dashboards.

## Where teams get productivity value

| Team pain | Signaler answer |
|-----------|-----------------|
| CI only audits one URL; the app has dozens of routes × devices | Matrix orchestration, scope profiles, incremental skip |
| Coding agents drown in `.signaler/` or chase headline Lighthouse scores | `query` / `explain`, lean profiles, issue-count triage, P(ref) semantics |
| Local vs CI performance numbers never match prod | Managed serve (dev → production), monorepo serve plans |
| “Did the fix work?” is subjective | `verify` with pass/fail exit codes for CI and agent loops |
| Humans and automation need the same contract | `signaler audit`, `job run --preset ci\|pr`, stable JSON artifacts |

## Primary buyer personas

1. **Platform / DX engineers** — standardize web quality gates across many frontend repos.
2. **Product engineering teams** — especially Next.js monorepos needing repeatable lab runs in CI.
3. **Agencies and consultancies** — batch audits across client apps with comparable artifacts.
4. **Teams using coding agents** — need token-bounded, evidence-linked handoffs instead of raw Lighthouse JSON.

## What Signaler is not (honest boundaries)

- Not a hosted RUM or synthetic monitoring SaaS (SpeedCurve, Datadog, Checkly).
- Not a security/compliance platform (no SSO org model, no SOC2 dashboard).
- Not a Lighthouse replacement — Lighthouse remains the **performance lab anchor**.
- Not DevTools score parity in throughput mode — see [`lab-semantics.md`](./lab-semantics.md) and P(ref) trust copy.

Compete on **orchestration, comparability, closure** (analyze → verify → delta), not on collecting every possible audit engine.

## Positioning vs alternatives

See [`signaler-vs-alternatives.md`](./signaler-vs-alternatives.md) for tool-by-tool comparison.

**B2B wedge:** the only local/CI runner that ships a full-route lab **and** an agent-first verification loop in one contract.

## Recommended team workflows

### Greenfield / local

```bash
signaler audit --cwd . --base-url http://127.0.0.1:3000
signaler query --view perf --dir .signaler
signaler verify --contract v6 --dir .signaler
```

### Pull request (today)

```bash
signaler job run --preset pr --managed-serve --in-process --cwd .
signaler query --view delta --dir .signaler
```

### CI strict gate (today)

```bash
signaler job run --preset ci --managed-serve --in-process --cwd .
# exit code + verify.json / performance-triage.json for gate logic
```

Phase 2 ([`../roadmap/phase2-v4.2-team-ci.md`](../roadmap/phase2-v4.2-team-ci.md)) adds first-class GitHub Action and PR summaries.

## Artifact read order for automation

Prefer projections over ingesting all of `.signaler/`:

1. `signaler query --view agent`
2. `signaler query --view perf`
3. `.signaler/analyze.json`
4. `.signaler/verify.json`
5. `signaler explain --id <issue-id>` before loading full `results.json`

## Adoption and install (today)

Signaler is distributed through **GitHub Release installers only** — not npm or JSR. Teams should standardize on one install path per OS family:

- **Windows + Git Bash** (common in Cursor/VS Code): `install.sh`
- **Windows PowerShell**: `install.ps1`
- **macOS / Linux / CI**: `install.sh` or the [GitHub Action](./github-actions.md)

See [install matrix](./install-matrix.md) for shell-specific commands, upgrade rules, and PATH cleanup after uninstall.

**First install takes 5–15 minutes** while npm pulls Lighthouse, Playwright, and related tooling inside the portable bundle. Plan onboarding accordingly — CI should use the Action or `install.sh` in the workflow, not expect instant `npx` installs.

## Cost controls teams care about

- Artifact profiles: `lean` (default for agents), `standard`, `diagnostics`
- Token budgets: `--artifact-profile`, `--machine-token-budget`, `--token-budget`
- Incremental skip and `--build-id` for cached reruns

## Multi-repo strategy (solo maintainer)

Use Signaler as the **horizontal DX product**; dogfood it in other public repos via shared CI templates (`job run --preset ci`). Other repos become proof, not separate quality products.

## Related docs

- [`../roadmap/v4-b2b-roadmap.md`](../roadmap/v4-b2b-roadmap.md) — post-v4.0 release phases
- [`../roadmap/phase1-v4.1-adoptability.md`](../roadmap/phase1-v4.1-adoptability.md) — current phase
- [`install-matrix.md`](./install-matrix.md) — OS × shell install contract
- [`agent-quickstart.md`](./agent-quickstart.md)
- [`migration-v4.md`](./migration-v4.md)
