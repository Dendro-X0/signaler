# Shell Decision Record

Status: Accepted
Owner: Signaler core
Last updated: 2026-04-12

## Decision

The rebooted Signaler product will use:

1. a **desktop-first application shell**
2. a **Rust backend**
3. a **TypeScript frontend**

This becomes the current preferred implementation direction for the reboot.

## Why This Decision Was Made

The original CLI-first product shell proved the core workflow and artifact model, but it failed the installation and distribution bar for normal human users.

The reboot needs a shell that:

1. is easier to install and update
2. does not depend on registry-global CLI behavior
3. remains local-first
4. still supports developers and code agents

A desktop shell with a Rust backend and TypeScript frontend best fits those constraints.

## What This Means

### Product Shell

Primary shell:

- desktop application

Human interaction:

- GUI-driven workspace selection, run control, and artifact inspection

### Backend

Primary backend/runtime:

- Rust

Responsibilities:

1. process lifecycle
2. local job execution
3. stable engine boundary
4. performance-sensitive coordination
5. optional local service/API surface later

### Frontend

Primary UI layer:

- TypeScript

Responsibilities:

1. desktop UI
2. workspace controls
3. artifact navigation
4. settings and provider UX
5. integration with the backend protocol

## Why Rust Backend

Rust is the better fit for the reboot backend because it can provide:

1. predictable local runtime packaging
2. strong process and filesystem control
3. a better path to a durable local engine/service
4. a cleaner long-term install story than registry-distributed JS CLI shells

## Why TypeScript Frontend

TypeScript remains a strong fit for the human-facing shell because:

1. the existing project already contains a large amount of TypeScript domain logic
2. UI iteration remains faster there
3. desktop UI frameworks in the current ecosystem fit this stack well

## Relationship to Existing CLI

The current CLI is no longer the primary product shell.

It may remain as:

1. a reference implementation
2. a debug/admin shell
3. a migration bridge

But it should not remain the central assumption for future distribution design.

## Relationship to Code Agents

Code agents still matter.

The desktop-first decision does not remove agent usefulness because:

1. the shared local engine remains the durable core
2. the canonical artifacts remain machine-readable
3. agents can interact with the engine through a file-based or local service protocol

## Immediate Consequences

1. roadmap and specs should assume desktop-first unless explicitly noted otherwise
2. engine extraction work becomes a priority
3. the old CLI distribution path should stop driving core product decisions

## Deferred Questions

1. Tauri vs Electron vs another desktop container
2. file-based protocol only vs file-based + local HTTP
3. whether a VS Code extension ships alongside or after the desktop shell

## Non-Goals

1. preserving every current CLI UX detail
2. forcing npm/JSR/global-install behavior back into the center of the product
3. deciding every implementation module in this document
