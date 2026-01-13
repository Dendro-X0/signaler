# Dev DCOS: Development Status, Goals, and Challenges

## Purpose
This document records the current development status of the project, key design goals, the technologies used, and the main challenges encountered during the v1.0.0 “remaster” effort. It is intended to make a future reboot faster and less frustrating by preserving the decision history and known failure modes.

## Project Goals
### Primary goals
- Provide a developer-first CLI for running audits locally and producing shareable artifacts.
- Provide a registry-free distribution path (install from GitHub Releases) that works on Windows/macOS/Linux.
- Provide an optional desktop UI (Tauri) for non-technical users that feels like a native application and bundles the required runtime pieces.

### Non-goals (current scope)
- Cloud accounts, hosted dashboards, or any SaaS backend.
- User analytics/telemetry by default.

## Product Shape (What the tool is)
This project is a local auditing tool with:
- A CLI entrypoint (Node.js) for interactive and CI usage.
- A well-defined “engine contract” so the run lifecycle and artifacts can be consumed by other frontends.
- Optional UI that orchestrates runs, streams progress, and opens reports.

## Architecture Overview
### Components
- **Engine / CLI (Node.js / TypeScript)**
  - Responsible for command parsing, running audits, writing artifacts, and emitting NDJSON progress events.
  - The primary public interface for developers.
- **Launcher (Rust)**
  - Optional orchestrator intended primarily for the desktop app.
  - Runs the engine, streams events, and provides OS-native integrations (open file/folder/report).
- **Desktop App (Tauri v2 + SvelteKit)**
  - Bundles the Rust launcher as a “sidecar” binary.
  - Provides a UI for starting runs, showing progress, and opening results.

### Contracts and artifacts
- **NDJSON events** emitted during runs to describe:
  - run started/completed
  - progress updates
  - artifacts written
  - folder-mode detections
- **`run.json` index** describing:
  - run timestamps
  - output directory
  - artifacts written

These contracts allow the CLI and the desktop UI to share the same “truth” about a run without coupling to internal implementation details.

## Technologies Used
### Tooling and languages
- **TypeScript (Node.js)** for the CLI/engine.
- **Rust** for the launcher and Tauri backend.
- **SvelteKit + Vite** for the desktop frontend.

### Desktop packaging
- **Tauri v2** for building a native desktop installer.
- Tauri “sidecar” bundling to ship the launcher binary inside the app.

### Package managers
- **pnpm** for the JS workspace.
- **cargo** for Rust crates.

## Current Development Status
### What is working
- **Registry-free distribution for CLI**
  - Installation scripts download the latest tagged GitHub Release “portable zip” and install a shim (`signaler.cmd` / `signaler`), avoiding npm.
  - The Node CLI includes an `upgrade` command to self-update from GitHub Releases.
- **Sidecar build pipeline exists**
  - A script builds the Rust launcher and copies it to `app/src-tauri/binaries/` using Tauri’s sidecar naming conventions.
- **SvelteKit build friction addressed (partially)**
  - The frontend build uses Vite for bundling.
  - Prerendering was disabled on routes that depend on runtime data (query params) because desktop runtime behavior differs from static prerender assumptions.

### What is blocked
#### Tauri v2 version alignment (hard blocker)
The Tauri build requires the Rust crates and the npm packages to be aligned on the same major/minor release.

Observed failure:
- Rust crates were pinned to `tauri@2.5.3` because that version is available on crates.io.
- JS packages installed by pnpm resolve to `@tauri-apps/api@2.9.1` (and `@tauri-apps/cli@2.9.x`).
- Attempting to pin `@tauri-apps/api@2.5.3` fails because that version is not published on npm:
  - `ERR_PNPM_NO_MATCHING_VERSION No matching version found for @tauri-apps/api@2.5.3`
- Tauri then fails builds with the mismatch check:
  - `tauri (v2.5.3) : @tauri-apps/api (v2.9.1)`

This is not a local configuration issue; it is an ecosystem publication mismatch.

#### Plugin version availability (secondary contributor)
Prior work indicated that a desired plugin version (example: `tauri-plugin-opener 2.9.1`) was not available on crates.io, which pushed the Rust side to pin at `2.5.3`. This effectively conflicts with the npm side which defaults to newer versions.

## Release Artifacts and Intended Distribution
### CLI distribution (current best path)
- GitHub Release portable zip
- `install.ps1` / `install.sh` scripts
- `upgrade` command to self-update

### Desktop distribution (intended, currently blocked)
- Tauri installers (Windows MSI/EXE, macOS .app/.dmg, Linux packages)
- Bundled launcher sidecar

## Documentation Map
Existing docs (good entry points):
- `docs/getting-started.md`
- `docs/cli-and-ci.md`
- `docs/configuration-and-routes.md`

## Recommendations for a Future Reboot
### Decide the distribution priority up front
Pick one primary distribution target for the reboot:
- **CLI-first** (portable zip + scripts) and treat desktop UI as optional/experimental, or
- **Desktop-first** and accept registry/toolchain requirements during build time.

### If desktop packaging is required, align around published versions
To make Tauri work reliably:
- Align on a Tauri version family that exists on both:
  - crates.io (Rust) and
  - npm (JS packages)
- Avoid pinning Rust crates to versions that do not have a corresponding npm release line.

### Reduce cross-ecosystem coupling
Consider a packaging approach with fewer moving parts if desktop distribution is essential:
- Electron (larger binaries, but simpler JS-side versioning)
- Or keep the “native-like” experience by launching a local web UI from the CLI.

## Next Steps (If Continuing Later)
- Re-evaluate the target Tauri major/minor version based on what is published on npm and crates.io.
- Verify plugin availability for the chosen Tauri version family.
- Update `app/package.json` and `app/src-tauri/Cargo.toml` together as a single unit.
- Re-run `pnpm -C app install` and `pnpm -C app tauri:build`.

## Current “Known Good” Value
Even without a desktop installer, the registry-free CLI distribution path is already valuable:
- portable zip + one-command install scripts
- predictable artifacts and a stable engine contract
- CI-friendly usage
