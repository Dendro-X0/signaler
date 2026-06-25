# Phase 5.2.1 — Cleanup & Optimization

Status: In progress  
Parent: v5.2 intelligent audit line  
Updated: 2026-06-18

## Theme

v5.2.0 shipped attach-first, bootstrap, and explore. v5.2.1 is a **lean patch**: remove dead code, consolidate duplicated orchestration paths, and finish small UX gaps — without breaking the agent artifact contract.

## User outcome

- Faster first audit (less redundant discover/explore work).
- Smaller, easier-to-navigate codebase for contributors.
- Clearer deprecation path for aliases and legacy artifact modes.
- CI users who missed the attach-first default get better guardrails.

## Non-goals (defer to v5.3+)

- Rust `signaler_hotpath explore` (spec Phase 5).
- Full engine isolation / file-based job protocol (spec Phase 6).
- Removing `signalar` launcher alias (wide install surface).
- Breaking removal of `init` / `review` without one release of stronger warnings.

---

## Slice A — Dead code removal (low risk)

| ID | Item | Notes |
|----|------|-------|
| A.1 | Delete `src/measure-runner.ts`, `src/measure-types.ts` | TEMPORARY re-exports; zero imports in repo |
| A.2 | Remove `resolveServeEnvForProject` | `@deprecated` wrapper; callers use `resolveServeEnvWithConsent` |
| A.3 | Audit `src/contracts/**` shim usage | Re-export only from `engine-contracts/`; grep external importers before delete |
| A.4 | Stale help strings | `planned removal in v4.0` on `init`/`review` — update to v5.3.0 sunset |

**Exit:** `pnpm run build && pnpm run test:full` green; no new import paths required for in-repo consumers.

---

## Slice B — Orchestration deduplication (medium risk)

| ID | Item | Notes |
|----|------|-------|
| B.1 | Single attach/managed-serve entry | `run-preset-job`, `audit-orchestrator-cli`, `job-cli`, `cli.ts` all touch serve flags — extract shared prelude |
| B.2 | Explore manifest cache | Reuse `.signaler/explore.json` when fresh (&lt; N min) to skip re-scan on retry |
| B.3 | Discover vs explore | When `bootstrap`/`audit` already explored, skip redundant `discover` step in presets |
| B.4 | `wizard-cli.ts` (1647 LOC) | Split: `discover-cli.ts` (non-interactive + CI) vs thin interactive wrapper |

**Exit:** Dogfood on 2 reference apps; attach retry latency improves; no duplicate explore logs in one audit run.

---

## Slice C — `cli.ts` decomposition (high value, staged)

`src/cli.ts` is **~7.6k LOC** — the largest accumulation point. v5.2.1 extracts **slice 1 only**:

| Extract | Target module | Keeps stable |
|---------|---------------|--------------|
| Arg parsing (`parseArgs`, `CliArgs`) | `src/cli/run-args.ts` | `runAuditCli` signature |
| V3 artifact writers | `src/engine/artifacts/write-run-v3.ts` | Tree layout + prune |
| Suggestion / fix-queue builders | `src/engine/analyze/suggestions.ts` | `query` / `explain` IDs |

**Do not** move analyze/verify/query in 5.2.1 — those already live in dedicated `*-cli.ts` files.

**Exit:** `cli.ts` &lt; 5k LOC; zero behavior change in `test/cli*.test.ts` and contract tests.

---

## Slice D — Legacy artifact & output sunset (warn in 5.2.1)

| Item | 5.2.1 action | 5.3.0 action |
|------|--------------|--------------|
| `--contract legacy` default | Log once: prefer `--contract v3` | Flip default to `v3` |
| `writeFullLegacyArtifacts` flat copies | Document removal; gate behind `--legacy-artifacts` only | Stop writing flat root files |
| `.apex-auditor` output dir | Warn when fallback used | Remove `hasLegacyOutputDir()` fallback |
| `init` / `review` aliases | One-line stderr warning per session | Remove aliases + update tests |

---

## Slice E — v5.2 follow-up UX (ship in 5.2.1)

| ID | Item |
|----|------|
| E.1 | `signaler --version` quick start → bootstrap / explore first |
| E.2 | `server-not-ready.json` includes detected `portHints` and monorepo `serve.root` when inferred |
| E.3 | CI template docs: explicit `--managed-serve` for headless pipelines |
| E.4 | `signaler audit` re-attach: read explore cache before failing |

---

## Slice F — Tooling guardrails

| ID | Item |
|----|------|
| F.1 | Add `pnpm run lint` (Biome or ESLint) — start with `src/engine/explore/`, `src/shell/` |
| F.2 | CI job: lint on changed paths |
| F.3 | `max-lines` or CODEOWNERS on `cli.ts` until decomposition completes |

---

## Suggested implementation order

1. **A** (dead code) — same day, zero user impact  
2. **E** (UX gaps from 5.2.0 feedback)  
3. **B.2–B.3** (explore cache + skip redundant discover)  
4. **C slice 1** (`run-args` extraction)  
5. **D** warnings only  
6. **F** lint scaffold  

## Verification

```bash
pnpm run build
pnpm run test:full
pnpm run release:preflight
# Dogfood
signaler bootstrap --audit --yes --cwd <next-app>
signaler audit --incremental-skip --cwd <next-app>
```

## Exit criteria (v5.2.1 tag)

- [ ] Changelog section: Removed / Changed / Fixed with migration notes for deprecations
- [ ] No new breaking defaults (warnings only)
- [ ] `cli.ts` reduced ≥ 2k LOC OR explore cache shipped
- [ ] Dead re-export files removed
- [ ] `active-roadmap.md` points here until 5.2.1 ships
