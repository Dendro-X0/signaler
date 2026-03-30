# Signaler v3.0.0 Release Notes

Status: Released
Date: 2026-03-29

## Overview

`v3.0.0` makes the V3 overhaul the default GA line for Signaler.

Canonical workflow:

1. `signaler discover`
2. `signaler run --contract v3 --mode throughput|fidelity`
3. `signaler analyze --contract v6`
4. `signaler verify --contract v6`
5. `signaler report`

## Highlights

1. V3 machine artifacts are stable, additive, and migration-safe.
2. V6 analyze/verify action loop is deterministic for agent workflows.
3. V3 release-standardization gate and validator are shipped:
   - `pnpm run bench:v3:gate`
   - `pnpm run bench:v3:validate`
4. Release manifest contract is versioned under `release/v3/`.
5. Canonical docs are consolidated under `docs/guides`, `docs/reference`, and `docs/operations`.

## Compatibility Notes

1. Compatibility aliases remain available:
   - `init` -> `discover`
   - `audit` -> `run`
   - `review` -> `report`
2. Additive contract guarantees remain in effect for V3/V6 outputs.
3. Local unpublished runs continue to be supported via `node ./dist/bin.js`.

## Migration

1. [Migration Guide](../../guides/migration.md)
2. [Contracts: V3](../../reference/contracts-v3.md)
3. [Active Roadmap](../../roadmap/active-roadmap.md)

## Post-GA Focus

1. Workstream J: benchmark and spec coverage expansion.
2. Workstream K: Rust performance path for high-volume multi-source signals.
