# Engine Job Protocol (v1)

Status: Active  
Last updated: 2026-05-22

## Goal

Provide a **file-based, shell-agnostic** way to run Signaler workflows without registry installs or ad-hoc shell scripts.

## Job files

Location:

- `.signaler/jobs/<jobId>/job.json`
- `.signaler/jobs/<jobId>/job-result.json`
- `.signaler/job-latest.json` (pointer to most recent result)

## Schema (v1)

```json
{
  "schemaVersion": 1,
  "jobId": "job-1710000000000",
  "createdAt": "2026-05-22T00:00:00.000Z",
  "cwd": "/path/to/project",
  "outputDir": ".signaler",
  "preset": "agent",
  "steps": [
    { "command": "discover", "args": ["--scope", "full", "--non-interactive", "--yes"] },
    { "command": "run", "args": ["--contract", "v3", "--mode", "throughput", "--artifact-profile", "lean", "--ci", "--no-color", "--yes"] },
    { "command": "analyze", "args": ["--contract", "v6", "--artifact-profile", "lean", "--dir", "/path/to/project/.signaler"] }
  ]
}
```

## CLI

```bash
# Built-in agent workflow (discover -> run -> analyze)
signaler job run --preset agent --base-url http://127.0.0.1:3000
signaler job run --preset agent --config ./signaler.config.json

# CI variant (adds --fail-on-budget on run)
signaler job run --preset ci --base-url http://127.0.0.1:3000
signaler job run --preset ci --scope quick --config ./signaler.config.json

# PR / changed-files (run --changed-only -> analyze; skips discover)
signaler job run --preset pr
signaler job run --preset pr --incremental --build-id "$(git rev-parse --short HEAD)"

# Custom job file
signaler job run --file ./my-job.json

# Inspect preset without running
signaler job show --preset agent --json

# Latest result
signaler job status --dir .signaler
```

## Rust launcher

`rust/signaler_launcher` builds a native `signaler` binary that:

1. Resolves the portable install root (`SIGNALER_INSTALL_ROOT` or directory containing `dist/bin.js`)
2. Locates Node.js on PATH
3. Delegates to `node dist/bin.js <args>`

Portable releases attempt to bundle `signaler-native` / `signalar-native` when `cargo` is available at build time. Shell launchers prefer the native binary when present.

## Engine entry surface

Shell-agnostic API: `docs/specs/engine-entry-surface.md` (`src/engine/index.ts`).

- Build: `buildAgentPresetJob`, `buildPresetJob`, …
- Run: `executeEngineJob({ job, stepRunner? })`
- In-process: `signaler job run --in-process` or `SIGNALER_JOB_IN_PROCESS=1`

## Agent integration

Agents should prefer:

1. `signaler job run --preset agent` for full setup + audit + analyze
2. `signaler query --view agent` after the job completes
3. `signaler query --view delta` after verify
