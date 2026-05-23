# Contracts Layout Plan

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Define the target folder and module layout for the first extraction slice so the rebooted engine has a clear home for:

1. artifact contracts
2. signal contracts
3. engine event/manfiest/run-index vocabulary
4. stable shared types

## Design Constraint

This plan should not require an immediate repo split.

It should work first as:

1. an internal module boundary in the current repo
2. a future extraction target into a shared engine package or module

## Proposed Target Layout

### Root Namespace

Suggested future root:

```text
engine/
  contracts/
```

### Artifact Contracts

```text
engine/contracts/artifacts/
  v3/
    run.ts
    results.ts
    suggestions.ts
    agent-index.ts
    validators.ts
  v6/
    analyze.ts
    verify.ts
    validators.ts
  index.ts
```

Purpose:

- canonical run/analyze/verify/report-facing artifact shapes

### Signal Contracts

```text
engine/contracts/signals/
  external-signals-v1.ts
  multi-benchmark-v1.ts
  index.ts
```

Purpose:

- optional signal input contracts

### Engine Vocabulary

```text
engine/contracts/events/
  event-schema.ts
  manifest-schema.ts
  run-index.ts
  run-index-artifact.ts
  export-bundle-schema.ts
  contract.ts
  index.ts
```

Purpose:

- engine-level shared vocabulary independent of shell

### Shared Types

```text
engine/contracts/types/
  shared.ts
  lighthouse.d.ts
  index.ts
```

Purpose:

- stable types that belong to the contract layer

### Top-Level Entry

```text
engine/contracts/index.ts
```

Purpose:

- one import surface for future shells and adapters

## Proposed Transitional Layout in Current Repo

Because the current repo should not be split all at once, the first practical form can be:

```text
src/engine-contracts/
  artifacts/
  signals/
  events/
  types/
  index.ts
```

This gives the codebase:

1. a clear extraction boundary
2. minimal initial disruption
3. a path to later move these modules into a shared engine package

## Mapping from Current Files

### Move/Copy into `artifacts/`

1. `src/contracts/v3/*`
2. `src/contracts/v6/*`

### Move/Copy into `signals/`

1. `src/contracts/external-signals-v1.ts`
2. `src/contracts/multi-benchmark-v1.ts`

### Move/Copy into `events/`

1. `src/engine-contract.ts`
2. `src/engine-events-schema.ts`
3. `src/engine-manifest-schema.ts`
4. `src/engine-run-index.ts`
5. `src/engine-run-index-artifact.ts`
6. `src/engine-export-bundle-schema.ts`
7. selected parts of `src/engine-json.ts`

### Review before moving into `events/`

1. `src/engine-events.ts`

Reason:

- current implementation writes to `stdout`
- may belong in an adapter/helper layer instead of pure contract surface

### Review before moving into `types/`

1. `src/types.ts`
2. `src/types-lighthouse.d.ts`

Reason:

- likely contains both reusable and implementation-specific types

## Entry Surface Rules

### `src/engine-contracts/index.ts`

Should export:

1. artifact schemas and validators
2. signal schemas
3. engine event/manfiest/run-index types
4. stable shared types

Should not export:

1. CLI adapters
2. `stdout` emitters
3. shell-interactive helpers
4. install/distribution utilities

## Acceptance Criteria

1. The target layout is explicit enough to begin a file move/copy plan.
2. The future contract layer has a single top-level entrypoint.
3. The current repo can adopt the layout incrementally without a full split.

## Non-Goals

1. Moving files in this document.
2. Defining the full future monorepo structure.
3. Solving engine/runtime extraction beyond the contract boundary.
