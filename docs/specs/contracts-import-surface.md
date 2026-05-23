# Contracts Import Surface

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Define the future public import surface for the first extraction slice of the Signaler reboot:

1. canonical artifact contracts
2. engine vocabulary
3. engine-facing schemas and types

This spec is the concrete follow-up to:

- `engine-module-inventory.md`
- `contracts-engine-vocabulary-plan.md`

## Problem Statement

The current repository already has strong contract material, but it is scattered across:

1. `src/contracts/*`
2. `src/engine-*`
3. selected top-level types

Future shells and engine code should not need to import these pieces ad hoc from many locations.

## Design Principle

The first extracted boundary must be:

1. small
2. explicit
3. stable
4. independent of CLI entrypoints

## Proposed Logical Namespaces

### 1. `engine/contracts/artifacts`

Purpose:

- canonical artifact shapes and validators

Contents:

1. V3 artifact contracts
2. V6 artifact contracts
3. shared artifact validators

Current source candidates:

1. `src/contracts/v3/run-v3.ts`
2. `src/contracts/v3/results-v3.ts`
3. `src/contracts/v3/suggestions-v3.ts`
4. `src/contracts/v3/agent-index-v3.ts`
5. `src/contracts/v3/validators.ts`
6. `src/contracts/v6/analyze-v6.ts`
7. `src/contracts/v6/verify-v6.ts`
8. `src/contracts/v6/validators.ts`

### 2. `engine/contracts/signals`

Purpose:

- optional signal input schemas

Contents:

1. external signals contract
2. multi-benchmark contract

Current source candidates:

1. `src/contracts/external-signals-v1.ts`
2. `src/contracts/multi-benchmark-v1.ts`

### 3. `engine/contracts/events`

Purpose:

- engine event and manifest vocabulary

Contents:

1. event schema
2. manifest schema
3. run index schema
4. engine export bundle schema

Current source candidates:

1. `src/engine-events-schema.ts`
2. `src/engine-events.ts`
3. `src/engine-manifest-schema.ts`
4. `src/engine-run-index.ts`
5. `src/engine-run-index-artifact.ts`
6. `src/engine-export-bundle-schema.ts`
7. `src/engine-contract.ts`
8. `src/engine-json.ts`

### 4. `engine/contracts/types`

Purpose:

- stable shared types used by the above namespaces

Current source candidates:

1. selected exports from `src/types.ts`
2. any engine-stable declarations from `src/types-lighthouse.d.ts`

## Proposed Public Entry Files

### `engine/contracts/index`

Exports:

1. all artifact contracts
2. all signal contracts
3. all engine event/manfiest/run-index contracts
4. stable public types

This should be the main import surface for future shells and protocol adapters.

### `engine/contracts/artifacts/index`

Exports:

1. V3 artifact schemas
2. V6 artifact schemas
3. validators

### `engine/contracts/signals/index`

Exports:

1. `external-signals-v1`
2. `multi-benchmark-v1`

### `engine/contracts/events/index`

Exports:

1. engine event schema/types
2. engine manifest schema/types
3. run index schema/types
4. export bundle schema/types

## What Should Not Be Public in This Slice

Do not export:

1. CLI entrypoints
2. shell message formatting
3. install/upgrade/uninstall helpers
4. current shell adapters
5. large mixed-boundary orchestration modules

## Proposed Export Groups

### Artifact Group

Suggested future exports:

1. `RunV3`
2. `ResultsV3`
3. `SuggestionsV3`
4. `AgentIndexV3`
5. `AnalyzeReportV6`
6. `VerifyReportV6`
7. validators for the above

### Signal Group

Suggested future exports:

1. `ExternalSignalsV1`
2. `MultiBenchmarkV1`

### Event/Manifest Group

Suggested future exports:

1. `EngineEventPayload`
2. `EngineManifestSchema`
3. `EngineRunIndex`
4. `EngineRunIndexArtifact`
5. `EngineExportBundle`
6. event emission helpers only if they remain shell-agnostic

## Initial Extraction Rule

When in doubt:

- prefer extracting schemas, validators, and plain types first
- defer helpers that write to stdout or depend on process behavior unless they clearly belong to the engine contract layer

That means `src/engine-events.ts` may need review before becoming a public export, because its current implementation writes directly to `stdout`.

## Acceptance Criteria

1. Future desktop and agent shells can import contract types from a small explicit surface.
2. Canonical artifact meanings remain centralized.
3. The first engine extraction slice has a clear public boundary.
4. No future shell needs to import from `bin.ts`, `cli.ts`, or other shell-first modules to understand engine contracts.

## Follow-Up

After this spec, the next concrete step should be:

1. choose a target folder/module layout for the contract layer
2. define the first compatibility adapter so current code can keep using the old files while the new boundary is introduced
