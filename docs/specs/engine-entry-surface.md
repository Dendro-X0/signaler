# Engine Entry Surface

Status: Active (v1)
Owner: Signaler core
Last updated: 2026-05-22

## Goal

Expose a **shell-agnostic** engine API for running Signaler workflows. CLI, desktop shell, and Rust launcher should call this surface instead of duplicating orchestration logic.

## Contracts

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Job schema | `engine-contracts/jobs` | `EngineJobV1`, `EngineJobResultV1`, validators |
| Engine runtime | `src/engine/` | preset builders, job execution, artifact writers |
| Shell adapter | `src/job-cli.ts` | argv parsing, human/json output |

## Public API (`src/engine/index.ts`)

### Presets

Build job definitions without running them:

- `buildAgentPresetJob(params)`
- `buildCiPresetJob(params)`
- `buildPrPresetJob(params)`
- `buildPresetJob({ preset, ...params })`

`BuildPresetJobParams`: `cwd`, `outputDir`, optional `baseUrl`, `configPath`, `discoverScope`, `buildId`, `incremental`.

### Execution

```ts
import { executeEngineJob, createDefaultEngineJobStepRunner } from "./engine/index.js";

const outcome = await executeEngineJob({
  job,
  stepRunner: createDefaultEngineJobStepRunner(), // optional; this is the default
  writeArtifacts: true, // default
});

// outcome.exitCode: 0 | 1
// outcome.result: EngineJobResultV1
```

Inject `stepRunner` in tests or alternate hosts to avoid subprocess coupling.

### In-process runner (no subprocess)

```ts
import { createInProcessEngineJobStepRunner, executeEngineJob } from "./engine/index.js";

await executeEngineJob({
  job,
  stepRunner: createInProcessEngineJobStepRunner(),
});
```

CLI:

```bash
signaler job run --preset agent --in-process --base-url http://127.0.0.1:3000
# or: SIGNALER_JOB_IN_PROCESS=1 signaler job run --preset agent ...
```

Dispatches `discover`, `run`, `analyze`, `verify`, `query`, and `explain` to existing CLI modules. Unknown commands fall back to the default subprocess runner.

### Artifact I/O

- `writeEngineRunIndex` — writes canonical `run.json`
- `writeEngineJobArtifacts` — writes `.signaler/jobs/<id>/job.json`, `job-result.json`, `job-latest.json`

## Shell mapping

| Shell command | Engine API |
|---------------|------------|
| `signaler job show --preset agent` | `buildAgentPresetJob` |
| `signaler job run --file job.json` | `executeEngineJob({ job })` |
| `signaler job run --preset ci` | `executeEngineJob({ job: buildPresetJob({ preset: "ci", ... }) })` |

## Non-goals (v1)

1. In-process Lighthouse execution (steps still delegate to `node bin.js` by default).
2. HTTP daemon / long-lived engine service.
3. Replacing individual `analyze` / `verify` CLIs — jobs compose existing commands.

## Related specs

- `engine-job-protocol.md` — file layout and CLI examples
- `engine-isolation-plan.md` — E2/E3 phases
- `engine-contracts-bootstrap-plan.md` — schema boundary
