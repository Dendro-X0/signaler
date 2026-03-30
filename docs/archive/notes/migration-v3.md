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
- `review` -> `report` (alias, same reporter)
- `init`/`wizard`/`guide` -> `discover` (alias, same setup flow)

## Artifact Mapping

- Legacy `summary-lite.json` -> V3 `results.json`
- Legacy `ai-ledger.json` -> V3 `agent-index.json` + `suggestions.json`
- Legacy `ai-fix*.json` -> V3 `suggestions.json` (ranked + evidence)

`agent-index.json` now also carries `compatibility.legacyToCanonical` for machine-readable migration mapping.

## Comparison Guard

V3 compares runs only when `comparabilityHash` matches.

For baseline checks:

```bash
signaler run --contract v3 --baseline .signaler/run.json
```

If hash mismatch is detected, Signaler rejects the comparison to avoid invalid conclusions.

## V6 Agent Layer Bridge

V3 remains the canonical run contract. For agent decision loops, add:

```bash
signaler analyze --contract v6
signaler verify --contract v6
```

Mapping:

- V3 `agent-index.json` -> V6 `analyze.json` (primary action packet)
- V3 `suggestions.json` -> V6 `analyze.json.actions[]` (filtered/ranked/token-bounded)
- V3 manual rerun loop -> V6 `verify.json` pass/fail check contract
