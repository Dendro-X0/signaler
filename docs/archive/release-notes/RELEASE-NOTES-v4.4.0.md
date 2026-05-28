# Release Notes - v4.4.0

**Date:** 2026-05-28  
**Package:** `@signaler/cli@4.4.0` (JSR + GitHub Release)

## Summary

Signaler 4.4.0 is the **v4.x stabilization** release: dogfood-proven fixes for managed serve, artifact trust, links discovery, quality-pack onboarding, and consistent CLI defaults across `audit`, `job run`, and `run`.

## Highlights

### Reliability and trust

- **Managed-serve diagnostics** when dev/production startup times out
- **`artifactStatus`** in query views; failed managed-serve runs recorded in `job-latest.json`
- **Links `checkStatus`** distinguishes pass vs inconclusive (zero URLs discovered)

### Links discovery fix

- Treats `localhost` and `127.0.0.1` as equivalent loopback origins
- Falls back to config pages when sitemap returns 200 but no usable URLs

### Quality pack UX

- Onboarding guidance in CLI output and `quality-pack.json` for headers, links, and bundle failures
- Monorepo bundle step scans resolved Next app root (e.g. `apps/web`)

### CLI alignment

- **Managed serve on by default** for `audit`, `job run`, and `run` (opt out: `--no-managed-serve`)
- **Mode `auto`** by default (dev first, production fallback)
- **In-process on by default** for `audit` and `job run`

## Install (JSR)

```bash
npx jsr add @signaler/cli@4.4.0
```

## Quick start

```bash
signaler audit --quality-profile web-quality --cwd . --base-url http://127.0.0.1:3000
signaler query --view agent --dir .signaler --json
```

For apps with slow dev startup, use production serve:

```bash
signaler audit --managed-serve-mode production --skip-discover --cwd .
```

## Migration

No breaking CLI renames. CI jobs that assumed managed serve was off for `job run` should add `--no-managed-serve` or set `SIGNALER_MANAGED_SERVE=0` if they start the server separately.
