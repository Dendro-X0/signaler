# Signaler Roadmap (Active)

Status: Active
Updated: 2026-03-23

This roadmap keeps only unfinished work. Completed phases/workstreams are archived under `docs/archive/roadmaps/`.

## Current Release Track

1. Publish `@signaler/cli@3.0.0` to JSR from a token-authenticated environment.
2. Confirm cross-platform smoke evidence in CI (Windows/macOS/Linux).
3. Close launch checklist before GA tag.

References:

- `docs/operations/launch-checklist.md`
- `docs/operations/release-playbook.md`
- `docs/roadmap/active-roadmap.md`

## Product Expansion Track (Open)

### Workstream J: Benchmark and Spec Coverage Expansion

- [x] Add field-data adapters (CrUX and first-party RUM) as optional external signals.
- [ ] Add broader accessibility checks aligned to WCAG 2.2 and ARIA APG.
- [ ] Add security baseline checks aligned to OWASP Top 10 / ASVS-lite.
- [ ] Add technical SEO checks aligned to Google Search Essentials.
- [ ] Add reliability/SLO metrics as optional ranking context.
- [ ] Add cross-browser/cross-device comparability snapshots.
- [ ] Execute phased plan in `docs/specs/workstream-j-implementation-plan.md`.

### Workstream K: Rust Path for New Signals

- [ ] Implement Rust normalizer/aggregator for high-volume external records.
- [ ] Implement Rust composite scoring kernel with Node fallback.
- [ ] Preserve Node/TypeScript control plane UX and contracts.
- [ ] Add parity/perf tests proving Rust/Node equivalence.

## Program Success Gate (Open)

- [ ] Reproducible `discover -> run -> analyze -> verify` in <= 10 minutes on reference fixtures.
- [ ] Median runtime and CPU improve versus V5 baseline.
- [ ] Agent output remains actionable with bounded token footprint.
- [ ] 3+ real repos complete 2+ weeks of dogfooding.
- [ ] Optional external adapter path does not regress core reliability.

## Archive

- Completed roadmap records: `docs/archive/roadmaps/`
- Completed specs: `docs/archive/specs/`
- Historical release notes: `docs/archive/release-notes/`
