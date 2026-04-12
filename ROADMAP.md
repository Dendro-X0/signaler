# Signaler Reboot Roadmap

Status: Active
Updated: 2026-04-12

This roadmap reflects a product reboot. The original CLI-first implementation proved that the core idea works locally, but the distribution and installation model became too fragile to sustain. The goal remains the same: help developers and code agents review, diagnose, and optimize web projects. The future implementation will pursue that goal through different software surfaces.

## Goal

Build a tool for developers and code agents that can:

1. discover and audit web projects
2. produce structured machine-readable artifacts
3. guide optimization and verification loops
4. remain practical to install, update, and operate

## Product Direction

The reboot is no longer constrained to a registry-distributed CLI as the primary product shell.

The new priority order is:

1. local engine/runtime that preserves artifact contracts
2. human-usable install surface on supported platforms
3. developer and agent workflow integration through software that is easier to ship than the current CLI distribution model

## Current Strategy Questions

1. Which product shell becomes primary:
   - desktop app
   - VS Code extension
   - Windows-native installer around a local engine
   - hybrid app + local engine
2. Which role remains for the existing CLI:
   - frozen legacy interface
   - internal engine/debug tool
   - secondary integration path only
3. Which artifacts remain canonical:
   - `.signaler/run.json`
   - `.signaler/results.json`
   - `.signaler/suggestions.json`
   - `.signaler/agent-index.json`
   - `.signaler/analyze.json`
   - `.signaler/verify.json`

## Reboot Track

### Phase R1: Preserve the Design

- [ ] Capture the durable product requirements from the current repo.
- [ ] Keep the artifact contract and optimization loop as the stable core.
- [ ] Document what is being kept, what is being frozen, and what is being replaced.

Primary outputs:

- reboot vision
- product shell decision record
- preserved artifact contract references

### Phase R2: Choose the New Shell

- [ ] Decide whether the first successor is:
  - Windows-native installer + local engine
  - desktop app
  - VS Code extension
  - hybrid desktop/extension over shared engine
- [ ] Define install/update/uninstall expectations for the chosen shell.
- [ ] Define how code agents interact with the new runtime.

Primary outputs:

- chosen shell architecture
- install model
- agent integration model

### Phase R3: Define the Shared Engine

- [ ] Isolate the minimal runtime responsibilities that must survive the reboot.
- [ ] Define a stable local protocol for jobs and outputs.
- [ ] Keep the artifact generation path deterministic and local-first.

Candidate interface models:

- file-based job protocol
- local HTTP API
- local IPC service

Primary outputs:

- engine protocol spec
- runtime boundary spec
- artifact contract continuity plan

### Phase R4: Rebuild the User Experience

- [ ] Build a human-friendly install path for the chosen shell.
- [ ] Build a human-friendly run path for the chosen shell.
- [ ] Ensure code agents can trigger audits and consume outputs without manual setup pain.

Primary success condition:

- a normal user or agent can install and run the product without manual PATH debugging or registry-specific knowledge

## What Stays Valid from the Old Project

- agent-first workflow intent
- local-first execution model
- canonical artifact concept
- discover -> run -> analyze -> verify -> report mental model
- optimization and verification loop

## What Is No Longer Assumed

- npm as the primary distribution channel
- JSR as the primary distribution channel
- registry-global CLI behavior as the product backbone
- shell-script installers as the final Windows UX

## Immediate Open Work

1. Write the reboot vision/specs.
2. Choose the successor product shell.
3. Define the shared local engine protocol for developers and agents.

## Archive

- Historical roadmaps: `docs/archive/roadmaps/`
- Historical release notes: `docs/archive/release-notes/`
- Active specs: `docs/specs/`
