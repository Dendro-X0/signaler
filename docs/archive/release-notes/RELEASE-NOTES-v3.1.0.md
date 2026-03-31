# Signaler v3.1.0 Release Notes

Release date: 2026-03-30

## Summary

`v3.1.0` extends the V3 line with optional multi-source benchmark signal inputs and stronger agent-facing documentation for deterministic automation workflows.

## Highlights

- Added Workstream J optional benchmark-signal fixture adapters for:
  - `accessibility-extended`
  - `security-baseline`
  - `reliability-slo`
  - `seo-technical`
- Added deterministic CLI fixture builders for each adapter and integration into benchmark signal loading (`--benchmark-signals`).
- Extended tests and docs to cover multi-source fixture workflows and release/readiness evidence paths.
- Kept non-Lighthouse benchmark inputs opt-in and non-blocking by default.

## Upgrade Notes

1. Existing `discover -> run -> analyze -> verify -> report` workflows are backward-compatible.
2. Multi-source inputs are optional; teams can adopt them incrementally via local fixture files.
3. For release validation, run:
   - `pnpm run bench:workstream-j:overhead`
   - `pnpm run bench:v63:gate`
   - `pnpm run release -- --target-version 3.1.0`
