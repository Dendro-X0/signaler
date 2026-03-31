# Testing Reference

This document defines the canonical test and validation workflow for Signaler.

## Scope

Testing in this repository is split into four layers:

1. Unit and integration tests (`vitest`).
2. Contract and gate validators (V3, Phase 6, V6.3).
3. End-to-end smoke evidence generation.
4. Release preflight checks.

## Quick Start

Run these from the `signaler` repository root.

```bash
# Core test suite
pnpm test:full

# Fast smoke checks
pnpm test:smoke
pnpm test:phase6:smoke

# Coverage
pnpm test:coverage
```

## Canonical Gate Commands

```bash
# V3 release gate
pnpm run bench:v3:gate
pnpm run bench:v3:validate

# Phase 6 release gate
pnpm run bench:phase6:gate
pnpm run bench:phase6:validate

# V6.3 success gate
pnpm run bench:workstream-j:overhead
pnpm run bench:workstream-k:rust-benchmark
pnpm run bench:fixture:accessibility -- --summary .signaler/accessibility-summary.json --issues .signaler/issues.json --out .signaler/benchmark-accessibility.json
pnpm run bench:fixture:security -- --headers .signaler/headers.json --issues .signaler/issues.json --out .signaler/benchmark-security.json
pnpm run bench:fixture:reliability -- --health .signaler/health.json --issues .signaler/issues.json --out .signaler/benchmark-reliability.json
pnpm run bench:fixture:seo -- --results .signaler/results.json --links .signaler/links.json --issues .signaler/issues.json --out .signaler/benchmark-seo.json
pnpm run bench:fixture:parity -- --snapshots .signaler/cross-browser-snapshots.json --issues .signaler/issues.json --out .signaler/benchmark-parity.json
pnpm run bench:v63:gate
pnpm run bench:v63:loop
pnpm run bench:v63:validate
```

## Release Preflight

```bash
# Local dry run (expected warn locally if CI cross-platform evidence is missing)
pnpm run release:preflight -- --dry-run --skip-commands

# Strict mode for release-candidate checks
pnpm run release:preflight -- --strict
```

## Test File Conventions

- Unit/integration tests: `test/*.test.ts`
- Gate validators: `benchmarks/**/validate.ts`
- Gate evaluators: `benchmarks/**/evaluate-*.ts`
- Evidence outputs: `benchmarks/out/*.json` and `benchmarks/out/*.md`

Naming guidance:

- Keep one responsibility per test file.
- Use deterministic fixtures for gate tests.
- Prefer explicit assertions over snapshot-only checks for contracts.

## When Adding a New CLI Feature

1. Add or update focused unit tests under `test/`.
2. Update gate evaluator checks if release policy is affected.
3. Update schemas/validators when output contracts change.
4. Update docs command examples in:
   - [`cli.md`](./cli.md)
   - [`getting-started.md`](../guides/getting-started.md)
   - [`launch-checklist.md`](../operations/launch-checklist.md)
5. Run the gate commands listed above before merge/release.

## Troubleshooting

- If `pnpm` PowerShell policy blocks script execution on Windows, use `pnpm.cmd`.
- If a gate fails locally due to missing cross-platform evidence, run in CI matrix or provide the expected `cross-platform-smoke-*.json` artifacts.
- If docs-related gate checks fail, verify links and required canonical files in [`docs/README.md`](../README.md).

## Related Docs

- [`CLI Reference`](./cli.md)
- [`Configuration Reference`](./configuration.md)
- [`Contracts: V3`](./contracts-v3.md)
- [`Contracts: V4`](./contracts-v4.md)
- [`Release Playbook`](../operations/release-playbook.md)
- [`Launch Checklist`](../operations/launch-checklist.md)
- [`Active Roadmap`](../roadmap/active-roadmap.md)
