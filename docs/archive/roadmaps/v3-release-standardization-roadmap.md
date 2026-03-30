# V3 Release Standardization Roadmap

Status: In progress (Phase 1 gate green, Phases 2/3 in progress)  
Date: March 23, 2026  
Current package baseline: `@signaler/cli@2.6.4`  
Goal: standardize the path to a formal V3 overhaul release (`3.0.0`) with deterministic gates.

## Context

The V3 contract and canonical workflow are already implemented in current builds, but release semantics and rollout policy still reflect the V2.x line. This roadmap makes the V3 release repeatable, auditable, and automation-friendly for a solo maintainer.

## Program Outcomes

1. One release process with explicit phase gates and machine-readable outputs.
2. One canonical workflow for docs, CI templates, and agent automation.
3. One migration policy for aliases and compatibility timelines.
4. One cross-platform release pack that is reproducible from local source.

## Phase Plan

## Phase 0: Inventory and Freeze Boundary

Objective: lock release scope and remove ambiguity before changing versioning policy.

Deliverables:

1. V3 release-scope inventory (commands, artifacts, compatibility guarantees).
2. Gap list for docs/help/examples that still describe legacy flows.
3. Risk register for breaking-change candidates and fallback plans.

Exit criteria:

1. Scope and compatibility boundary explicitly approved in docs.
2. No unresolved high-risk blockers for V3 semver transition.

## Phase 1: Release Contract and Gate Foundation

Status: Implemented (initial baseline)

Objective: codify release-readiness checks and evidence collection.

Deliverables:

1. Deterministic V3 release-gate evaluator and validator.
2. Machine-readable gate report schema and local CI-friendly commands.
3. Release manifest contract (inputs, outputs, checksums, provenance fields).
4. Release checklist refresh aligned with the canonical V3 flow.

Exit criteria:

1. `bench:v3:gate` and `bench:v3:validate` run locally and in CI.
2. Blocking vs warn-only checks are explicit and deterministic.
3. Release status can be derived from artifacts, not manual interpretation.

Spec: [`../specs/spec-v3-phase1-release-standardization.md`](../specs/spec-v3-phase1-release-standardization.md)

## Phase 2: Packaging and Distribution Standardization

Status: In progress (manifest generation + policy validation baseline implemented)

Objective: make install and upgrade behavior consistent across local builds, JSR, and release assets.

Deliverables:

1. Local unpublished-build path (`node ./dist/bin.js ...`) documented as first-class.
2. Release asset packaging policy (`.tgz`, checksums, install scripts) validated.
3. Consistent command-prefix guidance in CLI output (`signaler` vs `node ./dist/bin.js`).
4. Deterministic manifest generation command for candidate releases:
   - `pnpm run v3:manifest generate --version <...> --channel <...> --asset <...> --gate <...>`

Baseline implementation:

- `scripts/v3-release-manifest.ts` now supports direct import for tests without auto-executing.
- `test/v3-release-manifest-script.test.ts` validates argument parsing, gate-id mapping, and deterministic manifest checksum emission.
- `scripts/v3-release-manifest-smoke.ts` creates a local `.tgz` release asset (`pnpm pack`) and emits `release/v3/release-manifest.generated.json`.
- `scripts/v3-release-manifest-validate.ts` enforces packaging policy (required gates, checksums, `.tgz` asset, install helper scripts).
- `bench:v3:phase2` executes manifest smoke + validation path for local/CI reproducibility.

Exit criteria:

1. Local-source, package-registry, and release-asset installs produce equivalent CLI behavior.
2. Upgrade/install docs pass smoke checks on Windows/macOS/Linux.

## Phase 3: Migration and Compatibility Policy

Status: In progress (deprecation matrix + CLI/runtime messaging baseline added)

Objective: make the V2.x to V3 migration predictable for humans and agents.

Deliverables:

1. Deprecation matrix for aliases (`init/audit/review`) with timeline.
2. Compatibility mapping policy for legacy artifacts and consumers.
3. Migration checklist updates with explicit contract/version expectations.

Baseline implementation:

- [`../notes/v3-deprecation-matrix.md`](../notes/v3-deprecation-matrix.md)
- `src/bin.ts` now surfaces alias deprecation messaging with explicit `v4.0` planned removal notes for `init`, `audit`, and `review`.
- Migration docs (`MIGRATION.md`, `migration-v3.md`, `migration-v4.md`, `docs/README.md`) are canonical-first and aligned to the same alias timeline.
- Cross-platform smoke evidence now emits per-OS machine artifacts (`cross-platform-smoke-<os>.json`) and Phase 6 gate validates this evidence in CI mode.
- Added release preflight runner (`pnpm run release -- --target-version <...>`) and executable push/publish playbook (`docs/v3-push-release-playbook.md`).

Exit criteria:

1. All migration docs use the same canonical command set and timeline.
2. Agent guidance and CI templates are migration-safe by default.

## Phase 4: RC Dogfood and GA

Objective: prove release readiness in real projects before final tag.

Deliverables:

1. `3.0.0-rc.*` cycle with gate reports attached to release artifacts.
2. Dogfood evidence across at least 3 public repos (2+ weeks cumulative use).
3. GA release notes with explicit breaking/non-breaking summary.

Exit criteria:

1. Blocking gate checks green for RC and GA candidates.
2. Dogfood evidence and known-limits notes published.
3. `3.0.0` release published with reproducible manifest and checksum set.

## Phase 5: Post-GA Stabilization

Objective: protect trust after launch.

Deliverables:

1. 30-day stabilization metrics (regression count, rollback incidents, support issues).
2. Follow-up patch cadence policy (`3.0.x`) and ownership checklist.
3. Backlog triage for V3.1 priorities.

Exit criteria:

1. No unresolved critical regressions from GA.
2. Patch release process validated end-to-end at least once.

## Governance Rules (All Phases)

1. No silent contract-breaking changes.
2. Every phase must have machine-checkable acceptance evidence.
3. Release docs must be executable by both developers and agents.
4. Rust acceleration remains opt-in/fallback-safe unless parity gates pass.
