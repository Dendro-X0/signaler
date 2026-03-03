# Migration to V3

V3 is available via `--contract v3` in this release cycle.

## Activation

```bash
signaler run --contract v3 --mode throughput
```

Optional compatibility mode:

```bash
signaler run --contract v3 --legacy-artifacts
```

## Command Mapping

- `audit` -> `run` (alias, same runner)
- `report` -> `review` (alias, same reporter)
- `wizard`/`guide` -> `init` (canonical naming)

## Artifact Mapping

- Legacy `summary-lite.json` -> V3 `results.json`
- Legacy `ai-ledger.json` -> V3 `agent-index.json` + `suggestions.json`
- Legacy `ai-fix*.json` -> V3 `suggestions.json` (ranked + evidence)

## Comparison Guard

V3 compares runs only when `comparabilityHash` matches.

For baseline checks:

```bash
signaler run --contract v3 --baseline .signaler/run.json
```

If hash mismatch is detected, Signaler rejects the comparison to avoid invalid conclusions.
