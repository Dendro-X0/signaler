# Signaler Version Roadmap

Status: Active  
Baseline release: **v4.0.0** (JSR)  
Last updated: 2026-05-24  
Audience: product direction, agent integrators, CLI maintainers

## North-star goals

These goals are stable across versions. Every phase should move at least one metric.

| Goal | What success looks like | How we measure |
|------|-------------------------|------------------|
| **G1 — Agent loop** | One command → canonical artifacts → `query` / `explain` without reading all of `.signaler/` | Dogfood on 2+ real Next apps; agent job exit semantics documented |
| **G2 — Prod truth** | Audits run against production-like servers, not dev/HMR | `--managed-serve` works on pnpm monorepos without hand-fixing `next.config` |
| **G3 — Fast feedback** | Quick scope (12 routes × 2 devices) audits in **&lt;5 min** wall clock when build is cached | `run.json` `elapsedMs`, parallel 6, blogkit + ecommerce fixtures |
| **G4 — Actionable output** | Triage by issue count; ranked analyze actions with evidence | `performance-triage.json` + `analyze.json` consumed by agents |
| **G5 — Installable** | Humans and CI can install and run without registry/shell archaeology | JSR install smoke; Windows installer path (later phase) |

## Non-goals (this roadmap)

- Replacing Lighthouse or re-scoring DevTools parity in throughput mode
- Full dynamic-route discovery in quick scope
- Desktop app / VS Code extension as primary shell (see `shell-decision-record.md`; engine-first)
- v4 contract breaking changes before v3.x agent path is boringly reliable

## Version map

```
v3.2.x  shipped   engine contracts, managed-serve v1, in-process jobs
v3.3.x  next      agent happy path (one command, exit codes, preset defaults)
v3.4.x            prod serve hardening (Next 16 / pnpm / monorepo)
v3.5.x            discover + scope honesty + human summary
v4.0.0  shipped   CLI surface cleanup (audit orchestrator, shell split, dev managed serve)
```

---

## Phase 1 — v3.3.x: Agent happy path

**Theme:** Make the default agent workflow obvious, fast, and recoverable.

**User outcome:**  
`signaler job run --preset agent --managed-serve --in-process --cwd <project>` is the documented golden path; partial success does not trap agents in false failures.

### Deliverables

| ID | Deliverable | Owner surface |
|----|-------------|---------------|
| 3.3.1 | **Agent preset defaults**: `--parallel` (default 6 via `SIGNALER_PARALLEL`), `--managed-serve` documented on preset | `presets.ts`, `job-cli.ts`, `AGENTS.md` |
| 3.3.2 | **Job exit codes**: `0` success; `1` discover/run failure; `2` run OK, analyze failed (triage still valid) | `run-job.ts`, `job-cli.ts` |
| 3.3.3 | **Managed-serve build hints** on failure (Next 16 Turbopack, pnpm hoist, `next build --webpack`) | `managed-production-server.ts` |
| 3.3.4 | **Canonical agent doc** block in `AGENTS.md` + `docs/guides/agent-quickstart.md` | docs |
| 3.3.5 | **Dogfood gate**: blogkit + ecommerce quick job green in CI fixture or documented manual gate | `test/` or `docs/operations/` |

### Exit criteria

- [ ] Agent preset run step includes configurable parallel (default 6)
- [ ] Job returns exit code `2` when `performance-triage.json` exists but analyze fails
- [ ] `AGENTS.md` shows one copy-paste command with `--managed-serve --in-process`
- [ ] Blogkit + ecommerce quick runs complete in &lt;5 min audit time with cached build

### Not in 3.3

- New top-level `signaler audit` orchestrator (defer to 3.4 if still needed)
- Attach to server returning HTTP 500
- Full `cli.ts` shell split

---

## Phase 2 — v3.4.x: Production serve hardening

**Theme:** Managed serve works on real Next 16 + pnpm monorepos without project-specific surgery.

