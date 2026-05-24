# Engine Module Inventory

Status: In progress (aligned with `engine-contracts/` bootstrap)
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Create the first concrete module inventory for the Signaler reboot so future extraction work can separate:

1. engine-worthy logic
2. shell/distribution-specific logic
3. mixed-boundary modules that need refactoring before extraction

## Inventory Rules

### Engine-Worthy

Modules that directly express:

1. discovery
2. run orchestration
3. analyze/verify/report logic
4. artifact serialization
5. runner behavior
6. deterministic contracts

### Shell-Specific

Modules that primarily express:

1. CLI argument parsing
2. shell interactivity
3. installation/distribution behavior
4. shell-specific help/output
5. registry/release bootstrap flows

### Mixed-Boundary

Modules that contain both engine-worthy and shell-specific behavior and should eventually be split.

## Top-Level Directory Classification

### Engine-Worthy Directories

#### `src/engine-contracts/`

Reason:

- canonical contract surface for artifacts, signals, events, and jobs
- legacy `src/contracts/*` paths are compatibility shims

#### `src/engine/`

Reason:

- engine-side artifact serialization and future engine runtime helpers
- started with `artifacts/write-run-index.ts`

#### `src/shell/`

Reason:

- shell-specific I/O adapters (stdout NDJSON events, future UI bridges)
- started with `emit-engine-event.ts`

#### `src/core/`

Reason:

- audit engine
- scheduler
- plugin/runtime coordination

Notes:

- likely high-value extraction target

#### `src/reporting/`

Reason:

- deterministic report generation
- processors/generators over canonical data

#### `src/runners/`

Reason:

- execution backends for lighthouse/measure/health/headers/links/accessibility

#### `src/rust/`

Reason:

- explicit acceleration/runtime boundary adapters

#### `src/plugins/`

Reason:

- domain-specific audit logic

#### `src/infrastructure/`

Reason:

- shared filesystem/network/platform/security helpers

### Likely Shell/Presentation Directories

#### `src/ui/`

Reason:

- presentation layer
- not core engine by default

#### `src/cortex/`

Reason:

- optional assistant surface
- likely shell/product-surface logic rather than durable engine baseline

### Mixed/Needs Review Directories

#### `src/cli/`

Reason:

- likely contains command-surface abstractions and helper logic
- needs review for reusable pieces vs shell coupling

#### `src/content/`

Reason:

- likely docs/help/content support
- may not belong to engine

#### `src/lib/`

Reason:

- generic bucket; needs explicit audit

#### `src/utils/`

Reason:

- generic bucket; needs explicit audit

## Top-Level File Classification

### Engine-Worthy Candidates

#### `src/analyze-cli.ts`

- contains core analyze workflow
- should become engine action rather than shell-specific command

#### `src/verify-cli.ts`

- contains verification workflow
- should become engine action

#### `src/report-cli.ts`

- likely maps cleanly to engine-side report generation trigger

#### `src/project-discovery.ts`

- reusable discovery logic

#### `src/route-detectors.ts`

- reusable discovery/runtime logic

#### `src/lighthouse-runner.ts`

- major engine runtime component

#### `src/lighthouse-capture.ts`

- engine-side artifact capture

#### `src/runner-reporting.ts`

- candidate engine/report boundary module

#### `src/performance-budget.ts`

- reusable validation/policy logic

#### `src/machine-output-profile.ts`

- useful engine output-policy logic if still relevant

#### `src/engine-contracts/events/` and legacy `src/engine-*.ts` shims

Includes event/manifest/run-index/export schemas (canonical under `engine-contracts/events/`).

#### `src/engine-events.ts` / `src/write-engine-run-index.ts` (shims)

- re-export from `src/shell/` and `src/engine/` respectively
- prefer `shell/index.js` and `engine/index.js` in new code

#### `src/engine-json.ts`, `src/engine-version.ts`

Reason:

- engine vocabulary / versioning helpers (review before public export)

### Shell-Specific Candidates

#### `src/bin.ts`

- top-level CLI launcher

#### `src/shell-cli.ts`

- interactive shell surface

#### `src/tui-cli.ts`

- TUI shell surface

#### `src/cortex-cli.ts`

- assistant shell surface

#### `src/quickstart-cli.ts`

- onboarding shell flow

#### `src/help-routing.ts`

- shell/help surface

#### `src/install-shim-cli.ts`

- distribution/bootstrap only

#### `src/upgrade-cli.ts`

- distribution/bootstrap only

#### `src/uninstall-cli.ts`

- distribution/bootstrap only

#### `src/clean-cli.ts`

- shell/distribution maintenance surface

#### `src/clear-screenshots-cli.ts`

- shell maintenance surface

### Mixed-Boundary Candidates

#### `src/cli.ts`

Reason:

- likely contains both engine orchestration and CLI-specific coupling
- probably the single most important future split point

#### `src/wizard-cli.ts`

Reason:

- contains discovery/config UX plus reusable discovery behaviors

#### `src/quick-cli.ts`

Reason:

- probably mixes orchestration intent with shell UX

#### `src/folder-cli.ts`

Reason:

- may contain reusable folder execution semantics mixed with shell handling

#### `src/measure-cli.ts`

Reason:

- command wrapper may hide reusable measure engine logic already mirrored in `src/runners/measure/*`

#### `src/headers-cli.ts`
#### `src/health-cli.ts`
#### `src/links-cli.ts`
#### `src/console-cli.ts`
#### `src/bundle-cli.ts`

Reason:

- likely shell wrappers over reusable engine checks

## Suggested Extraction Order

### Slice 1: Contracts and Engine Vocabulary

Target:

1. `src/contracts/*`
2. `src/engine-*`
3. selected `src/types*`

Goal:

- stable engine-facing contract package

### Slice 2: Runners and Core Runtime

Target:

1. `src/core/*`
2. `src/runners/*`
3. `src/route-detectors.ts`
4. `src/project-discovery.ts`
5. selected `src/infrastructure/*`

Goal:

- reusable local execution engine

### Slice 3: Analyze / Verify / Report

Target:

1. `src/analyze-cli.ts`
2. `src/verify-cli.ts`
3. `src/report-cli.ts`
4. `src/reporting/*`

Goal:

- preserve the optimization loop independent of shell

### Slice 4: Legacy Shell Adapters

Target:

1. `src/bin.ts`
2. `src/shell-cli.ts`
3. `src/tui-cli.ts`
4. `src/cortex-cli.ts`
5. installer/release flows

Goal:

- reduce the old CLI to an adapter or freeze it

## Immediate Follow-Up Questions

1. Which exact pieces of `src/cli.ts` are engine logic versus shell logic?
2. Which reporting generators remain mandatory in the reboot MVP?
3. Which optional shells (`tui`, `cortex`) should be treated as historical/legacy rather than carried forward?

## Acceptance Criteria

1. The repo now has an explicit first-pass inventory of what survives the reboot.
2. Future extraction work can start from named slices instead of broad intuition.
3. The CLI is no longer treated as the default owner of all runtime logic.
