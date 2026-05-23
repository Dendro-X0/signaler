# Contracts Compatibility Adapter Plan

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Define how the current codebase can transition to the extracted contract layer without a big-bang refactor.

## Problem Statement

Even if the target layout is clear, the current repo still imports contracts and engine vocabulary directly from legacy locations.

To keep the reboot practical, the transition needs an adapter phase rather than a full rewrite.

## Strategy

Use a staged compatibility approach:

1. introduce the new contract-layer entry surface
2. keep old modules temporarily re-exporting from the new locations
3. migrate imports gradually
4. remove legacy compatibility files only after shells/engine consumers have switched

## Transitional Phases

### Phase A1: Introduce New Entry Surface

Tasks:

1. add the new `src/engine-contracts/` boundary
2. create `index.ts` entrypoints for:
   - artifacts
   - signals
   - events
   - types
3. keep behavior unchanged

Acceptance:

1. current code can import from either old or new contract locations

### Phase A2: Legacy Re-Exports

Tasks:

1. update old files to re-export from the new boundary where reasonable
2. keep file names stable temporarily to minimize churn

Example:

```ts
export * from "../engine-contracts/artifacts/v3/run.js";
```

Acceptance:

1. the repo still builds
2. callers are not forced to migrate in one pass

### Phase A3: Incremental Import Migration

Tasks:

1. migrate engine-worthy modules first
2. migrate desktop/engine code next
3. migrate legacy CLI adapters last

Acceptance:

1. new code depends on the new boundary
2. old shell code can lag behind temporarily

### Phase A4: Remove Legacy Paths

Tasks:

1. remove re-export shims
2. update remaining imports
3. simplify the public surface

Acceptance:

1. no internal code depends on the legacy contract paths

## Candidate Adapter Rules

1. prefer re-export shims over copy-paste duplication
2. do not move mixed-boundary helpers into the contract layer
3. keep validators close to their schemas
4. avoid changing JSON field names during the adapter phase

## Import Migration Order

### Migrate First

1. future engine-facing modules
2. reporting modules that consume canonical artifacts
3. reboot-specific engine work

### Migrate Later

1. CLI entrypoints
2. shell UI code
3. installer/distribution scripts

## Acceptance Criteria

1. The new contract layer can be introduced without breaking the current build.
2. The transition path is gradual and inspectable.
3. Future reboot work can target the new boundary immediately.

## Non-Goals

1. Hiding every compatibility layer from internal code instantly.
2. Moving mixed-boundary files without review.
3. Performing full extraction in this document.
