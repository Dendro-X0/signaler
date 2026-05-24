# Engine Isolation Plan

Status: In progress (E1 inventory drafted; E3 thin adapter started)
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Identify how the current Signaler codebase can be split into:

1. reusable engine-worthy logic
2. legacy shell/distribution surfaces
3. candidate code to retire

This is the first concrete planning step toward the rebooted shared local engine.

## Principle

We are not trying to preserve the current CLI packaging architecture.

We are trying to preserve the useful runtime behavior and artifact workflow.

## Target Boundaries

### Engine-Worthy

Keep or extract logic that is about:

1. discovery
2. audit execution
3. analyze
4. verify
5. report generation
6. artifact serialization
7. deterministic ranking and comparison logic

### Shell-Specific / Legacy

Do not treat the following as core engine by default:

1. CLI argument parsing
2. installer/distribution scripts
3. shell-specific messaging/help
4. current registry/distribution glue

### Candidate to Retire

Strong candidates for de-emphasis or retirement:

1. any logic only needed to support brittle CLI distribution behavior
2. duplicated shell onboarding paths
3. UI shells that do not align with the reboot direction

## Initial Module Mapping

### Likely Engine-Worthy Areas

Candidate areas from the current repo:

1. `src/analyze-cli.ts`
2. `src/verify-cli.ts`
3. large parts of `src/cli.ts` that perform actual run orchestration
4. `src/rust/*` adapters and contracts that express real engine boundaries
5. artifact contracts under `src/contracts/*`
6. reporting logic under `src/reporting/*`
7. runner logic under `src/runners/*`
8. selected core logic under `src/core/*`

### Likely Legacy Shell Areas

Candidate areas:

1. `src/bin.ts`
2. `src/shell-cli.ts`
3. `src/tui-cli.ts`
4. `release-assets/*`
5. packaging/release helper scripts

### Areas to Review Carefully

These may contain a mix of engine and shell logic and should be split rather than kept as-is:

1. `src/cli.ts`
2. `src/wizard-cli.ts`
3. `src/help-routing.ts`
4. `src/quickstart-cli.ts`

## Phase E1: Inventory

Tasks:

1. identify engine-worthy modules
2. identify shell-only modules
3. identify mixed-boundary modules

Output:

- a module inventory table

## Phase E2: Boundary Contracts

Tasks:

1. define engine entrypoints independent of CLI parsing
2. define job input contract
3. define status/output contract

Output:

- engine interface draft

### E2 (complete for v1 jobs)

See `engine-entry-surface.md`.

1. Input contract: `EngineJobV1` (`engine-contracts/jobs`).
2. Output contract: `EngineJobResultV1` + `EngineJobRunOutcome` (`src/engine/jobs/types.ts`).
3. Entrypoints: `build*PresetJob`, `executeEngineJob`, injectable `EngineJobStepRunner`.
4. `job-cli.ts` is a shell adapter over `src/engine/`.

## Phase E3: Thin Adapter Layer

Tasks:

1. make old CLI call the new engine boundary where practical
2. treat old shell code as an adapter rather than the core

Output:

- transitional compatibility plan

### E3 slice (started)

1. `src/shell/` — shell I/O adapters (`emit-engine-event.ts` writes NDJSON to stdout).
2. `src/engine/` — engine artifact writers (`artifacts/write-run-index.ts`).
3. Legacy top-level `src/engine-events.ts` and `src/write-engine-run-index.ts` remain as shims.
4. `cli.ts` and `folder-cli.ts` import from `shell/` and `engine/` entry surfaces.

## Acceptance Criteria

1. Current repo modules are categorized into engine-worthy vs shell-specific buckets.
2. Mixed-boundary files are explicitly identified for later extraction.
3. The reboot can start implementation without re-litigating which parts of the current repo still matter.

## Non-Goals

1. Extracting the engine immediately in this doc.
2. Preserving the current file tree as sacred.
3. Designing the final monorepo structure in one pass.
