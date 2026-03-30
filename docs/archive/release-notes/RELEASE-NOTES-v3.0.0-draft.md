# Signaler v3.0.0 (Draft Release Notes)

Status: Draft  
Date: TBD

## Overview

`v3.0.0` formalizes the V3 overhaul as the default release line for Signaler.

Core canonical loop:

1. `signaler discover`
2. `signaler run --contract v3 --mode throughput|fidelity`
3. `signaler analyze --contract v6`
4. `signaler verify --contract v6`
5. `signaler report`

## Highlights

1. V3 canonical machine artifacts are first-class and migration-safe.
2. V6 analyze/verify loop is stable and deterministic for agent workflows.
3. V3 release-standardization Phase 1 gate is available:
   - `pnpm run bench:v3:gate`
   - `pnpm run bench:v3:validate`
4. Release manifest contract is defined under `release/v3/`.

## Compatibility Notes

1. Legacy aliases remain supported in this draft (`init`, `audit`, `review`).
2. Alias deprecation timeline is tracked in `docs/v3-deprecation-matrix.md` (planned removal boundary: `v4.0`).
3. Existing V3/V6 additive contract guarantees remain in effect.
4. Local unpublished builds continue to use `node ./dist/bin.js ...`.

## Migration Notes

See:

1. `docs/MIGRATION.md`
2. `docs/v3-contract.md`
3. `docs/v3-release-standardization-roadmap.md`

## Known Follow-Ups Before GA

1. Final cross-platform smoke evidence confirmation (Windows/macOS/Linux CI run).
2. Confirm release asset checklist + checksums using `pnpm run bench:v3:phase2`.
