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

If you want full agent behavior rules and prompt templates, also see:

- `docs/guides/agent-quickstart.md`
- `docs/examples/agent-prompt-pack.md`
- `AGENTS.md`

## Bash

```bash
# Optional overrides
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
DISCOVER_SCOPE="${DISCOVER_SCOPE:-full}"
CONFIG_PATH="${CONFIG_PATH:-signaler.config.json}"

signaler discover \
  --scope "${DISCOVER_SCOPE}" \
  --non-interactive \
  --yes \
  --base-url "${BASE_URL}" \
  --config "${CONFIG_PATH}"

signaler run \
  --contract v3 \
  --mode throughput \
  --ci \
  --no-color \
  --yes \
  --config "${CONFIG_PATH}"

signaler report --dir ".signaler"
```

## PowerShell

```powershell
# Optional overrides
if (-not $env:BASE_URL) { $env:BASE_URL = "http://127.0.0.1:3000" }
if (-not $env:DISCOVER_SCOPE) { $env:DISCOVER_SCOPE = "full" }
if (-not $env:CONFIG_PATH) { $env:CONFIG_PATH = "signaler.config.json" }

signaler discover `
  --scope "$env:DISCOVER_SCOPE" `
  --non-interactive `
  --yes `
  --base-url "$env:BASE_URL" `
  --config "$env:CONFIG_PATH"

signaler run `
  --contract v3 `
  --mode throughput `
  --ci `
  --no-color `
  --yes `
  --config "$env:CONFIG_PATH"

signaler report --dir ".signaler"
```

## Agent File Read Order

After the bootstrap run completes, read these files in order:

1. `.signaler/agent-index.json`
2. `.signaler/suggestions.json`
3. `.signaler/issues.json`
4. `.signaler/results.json`
5. `.signaler/run.json`

This keeps context compact and high-signal.
