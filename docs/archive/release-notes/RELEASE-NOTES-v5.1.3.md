# Release Notes - v5.1.3

**Date:** 2026-06-13  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Production-first audits, colored terminal score tables, and a working `open` command for the tree-layout HTML report (including Windows paths with spaces).

## Changed

- **Managed serve default** — `signaler audit` and job presets use **production** serve (`next build` + `start`) by default instead of `pnpm dev`. Pass `--managed-serve-mode dev` for dev-server runs.
- **Terminal colors** — removed `--no-color` from agent/CI job run steps; interactive runs show colorized score tables. Performance column remains `P(ref)` (lab reference, not DevTools).
- **Shell `open`** — resolves `.signaler/developer/report.html` after tree layout materialize.

## Fixed

- **Windows report open** — paths with spaces (e.g. `Web Projects`) open via `cmd /c start` with correct argument passing.
- **Missing report.html** — `open` no longer targets the flat root path that tree layout prunes.

## Upgrade from 5.1.2

```bash
signaler upgrade
```

Or re-run the install script for your platform.

## Interpreting performance scores

- Use `signaler query --view perf` for issue-count triage (red/yellow).
- `P(ref)` under throughput mode is not DevTools parity — see `docs/guides/lab-semantics.md`.
