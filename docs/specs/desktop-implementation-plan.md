# Desktop Implementation Plan

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Turn the desktop-first successor concept into an implementation-ready plan that preserves Signaler's engine/artifact workflow while replacing the current CLI-first product shell.

## Baseline

The current repo already contains:

1. a working local audit engine
2. canonical artifact concepts under `.signaler/`
3. verification/analyze workflow logic
4. local-first execution assumptions
5. some existing desktop/Tauri-era traces in scripts and docs

The reboot should reuse those durable pieces where possible and avoid carrying forward the CLI distribution constraints as product assumptions.

## Chosen Direction

Primary product shell:

- desktop app

Underlying core:

- shared local engine

Agent interoperability:

- agents consume and/or submit work through the same local engine protocol

## Core Architectural Boundaries

### Shell Layer

Responsibilities:

1. workspace selection
2. run controls
3. settings and provider configuration
4. installation/update UX
5. artifact browsing

Candidate location:

- `apps/desktop` in a future monorepo or app folder split

### Engine Layer

Responsibilities:

1. discover
2. run
3. analyze
4. verify
5. report
6. canonical artifact writing

Candidate location:

- extracted from the current `signaler` repo into a reusable engine package/module

### Protocol Layer

Responsibilities:

1. job envelope
2. status model
3. output contract
4. transport abstraction

First transport:

- file-based job protocol

Optional later:

- local HTTP API

## Phased Plan

### Phase D0: Freeze and Extract

Objective:

- preserve the current core before changing shells

Tasks:

1. document the canonical artifact contract to preserve
2. identify which current modules are engine-worthy
3. identify which current modules are shell/UI/distribution-specific

Acceptance:

1. engine-worthy modules are named explicitly
2. shell-specific modules are named explicitly
3. a migration boundary is documented

### Phase D1: Engine Isolation

Objective:

- create a stable local engine boundary independent of the current CLI

Tasks:

1. define the file-based job schema
2. define status/result files
3. identify a minimal engine entrypoint that can execute jobs
4. ensure it can still emit canonical artifacts

Acceptance:

1. engine can run a minimal job without depending on the final desktop shell
2. outputs match or intentionally map to canonical artifact names

### Phase D2: Thin Desktop Shell

Objective:

- build a minimal desktop shell that can drive the engine

Tasks:

1. choose workspace
2. configure base URL and core settings
3. submit a job to the engine
4. display status and output locations

Acceptance:

1. user can launch an audit from the desktop shell
2. artifacts appear in `.signaler/`
3. shell can show success/failure cleanly

### Phase D3: Artifact-Native UI

Objective:

- make the desktop shell useful even before advanced editing/remediation features

Tasks:

1. render `agent-index.json`
2. render `suggestions.json`
3. render `analyze.json`
4. render `verify.json`
5. expose artifact navigation and file links

Acceptance:

1. user can inspect top issues without leaving the app
2. user can still open raw artifacts when needed

### Phase D4: Agent Interop

Objective:

- ensure code agents still benefit from the product

Tasks:

1. keep the file-based protocol simple and inspectable
2. preserve machine-readable outputs
3. optionally add a local HTTP bridge later for richer integrations

Acceptance:

1. an external agent can trigger or consume engine runs without depending on the desktop UI

### Phase D5: Desktop-First Distribution

Objective:

- make the desktop app the easiest install path for humans

Tasks:

1. desktop packaging for supported OSes
2. update/install/uninstall path
3. clear docs that distinguish desktop shell from engine/legacy CLI

Acceptance:

1. a normal user can install and open the app without shell setup

## Candidate Write Set

Likely future directories/files:

1. `docs/specs/agent-engine-protocol.md`
2. `docs/specs/desktop-successor-spec.md`
3. `docs/specs/desktop-implementation-plan.md`
4. extracted engine modules from current `src/`
5. future app directory for desktop shell

## Legacy CLI Role

The existing CLI should be treated as:

1. a reference implementation
2. an engine development shell
3. a compatibility/debug tool

It should not remain the primary product assumption for the reboot.

## Acceptance Criteria

1. The desktop app can drive the preserved Signaler workflow.
2. Canonical artifacts remain machine-readable and stable.
3. The engine can be consumed independently of the desktop UI.
4. Human install complexity is lower than the current CLI path.

## Non-Goals

1. Reproducing every current CLI feature in the first reboot milestone.
2. Preserving every current distribution path.
3. Designing every future integration before the engine boundary is stable.
