# Distribution Policy

Status: Accepted  
Owner: Signaler core  
Last updated: 2026-06-09

## Goal

Ship Signaler as a globally installable CLI on **Windows, macOS, and Linux** without relying on npm, JSR, or other JavaScript registries.

## Decision: registry channels abandoned

**npm and JSR are no longer supported distribution or install paths** as of v5.1 policy (2026-06).

Reasons:

- Registries do not expose reliable `bin` wiring for this CLI (JSR strips `bin`; npm was never the primary channel).
- Immutable mis-published versions cannot be removed or renamed.
- Auth tokens for registry publish do not belong in git; maintaining parallel registry flows added friction without adoption benefit.
- v2.6.4 was the last era where JSR global install/uninstall felt complete; platform changes and Signaler scope growth made registry distribution a poor fit.

Historical registry packages may remain online but are **unsupported**. Do not document or depend on them for new installs.

## Supported distribution (only)

### 1. GitHub Release native packaging

| Platform | Artifact / method |
|----------|-------------------|
| **Windows** | `signaler-<version>-windows-setup.exe` (Inno Setup) or portable zip + `install.ps1` |
| **macOS / Linux** | `signaler-<version>-portable.zip` + `install.sh` |
| **Git Bash on Windows** | `install.sh` (not PowerShell `irm` / `iex`) |

Release flow: push tag `v<version>` → CI builds assets → users install via scripts or download zip/exe.

### 2. Global lifecycle commands

After install:

- `signaler` / `signalar` (compatibility alias)
- `signaler upgrade`
- `signaler uninstall --global`

### 3. Local development (maintainers only)

```bash
pnpm install && pnpm run build
node dist/cli-entry.js --version
```

Not a supported end-user install path.

## Runtime expectation

Signaler remains a **Node.js 18+** application bundled inside the portable release. Installers place compiled JS + production dependencies on disk and add shell launchers. Optional Rust launchers (`signaler-native`) may delegate to the bundled CLI where built.

## Not supported

1. `npm install` / `npm i -g @signaler/cli`
2. `pnpm add jsr:…` / `npx jsr add` / `npx jsr run`
3. Registry-based global install or uninstall
4. Expecting identical semantics across npm, pnpm, JSR, and shell environments

## Documentation rules

All installation and release docs must:

1. Lead with GitHub Release installers (bash / PowerShell / exe).
2. State that npm and JSR are deprecated and unsupported.
3. Document `signaler upgrade` and `signaler uninstall --global`.
4. Treat `signalar` as a compatibility alias only.

## Release owner checklist

1. Bump `package.json` version (single source of truth for release tags).
2. Add `docs/archive/release-notes/RELEASE-NOTES-v<version>.md`.
3. Commit, tag `v<version>`, push tag.
4. Verify CI uploaded portable zip + Windows installer to GitHub Release.
5. Post-publish smoke: run `install.sh` or `install.ps1`, then `signaler --version`.

No registry publish steps.

## Acceptance criteria

1. A clean machine on each OS can install and run `signaler --version` via documented native packaging.
2. Upgrade and uninstall work without manual file deletion.
3. No current doc instructs npm/JSR as a primary or secondary install path.
4. GitHub Action installs from GitHub Release, not `npx jsr run`.
