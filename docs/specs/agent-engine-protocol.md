# Agent Engine Protocol

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-12

## Goal

Define a shared local runtime protocol that preserves Signaler's core value for developers and code agents even if the current CLI shell is replaced.

This protocol is intended to become the durable core of the rebooted product.

## Problem Statement

The existing CLI proved that the workflow and artifact model are useful, but the shell/distribution layer became too costly to maintain as the primary product.

To reboot successfully, Signaler needs:

1. a stable local execution core
2. a stable artifact contract
3. a stable way for software shells to submit work and read results

## Core Responsibilities

The engine is responsible for:

1. discovering routes or target resources
2. executing audits/checks
3. generating canonical artifacts
4. ranking suggested actions
5. supporting verification loops

The engine is not responsible for:

1. user-facing installation UX
2. desktop windowing
3. editor UI
4. shell-specific PATH behavior

## Design Principles

1. local-first
2. deterministic outputs
3. artifact-driven
4. shell-agnostic
5. safe for both humans and agents

## Canonical Output Contract

The reboot should preserve these canonical outputs where possible:

1. `.signaler/run.json`
2. `.signaler/results.json`
3. `.signaler/suggestions.json`
4. `.signaler/agent-index.json`
5. `.signaler/analyze.json`
6. `.signaler/verify.json`

Human-readable companions may continue to exist, but the machine-readable contract remains primary.

## Candidate Invocation Models

### Option A: File-Based Job Protocol

The shell writes a job file to a workspace-local directory and the engine executes it.

Example directories:

- `.signaler/jobs/`
- `.signaler/runs/`

Example flow:

1. shell writes `job-<id>.json`
2. engine picks it up
3. engine writes outputs
4. shell reads status and artifacts

Pros:

- simple
- inspectable
- easy for agents
- resilient to shell/runtime boundaries

Cons:

- less interactive
- polling needed unless paired with file watching

### Option B: Local HTTP API

The shell talks to a localhost engine service.

Pros:

- interactive
- easy to stream progress
- good for desktop apps and extensions

Cons:

- requires service lifecycle management
- more moving parts than file-based jobs

### Option C: Local IPC Socket

The shell communicates over OS-native IPC.

Pros:

- efficient
- private/local

Cons:

- more platform-specific complexity
- harder to debug manually

## Recommended First Direction

Start with:

1. file-based job protocol as the durable baseline
2. optional local HTTP API layered on top later

Rationale:

- easiest to debug
- easiest for code agents
- easiest to preserve across product-shell changes

## Job Schema

The engine must accept a normalized job envelope.

Recommended fields:

1. `schemaVersion`
2. `jobId`
3. `command`
4. `workspaceRoot`
5. `baseUrl`
6. `options`
7. `requestedOutputs`
8. `requestedAt`

Example:

```json
{
  "schemaVersion": 1,
  "jobId": "run-20260412-001",
  "command": "run",
  "workspaceRoot": "E:/project",
  "baseUrl": "http://127.0.0.1:3000",
  "options": {
    "mode": "throughput",
    "contract": "v3"
  },
  "requestedOutputs": [
    "run.json",
    "results.json",
    "suggestions.json",
    "agent-index.json"
  ],
  "requestedAt": "2026-04-12T00:00:00.000Z"
}
```

## Status Model

The engine should expose simple states:

1. `queued`
2. `running`
3. `completed`
4. `failed`
5. `cancelled`

Optional status file:

- `.signaler/jobs/<jobId>.status.json`

## Progress Reporting

Minimum requirement:

- deterministic status snapshots

Optional later:

- NDJSON progress stream
- local HTTP progress events
- desktop/extension live event bridge

## Error Model

The engine must emit machine-readable failures with:

1. error code
2. message
3. phase
4. recoverability hint when possible

## Compatibility with Existing CLI

The current CLI can become one shell over this engine rather than the engine itself.

That allows:

1. legacy compatibility where needed
2. desktop app reuse
3. extension reuse
4. future automation without CLI-first assumptions

## Acceptance Criteria

1. The engine can execute a `discover`/`run`/`analyze`/`verify`/`report` sequence without requiring a shell-specific install path.
2. A code agent can trigger work and consume outputs through the protocol.
3. Existing canonical artifact outputs remain available or have an explicit migration path.
4. The engine can be driven by more than one shell.

## Non-Goals

1. Keeping the current CLI architecture as the permanent boundary.
2. Designing every transport layer at once.
3. Solving cross-platform packaging in the same spec.
