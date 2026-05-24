# Engine Contracts Bootstrap Plan

Status: In progress (B1–B3 complete; B4 prep complete; runtime helper relocation pending)
Owner: Signaler core
Last updated: 2026-05-22

## Goal

Define the first implementation-ready steps for introducing `src/engine-contracts/` into the current repository without breaking the existing build.

This is the practical follow-up to:

1. `contracts-engine-vocabulary-plan.md`
2. `contracts-import-surface.md`
3. `contracts-layout-plan.md`
4. `contracts-compatibility-adapter-plan.md`

## Immediate Outcome

After this bootstrap slice, the repo should have:

1. a real `src/engine-contracts/` directory
2. an explicit contract-layer entry surface
3. compatibility re-exports or adapters for legacy imports
4. no behavior change in runtime paths yet

## Phase B1: Create the New Boundary

Create:

```text
src/engine-contracts/
  artifacts/
  signals/
  events/
  types/
  index.ts
```

### Initial Contents

Start with pure schema/type modules only:

1. V3 contracts
2. V6 contracts
3. signal contracts
4. engine event/manfiest/run-index schema/types

Avoid moving runtime helpers first.

## Phase B2: Add Stable Entry Files

Add:

```text
src/engine-contracts/artifacts/index.ts
src/engine-contracts/signals/index.ts
src/engine-contracts/events/index.ts
src/engine-contracts/types/index.ts
src/engine-contracts/index.ts
```

Purpose:

1. give future shells one small import surface
2. stop new code from depending on scattered legacy locations

## Phase B3: Introduce Compatibility Re-Exports

For legacy locations that should remain temporarily stable:

1. re-export from the new contract boundary
2. avoid duplicating schemas/types

Example pattern:

```ts
export * from "../engine-contracts/artifacts/v3/run.js";
```

Use this for:

1. V3 validators
2. V6 validators
3. stable engine schema files

Only do this where the file is a clean schema/type boundary.

## Phase B4: Defer Runtime Helpers

Do not move these into the first bootstrap slice if they still contain runtime side effects:

1. `src/engine-events.ts`
2. any helper that writes to `stdout`
3. helpers that assume CLI process context

These should remain legacy-adjacent until a shell-agnostic home is clear.

### B4 prep (complete)

Engine event/manifest/run-index/export-bundle **schemas** now live under `src/engine-contracts/events/`.
Legacy top-level `src/engine-*.ts` paths are thin re-export shims.
Runtime helpers relocated under `src/shell/` (event sink) and `src/engine/` (artifact writers).
Legacy top-level `engine-events.ts` and `write-engine-run-index.ts` are shims.

### Jobs contract (complete)

`engine-job-v1` schema + validators live under `src/engine-contracts/jobs/`.
Legacy `src/contracts/jobs/engine-job-v1.ts` is a thin re-export shim.
`job-cli.ts` imports from `engine-contracts/jobs`.

## Proposed First File Moves/Re-Exports

### Safe Early Candidates

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
11. `src/engine-contract.ts`
12. `src/engine-events-schema.ts`
13. `src/engine-manifest-schema.ts`
14. `src/engine-run-index.ts`
15. `src/engine-run-index-artifact.ts`
16. `src/engine-export-bundle-schema.ts`

### Review Candidates

1. `src/engine-json.ts`
2. selected exports from `src/types.ts`
3. selected declarations from `src/types-lighthouse.d.ts`

## Suggested Validation

After introducing the new boundary:

1. build should still pass
2. current tests that validate artifact contracts should still pass
3. any new internal imports added during reboot work should prefer `src/engine-contracts/`

## Acceptance Criteria

1. `src/engine-contracts/` exists with an explicit index surface.
2. Legacy schema imports remain functional through compatibility re-exports.
3. No shell-specific modules are required to consume the new boundary.
4. The repo is ready for the next slice: migrating engine-worthy modules to import from the new boundary.

## Out of Scope

1. Migrating all existing imports at once.
2. Extracting runners/core logic in the same slice.
3. Replacing the CLI in this step.
