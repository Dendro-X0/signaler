# Release Notes - v5.1.8

**Date:** 2026-06-15  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

Adds **lab auth** for production-build audits of protected routes (localhost only), plus fixes managed-serve edge cases that can derail demos (stuck ports, and `--no-managed-serve` being ignored inside `audit` jobs).

## Added

- **Lab auth mode** (`--lab-auth` or `auth.lab: true`) — validates loopback base URLs and runs a probe after warmup so protected routes can be audited in a production build without editing app `.env` files.
- **Auth CLI**:
  - `signaler auth login` — optional Playwright form login that writes `auth.cookieFile`.
  - `signaler auth probe` — validates a configured session against a route (useful before a long run).
- **Per-route auth profiles**:
  - `auth.profiles` named sessions
  - `pages[].authProfile` to select a profile for a specific route
- **Coverage metadata** — `coverage.json` now includes `meta.labAuth` (enabled/mode/probeValidated) so demo runs can explain why protected routes scored.

## Fixed

- **`--no-managed-serve` honored for `audit`** — the orchestrator now propagates the flag into the inner `run` step, preventing accidental double-start attempts.
- **Managed serve port conflict guidance** — if port 3000 is occupied by an unhealthy listener, Signaler fails fast with actionable remediation steps instead of waiting for a long timeout.
- **Protected-route preflight** — default protected prefixes are now `/dashboard/`, `/admin/`, `/account/` (configurable via `auth.protectedPathPrefixes`).

## Demo recipe (ecommerce monorepo)

`signaler.config.json`:

```json
{
  "serveEnv": {
    "DEMO_AUTH_BYPASS": "true",
    "NEXT_PUBLIC_DEMO_AUTH_BYPASS": "true"
  },
  "auth": {
    "lab": true,
    "warmupUrl": "/api/demo-auth?callbackUrl=/dashboard/user/wishlist",
    "probePath": "/dashboard/user/wishlist"
  }
}
```

Run:

```bash
signaler audit --lab-auth --cwd . --base-url http://127.0.0.1:3000 --skip-discover --yes --parallel 6
signaler query --view coverage --dir .signaler --json
```

## Upgrade

Re-run your original install method with a pinned version:

```bash
SIGNALER_VERSION=5.1.8 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.1.8"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```

