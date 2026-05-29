# v4 B2B Roadmap (Post–4.0.0)

Status: Active  
Baseline: **v4.0.0** shipped (JSR)  
Last updated: 2026-05-25  
Audience: product direction, contributors, agent integrators

## Strategy

After v4.0 CLI cleanup, optimize for **team and CI adoptability** — not for collecting more audit engines.

**Primary bet:** orchestration + policy + PR truth on top of Lighthouse and existing side runners (`measure`, `bundle`, `health`, `links`, `headers`, `console`).

**Defer:** new Lighthouse alternatives, desktop shell as primary product, full dynamic-route discovery.

Positioning detail: [`../guides/b2b-team-value.md`](../guides/b2b-team-value.md).

## North-star goals (unchanged)

From [`version-roadmap.md`](./version-roadmap.md):

| Goal | B2B relevance |
|------|----------------|
| G1 Agent loop | DX teams standardize agent prompts and artifact order |
| G2 Prod truth | CI numbers match production-like builds |
| G3 Fast feedback | PR gates finish in acceptable wall clock |
| G4 Actionable output | Managers see issue counts and ranked actions, not raw LHR |
| G5 Installable | `npx jsr add` + GitHub Action without support chat |

## Version map (v4.1 → v5)

```
v4.0.x  shipped   audit orchestrator, shell/engine split, managed dev serve
v4.1.x  shipped   adoptability — docs, CI stability, portable tests (git)
v4.2.0  shipped   team CI pack — GitHub Action, job summary, templates
v4.3.0  shipped   policy gates — profiles, baseline/delta in CI
v4.4.0  shipped   stabilization — serve diagnostics, artifact trust, links discovery
v4.5.0  shipped   artifact layout — tree output, manifest, root prune (default)
v5.0.0  deferred  bundled quality profiles (implemented, release after v4.5)
```

## Phase overview

| Phase | Version | Theme | B2B outcome |
|-------|---------|-------|-------------|
| **1** | v4.1.x | Adoptability | Teams can install and trust outputs (shipped on git) |
| **2** | v4.2.0 | Team CI pack | Shipped — [`phase2-v4.2-team-ci.md`](./phase2-v4.2-team-ci.md) |
| **3** | v4.3.0 | Policy gates | Shipped — [`phase3-v4.3-policy-gates.md`](./phase3-v4.3-policy-gates.md) |
| **4.4** | v4.4.0 | Stabilization | Shipped — [`phase4.4-v4x-stabilization.md`](./phase4.4-v4x-stabilization.md) |
| **4.5** | v4.5.0 | Artifact layout | Shipped — [`phase4.5-v4.5-artifact-layout.md`](./phase4.5-v4.5-artifact-layout.md) |
| **5** | v5.0.0 | Quality profiles | **Deferred** — [`phase4-v5.0-quality-profiles.md`](./phase4-v5.0-quality-profiles.md) |

Detailed specs:

- [Phase 1 — v4.1 adoptability](./phase1-v4.1-adoptability.md) **(current)**
- [Phase 2 — v4.2 team CI](./phase2-v4.2-team-ci.md)
- [Phase 3 — v4.3 policy gates](./phase3-v4.3-policy-gates.md)

## What we are not prioritizing

| Idea | Why defer |
|------|-----------|
| More lab runners (Sitespeed, WPT, ZAP, …) | Dilutes wedge; high flake/support cost for solo maintainer |
| Hosted multi-tenant dashboard | Wrong business model until recurring demand |
| Desktop app as primary shell | See [`../specs/shell-decision-record.md`](../specs/shell-decision-record.md) |
| Replacing Lighthouse scoring | Roadmap non-goal; throughput mode is trend-oriented |

## Orchestration over engines (v5 direction)

Instead of new runners, **bundle existing checks** into named profiles:

```bash
signaler audit --quality-profile web-quality
# → Lighthouse (ci-strict) + headers + links + bundle → quality-pack.json
```

## Cross-cutting metrics

| Metric | Target |
|--------|--------|
| Time to first green CI on a new Next repo | &lt; 30 min following docs |
| PR quick audit (cached build, quick scope) | &lt; 5 min wall clock |
| Agent lean artifact read | &lt; 2 KB index; no mandatory multi-MB ingest |
| Managed-serve first-run success (reference fixtures) | ≥ 80% |
| CI false-failure rate when triage is actionable | 0% |

## Shipped track (v3.3 → v4.0)

Historical phases remain in [`version-roadmap.md`](./version-roadmap.md) under **Shipped track**.

## Related specs

- [`../specs/engine-entry-surface.md`](../specs/engine-entry-surface.md)
- [`../specs/engine-job-protocol.md`](../specs/engine-job-protocol.md)
- [`../specs/agent-artifact-protocol.md`](../specs/agent-artifact-protocol.md)
- [`../operations/jsr-release.md`](../operations/jsr-release.md)
