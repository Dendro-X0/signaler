# Known Limits

This document tracks practical limits that users should account for in production workflows.

## Lighthouse Parity and Scoring

- Throughput mode is trend-focused and may score lower than manual DevTools Lighthouse runs.
- Full-suite fidelity with very low parallelism can become slow and still drift in score quality.
- Recommended policy:
  - Throughput for broad detection and trend comparison.
  - Fidelity on focused worst-N reruns for parity checks.

## Suite Size and Runtime

- Large route/device suites can be CPU-heavy on mainstream hardware.
- Auto resource profiles cap parallelism to reduce runaway load, but wall-clock can still grow significantly.
- Keep route inventory intentional and avoid full-suite deep captures on every PR.

## Route Discovery Constraints

- Dynamic routes may be excluded by default depending on scope/profile and detector rules.
- Discovery quality depends on project structure and accurate project root/base URL configuration.

## Artifact and Token Budget Considerations

- Default v3 artifacts are token-conscious, but legacy artifacts can become expensive.
- Enabling `--legacy-artifacts` increases output volume and downstream AI token usage.
- For AI workflows, start from `agent-index.json` and follow pointers.

## Rust Accelerator Availability

- Rust accelerators are opt-in and can fall back to Node when sidecar execution is unavailable.
- Fallback is safe by design but does not guarantee speedup on every environment.
