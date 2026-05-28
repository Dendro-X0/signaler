# Phase 4.4 - v4.x Stabilization

Status: **Shipped** (v4.4.0, 2026-05-28)  
Last updated: 2026-05-28

## Goal

Ship a reliability-focused v4.x release that fixes dogfood-proven UX and artifact correctness gaps before publishing v5.0.0.

## Why this slice

Recent audits across real Next.js projects surfaced practical issues that reduce trust and increase debugging time:

- managed-serve timeout failures are hard to diagnose quickly
- monorepo bundle scan can report zero files despite successful route discovery
- failed runs can leave stale `.signaler` data that looks fresh
- links "0 broken" can be misleading when no links were discovered
- quality-pack is strict by default, but remediation guidance is sparse

## Scope (must ship in v4.x)

1. **Managed-serve diagnostics**
   - Enrich timeout error output with likely root causes and next commands.
   - Include script/path checks for common monorepo layouts.

2. **Monorepo bundle detection**
   - Detect and scan the resolved web app directory (for example `apps/web`) instead of always scanning repo root.
   - Add config override for bundle scan root where needed.

3. **Stale artifact safety**
   - Mark failed/incomplete runs clearly in `job-latest.json` and query views.
   - Warn when reading artifacts older than the latest failed job.

4. **Links inconclusive semantics**
   - Differentiate `pass` from `inconclusive` when discovered URL count is zero.
   - Surface this in CLI summary and `quality-pack.json`.

5. **Quality-pack onboarding**
   - Improve first-run guidance when header checks fail across many routes.
   - Provide direct config/examples in output hints (`qualityPack` thresholds and staged rollout advice).

6. **Action/category clarity**
   - Tighten category mapping so accessibility/SEO issues are not over-grouped as performance actions.

## Nice-to-have (if low risk)

- optional bundle byte budgets in `qualityPack` (otherwise keep deferred to v5.x)

## Exit criteria

- Dogfood runs complete with actionable errors (no opaque serve timeout)
- Bundle scan reports non-zero files for monorepo Next apps when bundles exist
- Query views visibly indicate stale/incomplete artifact states
- Links no-discovery cases are labeled inconclusive
- Quality-pack guidance is clear enough for first-time adoption

## Verification

```bash
pnpm build
pnpm exec vitest run test/job-cli.test.ts test/quality-pack.test.ts test/quality-profiles.test.ts

# Dogfood targets
node ./dist/bin.js audit --quality-profile web-quality --scope quick --cwd "E:/Web Projects/experimental-workspace/apex-auditor-workspace/next-blogkit-pro"
node ./dist/bin.js audit --quality-profile web-quality --scope quick --cwd "E:/Web Projects/experimental-workspace/apex-auditor-workspace/next-ecommercekit-monorepo"
```

## Relationship to v5.0.0

v5.0.0 feature scope remains implemented but **release/tag is deferred** until this stabilization slice ships and dogfood confidence is restored.
