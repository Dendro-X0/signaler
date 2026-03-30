# Spec: V3 Phase 1 - Release Contract and Gate Foundation

Status: Implemented (initial baseline)  
Date: March 23, 2026  
Owners: CLI maintainer (solo)  
Depends on: [`../roadmaps/v3-release-standardization-roadmap.md`](../roadmaps/v3-release-standardization-roadmap.md)

## 1. Summary

Phase 1 establishes deterministic release-readiness checks for the V3 overhaul while the package is still on `2.6.x`. The goal is to make the eventual `3.0.0` release decision machine-checkable and reproducible.

## 2. Goals

1. Define a single V3 release gate with explicit blocking and warn-only checks.
2. Emit stable JSON + Markdown gate reports for CI and local use.
3. Standardize a release manifest contract for generated assets and provenance.
4. Keep all changes additive and migration-safe for existing V3/V6 artifact consumers.

## 3. Non-Goals

1. Publishing `3.0.0` in this phase.
2. Reworking runtime engine behavior.
3. Removing legacy command aliases.

## 4. Deliverables

## 4.1 New gate evaluator and validator

Add:

1. `benchmarks/v3-release/evaluate-gate.ts`
2. `benchmarks/v3-release/validate.ts`
3. `benchmarks/v3-release/report.schema.json`

Add scripts in `package.json`:

1. `bench:v3:gate`
2. `bench:v3:validate`

Outputs:

1. `benchmarks/out/v3-release-gate.json`
2. `benchmarks/out/v3-release-gate.md`

## 4.2 Release manifest contract

Add:

1. `release/v3/release-manifest.schema.json`
2. `release/v3/release-manifest.example.json`

Manifest scope:

1. candidate version and git commit
2. generated assets with checksums
3. gate report references
4. environment metadata (platform/node/package-manager)
5. timestamp and schema version

## 4.3 Release checklist alignment

Update:

1. `docs/launch-checklist-v5.md` with explicit V3 release gate reference.
2. `docs/cli-and-ci.md` with V3 gate command sequence.
3. `docs/README.md` with roadmap/spec links.

## 5. Gate Check Design

## 5.1 Blocking checks

The gate fails when any blocking check fails:

1. Canonical workflow docs present and consistent:
   - `discover -> run -> analyze -> verify -> report`
2. V3 contract docs and migration docs present:
   - `docs/v3-contract.md`
   - `docs/MIGRATION.md`
3. Local unpublished-build workflow documented (`node ./dist/bin.js ...`).
4. Required CLI scripts exist:
   - `build`
   - `test:phase6:smoke`
   - `bench:v63:loop`
5. V6.3 success-gate scripts exist:
   - `bench:v63:gate`
   - `bench:v63:validate`
6. Package metadata sanity:
   - `name=@signaler/cli`
   - `bin.signaler` exists
7. No missing required output schema files for V3 gate.

## 5.2 Warn-only checks

Warn-only checks are visible but do not fail process exit:

1. Dogfood evidence table completeness in launch/release docs.
2. Presence of recent loop smoke evidence artifacts.
3. Presence of release-notes draft for next version.

## 5.3 Output shape

Use additive schema:

```ts
type V3ReleaseGateReport = {
  schemaVersion: 1;
  generatedAt: string;
  status: "ok" | "warn" | "fail";
  summary: {
    totalChecks: number;
    blockingFailures: number;
    warnings: number;
  };
  checks: {
    id: string;
    severity: "blocking" | "warn";
    status: "pass" | "fail" | "warn";
    message: string;
    evidence?: string[];
  }[];
};
```

Exit code policy:

1. `0` when `blockingFailures = 0`
2. `1` when `blockingFailures > 0`

## 6. Implementation Steps

1. Create `benchmarks/v3-release` evaluator, schema, and validator.
2. Add scripts and output paths in `package.json`.
3. Add docs references and V3 gate run examples.
4. Add tests for valid/invalid gate report payloads.
5. Run local dry gate and validator.

## 7. Validation Plan

1. Unit tests:
   - valid report passes validator
   - missing summary/check fields fail validator
   - inconsistent status/summary fails validator
2. Integration run:
   - `pnpm run bench:v3:gate`
   - `pnpm run bench:v3:validate`
3. Docs smoke:
   - command snippets are executable in local-source mode.

## 8. Acceptance Criteria

1. Gate report is generated deterministically on repeated runs.
2. Blocking vs warn-only behavior is explicit and stable.
3. Validator catches malformed or inconsistent reports.
4. Release checklist and CLI/CI docs link to V3 gate.
5. Solo-maintainer release decision can be made from artifacts alone.

## 9. Risks and Mitigations

Risk: gate becomes noisy and ignored.  
Mitigation: keep blocking checks minimal and objective; move subjective checks to warn-only.

Risk: docs drift from scripts over time.  
Mitigation: include docs-presence and command-path checks in the gate.

Risk: added maintenance burden for a solo maintainer.  
Mitigation: keep schema additive, evaluator simple, and outputs compact.

## 10. Implementation Status (March 23, 2026)

Implemented baseline deliverables:

1. `benchmarks/v3-release/evaluate-gate.ts`
2. `benchmarks/v3-release/validate.ts`
3. `benchmarks/v3-release/report.schema.json`
4. `release/v3/release-manifest.schema.json`
5. `release/v3/release-manifest.example.json`
6. `test/v3-release-gate-validation.test.ts`
7. `package.json` scripts:
   - `bench:v3:gate`
   - `bench:v3:validate`
   - `bench:v3:phase1`
   - `test:v3:gate`
8. Docs/checklist integration in:
   - `docs/launch-checklist-v5.md`
   - `docs/cli-and-ci.md`
   - `benchmarks/README.md`
9. CI integration:
   - `.github/workflows/ci.yml` runs `bench:v3:gate` and `bench:v3:validate` in `phase6-release-gate` job
   - uploads `benchmarks/out/v3-release-gate.json` and `benchmarks/out/v3-release-gate.md`
10. Draft release notes:
   - `docs/RELEASE-NOTES-v3.0.0-draft.md`
11. Structured dogfood evidence contract:
   - `release/v3/dogfood-evidence.schema.json`
   - `release/v3/dogfood-evidence.json`
   - gate check enforces `>=14` day window per completed repo entry
12. Dogfood evidence helper script:
   - `scripts/v3-dogfood-evidence.ts`
   - `pnpm run v3:dogfood:list`
   - `pnpm run v3:dogfood upsert --repo ... --owner ... --start ... --end ... --notes ...`
13. Dogfood helper test coverage:
   - `test/v3-dogfood-evidence-script.test.ts`
14. Release manifest helper test coverage:
   - `test/v3-release-manifest-script.test.ts`
