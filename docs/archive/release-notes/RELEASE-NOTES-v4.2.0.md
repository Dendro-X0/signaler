# Release Notes - v4.2.0

**Date:** 2026-05-25  
**Package:** `@signaler/cli@4.2.0` (JSR + GitHub Release)

## Summary

Signaler 4.2.0 is the **Team CI pack**: a composite GitHub Action, managed-serve workflow templates, and job-summary output for PR and branch CI. No breaking CLI changes.

## Highlights

### GitHub Actions

- **Composite action** at `.github/actions/signaler`:
  - Presets: `audit`, `ci`, `pr`, `agent`
  - Managed serve (`auto` by default)
  - Upload `.signaler/` artifacts
  - Job summary from `report --summary` and `query --view perf`
- **Workflow templates** (pnpm/npm/yarn) updated for v4 — no manual `wait-on` + `pnpm start`.
- Guide: [`docs/guides/github-actions.md`](../../guides/github-actions.md).

### Carried from 4.1.0

- B2B roadmap, team value guide, portable CI tests, coverage threshold alignment.
- README **For teams** and v4 `signaler audit` quick start.

## Install (JSR)

```bash
npx jsr add @signaler/cli@4.2.0
pnpm dlx jsr add @signaler/cli@4.2.0
```

## Verification

```bash
signaler --version   # 4.2.0
npx jsr run @signaler/cli@4.2.0 -- help audit
```

## Upgrade from 4.1.0

Drop-in replacement. Update `cli-version` in GitHub Action inputs if pinned.
