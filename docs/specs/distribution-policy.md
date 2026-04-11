# Distribution Policy

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-10

## Goal

Define a stable distribution model for Signaler so code agents and developers can reliably use a global `signaler` command with explicit install, upgrade, and uninstall behavior.

## Product Position

Signaler is an agent-first CLI for batch review and optimization of web projects. The primary user experience is a globally available command that can be invoked by humans, editors, and terminal agents without per-project package-manager setup.

## Policy Decisions

### 1. Primary Global Install Path

The primary supported global install path is the portable GitHub Release installer.

Supported commands after install:

- `signaler`
- `signaler upgrade`
- `signaler uninstall --global`

Compatibility alias:

- `signalar`

### 2. Primary Runtime Expectation

Signaler is a Node-based CLI, not a native single-binary product.

Requirements:

- Node.js 18 or newer must exist on the target machine
- release installer creates launcher scripts, not a native binary bundle

### 3. JSR Role

JSR remains supported for:

- publishing
- package consumption in projects
- shim-based one-command workflows via `install-shim`

JSR is not the canonical global bootstrap path for Signaler.

### 4. One-Word Command Contract

The project must support a single-word global command after the primary install flow completes.

Supported launchers:

- `signaler` as the primary command
- `signalar` as a compatibility alias

### 5. Global Lifecycle Contract

The project must provide all of the following:

- install
- upgrade
- uninstall
- clear user-facing documentation for each command

Minimum expected behavior:

1. install writes launchers to a predictable bin directory
2. upgrade replaces the portable install in place
3. uninstall removes install directory and launchers
4. docs explain PATH requirements clearly

## Supported Paths

### Supported and Primary

1. portable release installer
2. direct global command usage via generated launchers

### Supported but Secondary

1. JSR package installation for project-local use
2. JSR shim installation for direct shell usage
3. local unpublished build execution via `node ./dist/bin.js`

### Not Promised

1. `jsr add` automatically creating a globally available shell command
2. every shell behaving identically without PATH setup
3. native binary packaging for the full CLI

## Platform Scope

Primary support targets:

1. Windows PowerShell
2. Windows CMD
3. Bash-compatible Unix shells
4. Git Bash on Windows as a documented compatibility path

## Documentation Rules

All top-level installation docs must reflect the same story:

1. portable release installer is primary
2. JSR is secondary
3. `install-shim` is fallback/bridge behavior
4. `signalar` is a compatibility alias, not primary branding

## Acceptance Criteria

1. A clean machine can install Signaler globally and run `signaler --version`.
2. The same install also allows `signalar --version`.
3. Upgrade and uninstall succeed without manual file deletion.
4. Docs do not contain conflicting npm-global or registry-global guidance.
5. JSR docs do not imply that `jsr add` alone creates a global command.

## Non-Goals

1. Restoring every historical install path as first-class behavior.
2. Shipping a native binary for the full Signaler runtime.
3. Making registry installation semantics identical across npm, pnpm, JSR, PowerShell, CMD, and Git Bash.
