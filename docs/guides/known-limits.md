# Known Limits

This document tracks practical limits that users should account for in production workflows.

## Distribution and lifecycle

- **GitHub Release only** — npm and JSR are deprecated; portable zip + `install.sh` / `install.ps1` (or the Windows setup exe) is the supported path.
- **Shell matters on Windows** — Git Bash uses `install.sh`; PowerShell uses `install.ps1`. Do not run `irm | iex` in Bash. See [install matrix](./install-matrix.md).
- **First install is slow** — expect 5–15 minutes while npm pulls Lighthouse, Playwright, and related tooling inside the portable bundle.
- **`signaler uninstall --global`** removes install files but **not** PATH entries added to your shell profile or Windows user PATH; clean those manually after uninstall.
- **`signaler upgrade` on Windows** requires **5.1.4+** for reliable archive extraction; when in doubt, re-run the install script with `SIGNALER_VERSION`.
- **CI** should use the GitHub Action or `install.sh` in the workflow — not a global npm install.

## Lighthouse parity and scoring

- Throughput mode is trend-focused and may score lower than manual DevTools Lighthouse runs.
- Performance prioritization uses **issue-count triage** (`signaler query --view perf`), not category score parity. See [Lab semantics](./lab-semantics.md).
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
