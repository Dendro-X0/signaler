# Release Notes - v5.1.9

**Date:** 2026-06-17  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Improves **demo-ready audits** by excluding un-auditable routes during initialization, preserving lab-auth config across discover, and auto-enabling lab auth when `auth.lab` is set in config.

## Added

- **Init-time route auditability** — preflight runs before the Lighthouse task queue; routes that cannot be audited (auth-wall, unreachable) are excluded up front instead of appearing as `skip:auth` rows in the summary table.
- **`coverage.json#/excludedAtInit`** — documents routes filtered at init (separate from runtime skips).
- **Discover preflight** — when the app is reachable, discover probes routes and writes only auditable paths to `signaler.config.json`; exclusions recorded in `discovery.json`.
- **Config preservation on discover** — `auth`, `serveEnv`, quality gates, and other operator-tuned fields are no longer wiped when discover rewrites pages.

## Fixed

- **Redirect-only index routes** — preflight treats in-app redirects (e.g. `/dashboard/admin` → `/dashboard/admin/dashboard/overview`) as auditable when the final path is not an auth URL.
- **Lab auth auto-enable** — `auth.lab: true` in config enables lab auth on `run`, `audit`, and shell without requiring `--lab-auth` on every command.
- **Managed serve base URL** — orchestrator propagates the resolved managed-serve URL into the inner `run` step (not only discover).

## Upgrade

Re-run your original install method with a pinned version:

```bash
SIGNALER_VERSION=5.1.9 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.1.9"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```
