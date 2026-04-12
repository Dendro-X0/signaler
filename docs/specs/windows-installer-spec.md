# Windows Installer Spec

Status: In Progress
Owner: Signaler core
Last updated: 2026-04-11

## Goal

Provide a Windows-native installation experience for Signaler that meets the minimum human-usable standard:

1. one command or one installer action to install
2. no manual PATH editing
3. no manual shell profile editing
4. no manual launcher path discovery
5. `signaler` works in a fresh terminal after install

## Problem Statement

The current portable PowerShell installer can install the runtime and launchers, but the experience remains fragile across Windows shells, especially for users in PowerShell and Git Bash who do not expect to manage PATH state manually.

That makes the current install story technically possible but operationally user-hostile.

## Product Decision

Windows should have a first-class installer path.

The portable zip remains a packaging artifact, but it should no longer be treated as the human-facing install experience by itself.

The Windows installer should be the supported path for:

- developers
- code agents
- users who expect `signaler` to work after installation without per-shell troubleshooting

## Scope

This spec defines:

1. Windows installer behavior
2. install/update/uninstall semantics
3. PATH requirements
4. launcher expectations
5. release asset requirements

This spec does not define:

1. macOS installer packaging
2. Linux package manager integration
3. desktop-app product behavior

## User Experience Requirements

### Install

The user must be able to:

1. download or launch the installer
2. complete installation with minimal prompts
3. open a new terminal
4. run:
   - `signaler --version`
   - `signalar --version`

### Update

The user must be able to:

1. run `signaler upgrade`
2. receive the updated release
3. keep launchers working without PATH reconfiguration

### Uninstall

The user must be able to:

1. run `signaler uninstall --global`
   or
2. remove Signaler through standard Windows uninstall surfaces

The uninstall path must remove:

- install directory
- launchers
- PATH entry if it was added by the installer

## Functional Requirements

### 1. Install Directory

Recommended default:

- `%LOCALAPPDATA%\signaler\current`

Launchers:

- `%LOCALAPPDATA%\signaler\bin\signaler.cmd`
- `%LOCALAPPDATA%\signaler\bin\signalar.cmd`

Optional Unix-style launchers for Git Bash compatibility:

- `%LOCALAPPDATA%\signaler\bin\signaler`
- `%LOCALAPPDATA%\signaler\bin\signalar`

### 2. PATH Management

The installer must:

1. add `%LOCALAPPDATA%\signaler\bin` to the user PATH
2. avoid duplicate PATH entries
3. update the current install session when possible
4. not require the user to edit environment variables manually

### 3. Runtime Validation

The installer must check:

1. Node.js is installed
2. Node.js major version is `>= 18`
3. portable release payload is extractable
4. runtime dependencies install successfully
5. launcher smoke check succeeds

Recommended smoke check:

```powershell
signaler --version
```

### 4. Upgrade Semantics

`signaler upgrade` must:

1. resolve the latest release
2. download the installer-compatible portable asset
3. replace the install directory safely
4. preserve launcher location and PATH behavior

### 5. Uninstall Semantics

`signaler uninstall --global` must:

1. remove install directory
2. remove launchers
3. remove installer-added PATH entry
4. succeed even if parts are already missing

## Release Asset Requirements

Required GitHub Release asset for Windows/global install:

- `signaler-<version>-portable.zip`

Optional future installer assets:

- `signaler-<version>-windows-setup.exe`
- checksums / metadata

## Delivery Options

### Option A: Improved Script Installer

Keep PowerShell install script as the main Windows path.

Pros:

- smallest implementation delta
- easiest to ship immediately

Cons:

- still shell-first
- still less trustworthy for non-expert users
- still vulnerable to PowerShell-specific environment behavior

### Option B: Native Windows Installer

Build an `.exe` or MSI installer that wraps the portable payload.

Chosen first implementation path:

- Inno Setup

Alternatives still possible later:

- NSIS
- WiX

Pros:

- best human install UX
- standard uninstall surface
- reliable PATH management
- fewer shell quirks

Cons:

- additional packaging and signing complexity

## Recommended Direction

Preferred path:

1. keep the portable zip as the core payload
2. add a Windows-native installer wrapper around that payload
3. continue to support `install.ps1` as a fallback/advanced path

Chosen first packaging slice:

1. build an Inno Setup script that installs the portable payload into `%LOCALAPPDATA%\signaler\current`
2. add `%LOCALAPPDATA%\signaler\bin` to user PATH
3. run runtime dependency install during setup
4. register uninstall metadata

This gives the project:

- a human-friendly Windows path
- a reusable portable release format
- less shell-dependent support burden

## Acceptance Criteria

1. A Windows user can install Signaler without editing PATH manually.
2. `signaler --version` works in a fresh PowerShell session after installation.
3. `signaler --version` works in a fresh CMD session after installation.
4. Git Bash compatibility is documented and either works automatically or has an installer-managed compatibility step.
5. `signaler upgrade` works without requiring reinstall instructions.
6. `signaler uninstall --global` removes the install cleanly.

## Implementation Notes

Minimum viable Windows installer phase:

1. package stable portable payload
2. wrap it in a Windows-native installer
3. add PATH automatically
4. add uninstall registration
5. smoke-test `signaler --version`

## Non-Goals

1. Solving every shell quirk through shell scripts alone.
2. Requiring users to understand PATH, npm, pnpm, or JSR to install Signaler.
3. Making Windows users depend on GitHub source archives or manual extraction as the primary path.
