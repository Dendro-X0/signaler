# Migration to V4 (Planned)

This guide defines the migration policy from current V3-era flows to V4 canonical flows.

## 1. Canonical Command Mapping

- `discover` is the new setup/discovery command.
- `run` remains the canonical runner.
- `report` is the new reporting command.

Compatibility aliases:

- `init` remains supported as alias to `discover` during transition.
- `audit` remains supported as alias to `run` during transition.
- `review` remains supported as alias to `report` during transition.

## 2. Artifact Migration

V4 default artifacts:

- `.signaler/run.json`
- `.signaler/results.json`
- `.signaler/suggestions.json`
- `.signaler/report.md`

Legacy artifacts remain opt-in via compatibility mode for at least one transition release.

## 3. Recommended Team Workflow

Current recommended workflow (today, canonical):

```bash
signaler discover --scope full
signaler run --contract v3 --mode throughput
signaler report
```

Compatibility alias workflow (still supported during transition):

```bash
signaler init
signaler run --contract v3 --mode throughput
signaler review
```

V4 target workflow (after rollout):

```bash
signaler discover --scope full
signaler run --mode fidelity
signaler report
```

## 4. Rollout Policy

1. Introduce `discover` and `report` with alias compatibility enabled.
2. Keep existing scripts working with deprecation hints in CLI help/output.
3. Flip docs and examples to V4 canonical workflow.
4. Require explicit legacy flags for heavy legacy artifacts in a later release.

## 5. Safety Guardrails

- Do not compare runs when `comparabilityHash` differs.
- Prefer `fidelity` for manual trust checks.
- Prefer `throughput` for CI trend monitoring.
