# Active Roadmap

This roadmap tracks the active reboot direction. Historical CLI-centric roadmap material is preserved under `docs/archive/roadmaps/`.

## Current Reboot Objective

Keep the core Signaler goal intact:

1. help developers and code agents audit and optimize web projects
2. preserve machine-readable artifacts and verification loops
3. move toward software surfaces that are easier to install and operate than the current CLI distribution model

## Reboot Workstreams

### Workstream R1: Preserve the Core

- [ ] Capture the durable artifact model and workflow expectations from the current repo.
- [ ] Define which parts of the old CLI are product-critical versus implementation-specific.
- [ ] Document what is being frozen in the current codebase.

### Workstream R2: Choose the New Shell

- [ ] Decide the primary successor surface:
  - Windows-native installer + local engine
  - desktop app
  - VS Code extension
  - hybrid app + engine
- [ ] Define install/update/uninstall expectations for the new shell.
- [ ] Define how code agents trigger work and retrieve artifacts.

Current preferred direction:

- desktop-first shell over a shared local engine

### Workstream R3: Shared Engine Protocol

- [ ] Define the local runtime/engine contract independent of the existing CLI shell.
- [ ] Choose the job interface:
  - file-based
  - local HTTP
  - IPC
- [ ] Preserve the canonical artifact outputs where possible.

Current preferred baseline:

- file-based jobs first, optional local HTTP later

### Workstream R4: Windows Usability

- [ ] Validate the Inno Setup-based installer path or replace it with a better Windows-native installer option.
- [ ] Ensure Windows install does not require manual PATH editing.
- [ ] Ensure uninstall and update behavior are standard and predictable.

## Success Criteria

- [ ] A human user can install the product without reasoning about shell-specific PATH behavior.
- [ ] A code agent can run the product locally without registry-specific setup.
- [ ] Canonical artifacts remain deterministic and easy to consume.
- [ ] The successor product shell is easier to ship than the current CLI distribution path.

## Archive

- Historical roadmaps: `docs/archive/roadmaps/`
- Historical release notes: `docs/archive/release-notes/`
- Active specs: `docs/specs/`
- Desktop execution plan: `docs/specs/desktop-implementation-plan.md`
