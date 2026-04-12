# Desktop Successor Spec

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Define a desktop-first successor shell for Signaler that preserves the engine/artifact workflow while giving developers a more human-friendly install and run experience than the current CLI distribution model.

## Product Role

The desktop app is not a replacement for the engine.

It is the primary human-facing shell over:

1. the local Signaler engine
2. the canonical artifact contract
3. settings, provider configuration, and run control

## Why Desktop-First

The desktop shell is the most practical reboot candidate because it can:

1. provide normal installation behavior
2. control runtime setup
3. offer a better onboarding path
4. keep local execution
5. expose artifacts and verification results visually

It also avoids the worst parts of registry-distributed CLI friction.

## Primary Users

1. developers auditing their own projects
2. technical users managing repeated optimization loops
3. code agents using the same local engine through a sidecar or local protocol

## Responsibilities

The desktop shell should:

1. manage installation/update/uninstall
2. configure providers, runtimes, and workspace defaults
3. launch and supervise the local engine
4. submit engine jobs
5. display artifacts, errors, and suggested actions

The desktop shell should not:

1. own the artifact contract
2. replace the engine protocol
3. bake all business logic into the UI

## Core UX Requirements

### Installation

The user should be able to:

1. download the app
2. install it with standard OS behavior
3. open it without additional shell configuration

### Workspace Flow

The user should be able to:

1. select a workspace
2. configure base URL and run options
3. execute `discover`, `run`, `analyze`, `verify`, and `report`
4. inspect outputs and suggestions

### Agent Interoperability

The desktop app should not trap the workflow inside UI-only state.

It must continue to write canonical artifacts to the workspace so code agents can read them directly.

## Architecture

Recommended stack:

1. Tauri-based desktop shell
2. local engine process
3. file-based or local-HTTP job protocol

Why Tauri:

- lighter than Electron
- good OS installer story
- already aligned with local desktop distribution

## Data Model

The desktop shell should treat the workspace `.signaler/` directory as canonical state, not as an export side effect.

Primary views:

1. run overview
2. top suggestions
3. verify outcomes
4. diagnostics/artifact navigation
5. launch/install/update status

## Phased Build Plan

### Phase D1: Thin Shell

- choose workspace
- configure basic settings
- invoke engine jobs
- display status and output locations

### Phase D2: Artifact UI

- show `agent-index.json`
- show `suggestions.json`
- show `analyze.json`
- show `verify.json`

### Phase D3: Guided Fix Loop

- prioritize one issue
- show evidence pointers
- show before/after verification

## Relationship to CLI

The CLI can become:

1. a secondary shell
2. a debug surface
3. an engine development tool

The desktop app becomes the primary human-facing product if the reboot chooses this path.

## Acceptance Criteria

1. A user can install and open the app without shell setup.
2. The app can drive the core Signaler workflow through the shared engine.
3. The app writes and reads canonical artifacts in the workspace.
4. A code agent can still consume outputs without depending on the desktop UI.

## Non-Goals

1. Reproducing every current CLI flag in the first version.
2. Replacing the engine contract with app-internal state.
3. Making the desktop app the only automation path.
