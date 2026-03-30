# Spec: V6.3 Success Gate Automation

Status: Implemented (March 21, 2026)  
Date: March 21, 2026  
Owners: DX + CLI maintainers  
Depends on: Workstreams F, G, H in `v6.3-adoption-roadmap.md`

## 1. Summary

This spec introduces a deterministic V6.3 success-gate evaluator so adoption readiness is machine-checkable instead of manually inferred from scattered docs/tests.

## 2. Goals

- Encode V6.3 adoption requirements as explicit checks.
- Provide a stable JSON + Markdown report shape for CI and local verification.
- Keep manual evidence checks non-blocking while still visible.

## 3. Non-Goals

- No runtime Lighthouse execution in this gate.
- No replacement of Phase 6 (V5) release gate checks.
- No contract-breaking changes to existing benchmark outputs.

## 4. Functional Requirements

## 4.1 New benchmark commands

Add scripts:

- `bench:v63:loop`
- `bench:v63:gate`
- `bench:v63:validate`

Outputs:

- `benchmarks/out/v63-loop-smoke.json`
- `benchmarks/out/v63-loop-smoke.md`
- `benchmarks/out/v63-success-gate.json`
- `benchmarks/out/v63-success-gate.md`

## 4.2 Blocking checks

Gate must fail on missing/incomplete:

1. Required V6.3 files (core docs, command implementations, and tests).
2. Canonical V6.3 flow docs coverage (`discover -> run -> analyze -> verify -> report`).
3. Local unpublished-build workflow docs (`node ./dist/bin.js ...`).
4. Runtime-budget integration (`--runtime-budget-ms`) in command path + shell completion.
5. Compact timing/planning metadata integration in `analyze --json` and `verify --json`.
6. Low-memory guidance messaging in run path.
7. Regression test coverage for runtime-budget/timing fields.

## 4.3 Warn-only checks

Gate should report warn-only/manual items for:

1. V6.3 success-gate checklist progress in roadmap docs.
2. Loop-smoke evidence file presence (`benchmarks/out/v63-loop-smoke.json`).

Loop-smoke evidence is produced by `bench:v63:loop` and is expected to represent a tiny end-to-end canonical loop pass.

## 5. Technical Design

Files:

- `benchmarks/v63/evaluate-success-gate.ts`
- `benchmarks/v63/validate.ts`
- `benchmarks/v63/report.schema.json`

Design choices:

- Reuse the existing phase-gate structure (`status`, `checks`, `summary`).
- Keep additive schema with `schemaVersion: 1`.
- Fail process with exit `1` only when `blockingFailures > 0`.

## 6. Validation Plan

1. Validator unit tests for valid and invalid summary reports.
2. Local gate run writes JSON + Markdown outputs.
3. Validator confirms summary/status consistency.

## 7. Implementation Status

- Implemented benchmark evaluator, validator, and schema.
- Added npm scripts for gate run/validate and focused test command.
- Added `bench:v63:loop` to generate concrete canonical-loop evidence.
- Added CLI/CI documentation for V6.3 gate usage.
