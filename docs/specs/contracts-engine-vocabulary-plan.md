# Contracts and Engine Vocabulary Extraction Plan

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Define the first concrete extraction slice for the Signaler reboot by isolating:

1. canonical artifact contracts
2. engine vocabulary
3. shared engine-facing schemas and types

This slice is intended to be the lowest-risk starting point because it preserves meaning before changing execution shells.

## Why This Slice First

The reboot needs a stable language for:

1. engine jobs
2. engine outputs
3. artifact validation
4. machine-readable interoperability

The current repo already contains strong candidates for that language:

### Artifact contracts

- `src/contracts/v3/*`
- `src/contracts/v6/*`
- `src/contracts/external-signals-v1.ts`
- `src/contracts/multi-benchmark-v1.ts`

### Engine vocabulary

- `src/engine-contract.ts`
- `src/engine-events-schema.ts`
- `src/engine-events.ts`
- `src/engine-export-bundle-schema.ts`
- `src/engine-manifest-schema.ts`
- `src/engine-run-index.ts`
- `src/engine-run-index-artifact.ts`
- `src/engine-json.ts`
- selected shared types from:
  - `src/types.ts`
  - `src/types-lighthouse.d.ts`

## Scope

This slice should produce a stable contract layer that future shells and engines can import.

In scope:

1. artifact schemas
2. validators
3. event payload schema
4. run index / manifest vocabulary
5. shared engine-facing types

Out of scope:

1. runner implementation
2. CLI parsing
3. desktop UI
4. engine job execution

## Target Boundary

The extracted boundary should answer these questions clearly:

1. What files can a shell or agent rely on?
2. What event payloads can the engine emit?
3. What schemas define run/analyze/verify outputs?
4. What core types are stable enough to reuse across shells?

## Candidate Output Shape

Suggested logical package/module names for the reboot:

1. `engine/contracts`
2. `engine/events`
3. `engine/types`

These do not need to become separate published packages immediately, but the repo should treat them as a coherent extraction target.

## Proposed Work

### Phase C1: Inventory and Naming

Tasks:

1. group all current contract files by responsibility
2. identify duplicate or overlapping schema helpers
3. define the future logical namespaces:
   - artifacts
   - engine events
   - engine types

Acceptance:

1. every contract file is assigned a future home

### Phase C2: Stable Entry Surface

Tasks:

1. define one or more explicit entry files for the contract layer
2. avoid requiring future shells to import from scattered source files
3. define which types are public and which remain internal

Acceptance:

1. there is a small, explicit import surface for the extracted vocabulary

### Phase C3: Compatibility Mapping

Tasks:

1. map existing CLI outputs to the future engine vocabulary
2. document any naming mismatches
3. preserve canonical artifact names unless there is a very strong reason not to

Acceptance:

1. a future desktop shell can rely on the same artifact meanings as the old CLI

## Initial Module Map

### Artifact Contracts

Keep as core candidates:

1. `src/contracts/v3/run-v3.ts`
2. `src/contracts/v3/results-v3.ts`
3. `src/contracts/v3/suggestions-v3.ts`
4. `src/contracts/v3/agent-index-v3.ts`
5. `src/contracts/v3/validators.ts`
6. `src/contracts/v6/analyze-v6.ts`
7. `src/contracts/v6/verify-v6.ts`
8. `src/contracts/v6/validators.ts`
9. `src/contracts/external-signals-v1.ts`
10. `src/contracts/multi-benchmark-v1.ts`

### Engine Vocabulary

Keep as core candidates:

1. `src/engine-contract.ts`
2. `src/engine-events-schema.ts`
3. `src/engine-events.ts`
4. `src/engine-export-bundle-schema.ts`
5. `src/engine-manifest-schema.ts`
6. `src/engine-run-index.ts`
7. `src/engine-run-index-artifact.ts`
8. `src/engine-json.ts`

### Shared Types to Review

Review carefully before extraction:

1. `src/types.ts`
2. `src/types-lighthouse.d.ts`

These may contain a mix of engine-stable and implementation-specific types.

## Deliverables

1. explicit extraction boundary for contracts and engine vocabulary
2. public import surface proposal
3. compatibility mapping for canonical artifacts
4. implementation-ready follow-up plan for extraction

## Acceptance Criteria

1. Future shell work can depend on a stable contract layer without importing CLI-specific modules.
2. Canonical artifact names and meanings remain explicit.
3. The reboot can begin implementation without redefining contracts ad hoc.

## Non-Goals

1. Performing the extraction in this document.
2. Refactoring the full runtime.
3. Deciding every future package boundary now.