**User outcome:** First `signaler run --managed-serve` on a typical Next app succeeds or returns **actionable** fix steps.

### Deliverables

| ID | Deliverable |
|----|-------------|
| 3.4.1 | Detect Turbopack build failures; suggest `next build --webpack` in error output |
| 3.4.2 | Monorepo serve plan: prefer `apps/web` when root `build` delegates via `pnpm --filter` |
| 3.4.3 | `--managed-serve-reuse` (or probe mode): optional attach when port open but non-2xx (warn, do not rebuild) |
| 3.4.4 | Cache build: skip rebuild when `.next/BUILD_ID` fresh + mtime policy |
| 3.4.5 | Integration test: minimal Next fixture with managed-serve lifecycle |

### Exit criteria

- [ ] Fresh clone of ecommerce monorepo: managed-serve build+audit without manual `next.config` edits
- [ ] Blogkit-class Turbopack/pnpm issues documented in troubleshooting, not only chat

---

## Phase 3 — v3.5.x: Discover and scope honesty

**Theme:** Users and agents know what “quick” means and what was excluded.

**User outcome:** After discover, output states **% of routes audited** and recommends `full` when quick is misleading.

### Deliverables

| ID | Deliverable |
|----|-------------|
| 3.5.1 | Discover summary: `auditedCoveragePct`, `excludedReasons` breakdown |
| 3.5.2 | App Router / MDX route source improvements for discover |
| 3.5.3 | `signaler report --summary` one-screen human view (meta + triage totals + top 5 actions) |
| 3.5.4 | `agent-index.json` documents job exit codes and `partialSuccess` when applicable |

### Exit criteria

- [ ] Quick scope on 40+ route app prints “auditing 12/43 routes (28%)”
- [ ] `signaler report --summary` needs no HTML open for status check

---

## Phase 4 — v4.0.0: CLI surface cleanup

**Theme:** Thin shell, fat engine; remove aliases and duplicate entry points.

**User outcome:** Command tree fits on one screen; engine callable without `cli.ts` god-file.

### Deliverables

| ID | Deliverable |
|----|-------------|
| 4.0.1 | Remove `audit` → `run` alias (breaking; migration note) |
| 4.0.2 | `signaler audit` becomes orchestrator: discover? + managed-serve + run + analyze |
| 4.0.3 | Shell (`src/shell/`) owns argv/help; engine owns execution |
| 4.0.4 | Stable programmatic API: `executeEngineJob`, `ensureManagedProductionServer` exported as documented packages |

### Exit criteria

- [ ] `cli.ts` under ~2k lines or split into routed modules
- [ ] v4 migration guide published

---

## Cross-cutting metrics (track each phase)

| Metric | Target |
|--------|--------|
| Quick audit duration (24 combos, parallel 6, warm build) | &lt; 2 min Lighthouse phase |
| Agent artifacts size (lean profile) | `agent-index` &lt; 2 KB; no mandatory multi-MB reads |
| Job false-failure rate | 0% when triage actionable and analyze skipped/failed |
| Managed-serve first-run success | ≥ 80% on reference fixtures (blogkit, ecommerce, spa) |

## Reference commands (golden path)

```bash
# Agent loop (v3.3+)
signaler job run --preset agent \
  --managed-serve --in-process \
  --scope quick \
  --cwd /path/to/project \
  --base-url http://127.0.0.1:3000

# Read order
# .signaler/agent-index.json → performance-triage.json → analyze.json

signaler query --view perf --json
signaler explain --id redirects --json
```

## Related specs

- `docs/specs/managed-production-serve.md`
- `docs/specs/engine-entry-surface.md`
- `docs/specs/engine-job-protocol.md`
- `docs/specs/shell-decision-record.md`

## Archive

Reboot-era roadmaps that discuss desktop-first shell remain in `docs/archive/roadmaps/`. This document is the **CLI iteration** track until v4; shell choice does not block 3.3–3.5.
