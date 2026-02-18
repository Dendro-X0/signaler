# Signaler artifacts navigation

Generated: 2026-02-15T18:14:18.810Z

This folder contains outputs produced by Signaler commands. Use this document to quickly locate the right artifact for a task.

## Quick start

- For a human summary: open `overview.md` then `triage.md`.
- For a machine/AI plan: open `ai-ledger.json` and follow `fixPlan`.
- For structured issues: open `issues.json`.
- For PWA-specific signals: open `pwa.json`.
- For a compact suite summary: open `summary-lite.json`.

## Key artifacts (common)

- `overview.md`: top issues + worst routes + recommended next runs.
- `triage.md`: the fastest human triage view; links to the exact per-page artifacts.
- `report.html`: full Lighthouse HTML report for the suite.
- `summary.json`: full suite summary with all combos and metrics.
- `summary-lite.json`: smaller summary for quick parsing.
- `issues.json`: normalized issues across all combos (opportunities, hints, evidence).
- `ai-ledger.json`: AI-first index: issueIndex + fixPlan + offenders + evidence pointers.
- `pwa.json`: PWA-focused Lighthouse checks (installability, HTTPS, service worker, offline-ready signals).
- `plan.json`: resolved run plan and safety estimates.
- `export.json`: shareable payload for external tools.

## Runner-specific artifacts

- `measure.*`: fast CDP metrics (not Lighthouse).
- `headers.*`: security headers audit.
- `links.*`: broken links audit.
- `bundle.*`: bundle size scan (Next.js `.next/` or other dist outputs).
- `console.*`: browser console errors/exceptions capture.
- `accessibility.*`: fast axe-core sweep (optional, non-Lighthouse).

## Heavy diagnostics

- `lighthouse-artifacts/diagnostics-lite/`: smaller per-combo Lighthouse payload (best for navigation).
- `lighthouse-artifacts/diagnostics/`: larger payloads with more detail.
- `screenshots/`: screenshots captured during Lighthouse runs.

## Files in this directory

- [AI-ANALYSIS.json](AI-ANALYSIS.json)
- [ai-fix.json](ai-fix.json)
- [ai-fix.min.json](ai-fix.min.json)
- [ai-ledger.json](ai-ledger.json)
- [AI-SUMMARY.json](AI-SUMMARY.json)
- [export-bundle.json](export-bundle.json)
- [export.json](export.json)
- [issues.json](issues.json)
- [NAVIGATION.md](NAVIGATION.md)
- [overview.md](overview.md)
- [plan.json](plan.json)
- [pwa.json](pwa.json)
- [QUICK-FIXES.md](QUICK-FIXES.md)
- [red-issues.json](red-issues.json)
- [red-issues.md](red-issues.md)
- [report.html](report.html)
- [run.json](run.json)
- [summary-lite.json](summary-lite.json)
- [summary.json](summary.json)
- [summary.md](summary.md)
- [triage.md](triage.md)

