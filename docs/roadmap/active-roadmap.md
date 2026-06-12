# Active Roadmap

Status: Active  
Updated: 2026-05-29

## Current focus

**v5.0.0 shipped** — quality profiles bundle Lighthouse + side runners with a unified pack gate.

- Release: [`../archive/release-notes/RELEASE-NOTES-v5.0.0.md`](../archive/release-notes/RELEASE-NOTES-v5.0.0.md)
- Plan: [`phase4-v5.0-quality-profiles.md`](./phase4-v5.0-quality-profiles.md)

### Next

- Optional bundle byte budgets in `qualityPack`
- ~~Multi-benchmark auto-bridge from runner outputs~~ **Shipped (6A)**
- ~~Benchmark family gates in `quality-pack.json`~~ **Shipped (6B)** — per-family metrics + inherited thresholds
- ~~Baseline/delta for benchmark signal plane~~ **Shipped (6C)** — `query --view delta` + baselineCompare policy

## Shipped — Phase 5 (v5.0.0)

`--quality-profile web-quality|pr-quality`: headers, links, health, console, measure, accessibility, bundle + `gates/quality-pack.json`.

## Shipped — Phase 4.5 (v4.5.0)

Tree `.signaler/` layout: `manifest.json`, `INDEX.md`, `agent/`, `developer/`, `runners/`, `gates/`, root prune.

## Shipped — Phase 4.4 (v4.4.0)

Details: [`phase4.4-v4x-stabilization.md`](./phase4.4-v4x-stabilization.md)

## Shipped — Phase 3 (v4.3.0)

Policy gates and run profiles. Details: [`phase3-v4.3-policy-gates.md`](./phase3-v4.3-policy-gates.md)

## Index

- [`roadmap/README.md`](./README.md)
- [`v4-b2b-roadmap.md`](./v4-b2b-roadmap.md)
