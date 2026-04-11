# Distribution Implementation Plan

Status: Proposed
Owner: Signaler core
Last updated: 2026-04-10

## Goal

Execute the distribution policy in small, testable phases so Signaler has one coherent install story for agent-first global CLI usage.

## Baseline

Current baseline after `9cc3d9e`:

1. portable installer exists
2. global lifecycle commands exist
3. Windows installer compatibility was hardened
4. `signalar` alias was added across launcher surfaces
5. focused lifecycle tests and full test suite pass locally

## Phase 1: Policy Lock

Objective:

- make the distribution policy explicit and canonical

Tasks:

1. add canonical policy docs under `docs/specs/`
2. update docs indexes if needed
3. ensure README/reference/guides all align with the same install story

Acceptance checks:

1. no conflicting primary install story in README/docs
2. policy doc is linked from the specs index

## Phase 2: Global Install Validation

Objective:

- prove the primary install path works on the intended shells

Validation matrix:

1. Windows PowerShell
2. Windows CMD
3. Git Bash on Windows
4. macOS/Linux bash-compatible shell

Checks per environment:

1. run installer
2. confirm `signaler --version`
3. confirm `signalar --version`
4. run `signaler upgrade`
5. run `signaler uninstall --global`

Artifacts to capture:

1. commands used
2. launcher paths created
3. PATH adjustments needed
4. any shell-specific caveats

Acceptance checks:

1. primary launcher works in each supported environment
2. alias launcher works where documented
3. uninstall removes all expected launchers

## Phase 3: JSR Boundary Hardening

Objective:

- make JSR support useful without pretending it is the primary global install path

Tasks:

1. document `pnpm exec signaler` / local package usage clearly
2. document `install-shim` as the bridge for one-word JSR command use
3. improve `scripts/jsr-publish.js`

Recommended helper improvements:

1. support `--allow-dirty`
2. remove or reduce Windows `shell: true` dependency if possible
3. emit direct working-directory guidance when `jsr.json` is missing
4. optionally expose the exact `npx jsr publish ...` command before execution

Acceptance checks:

1. users can understand the difference between publish/package usage and global install
2. publish helper failures give actionable guidance

## Phase 4: Release and CI Validation

Objective:

- ensure distribution remains healthy after future changes

Tasks:

1. add regression tests for package bin metadata and installer constraints
2. add release-install smoke checks where practical
3. ensure docs updates stay synchronized with lifecycle behavior

Candidate automated checks:

1. package exports/bin validation
2. installer script syntax guardrails
3. launchers created/removed in temp directories
4. smoke validation for help/version output after build

Acceptance checks:

1. installer/lifecycle regressions fail fast in CI
2. docs drift is caught early where feasible

## Implementation Write Set

Expected files and modules most likely to change during the remaining work:

1. `release-assets/install.ps1`
2. `release-assets/install.sh`
3. `src/upgrade-cli.ts`
4. `src/uninstall-cli.ts`
5. `src/install-shim-cli.ts`
6. `src/bin.ts`
7. `scripts/jsr-publish.js`
8. `README.md`
9. `docs/guides/getting-started.md`
10. `docs/guides/troubleshooting.md`
11. `docs/reference/cli.md`
12. `test/global-install-lifecycle.test.ts`
13. `test/install-shim-cli.test.ts`

## Recommended Execution Order

1. lock policy docs
2. validate portable installer manually across target shells
3. tighten JSR helper behavior and messaging
4. add any missing regression tests
5. publish the updated release/install guidance

## Risks

1. shell/PATH behavior varies across Windows shells even with correct launchers
2. JSR semantics may continue to conflict with user expectations around global commands
3. trying to preserve every historical install path will reintroduce ambiguity

## Success Definition

Signaler is successful when a code agent or developer can:

1. install it globally using the documented primary path
2. run `signaler` without project-local setup
3. update and uninstall it with documented first-party commands
4. understand exactly what JSR does and does not provide
