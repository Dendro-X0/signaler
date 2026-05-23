# Agent Bootstrap (Shell Variants)

Use these copy-paste blocks to bootstrap Signaler artifacts for coding agents.

This file is shell-focused:

- `bash` variant
- PowerShell variant

If you want one-command execution instead of copy/paste blocks:

- `bash scripts/agent-bootstrap.sh`
- `powershell -ExecutionPolicy Bypass -File scripts/agent-bootstrap.ps1`
- `corepack pnpm run agent:bootstrap:sh`
- `corepack pnpm run agent:bootstrap:ps`

Default bootstrap uses **`signaler job run --preset agent`** (discover → run v3 lean → analyze v6). Set `JOB_PRESET=manual` for step-by-step discover/run/analyze.

If you want full agent behavior rules and prompt templates, also see:

- `docs/guides/agent-quickstart.md`
- `docs/examples/agent-prompt-pack.md`
- `AGENTS.md`

## Bash (default: agent job)

```bash
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
CONFIG_PATH="${CONFIG_PATH:-signaler.config.json}"
OUTPUT_DIR="${OUTPUT_DIR:-.signaler}"

signaler job run --preset agent --base-url "${BASE_URL}" --dir "${OUTPUT_DIR}" --config "${CONFIG_PATH}"

signaler query --view perf --dir "${OUTPUT_DIR}"
signaler explain --id <issue-id> --dir "${OUTPUT_DIR}"
```

## Bash (manual steps)

```bash
JOB_PRESET=manual bash scripts/agent-bootstrap.sh
```

Or copy/paste:

```bash
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
CONFIG_PATH="${CONFIG_PATH:-signaler.config.json}"

signaler discover \
  --scope full \
  --non-interactive \
  --yes \
  --base-url "${BASE_URL}" \
  --config "${CONFIG_PATH}"

signaler run \
  --contract v3 \
  --mode throughput \
  --artifact-profile lean \
  --ci \
  --no-color \
  --yes \
  --config "${CONFIG_PATH}"

signaler analyze --contract v6 --artifact-profile lean --dir ".signaler"
```

## PowerShell (default: agent job)

```powershell
if (-not $env:BASE_URL) { $env:BASE_URL = "http://127.0.0.1:3000" }
if (-not $env:CONFIG_PATH) { $env:CONFIG_PATH = "signaler.config.json" }
if (-not $env:OUTPUT_DIR) { $env:OUTPUT_DIR = ".signaler" }

signaler job run --preset agent --base-url "$env:BASE_URL" --dir "$env:OUTPUT_DIR" --config "$env:CONFIG_PATH"

signaler query --view perf --dir "$env:OUTPUT_DIR"
signaler explain --id <issue-id> --dir "$env:OUTPUT_DIR"
```

## Agent read API (preferred)

After bootstrap:

1. `signaler query --view agent`
2. `signaler query --view perf`
3. `signaler explain --id <id>` before editing code

Direct files when needed: `analyze.json`, `performance-triage.json`, `agent-index.json`.
