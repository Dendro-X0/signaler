# Release Notes - v5.2.0

**Date:** 2026-06-17  
**Package:** Signaler CLI (GitHub Release native packaging)

## Summary

**v5.2.0** focuses on **ease of use and automation**: zero-config onboarding for any web stack, attach-first audits, transparent lab-environment consent, and gentle guidance when your dev server is not running yet.

## Added

- **`signaler bootstrap`** — scans the project directory (routes, ports, auth signals), writes `signaler.config.json`, optionally runs the first audit (`--audit --yes`).
- **`signaler explore`** — probe loopback servers and routes; writes `.signaler/explore.json`.
- **Auto-config** — `signaler audit` writes `signaler.config.json` from explore when missing (no manual discover step).
- **Lab env transparency** — consent prompt with offline/loopback security notice before inferred `serveEnv` injection; per-key purpose comments; `--no-audit-bypass` opt-out.
- **`serve` config block** — `mode`, `portHints`, `healthPath` for attach vs managed-serve policy.
- **Server-not-ready guidance** — suggests `pnpm dev` / `npm run dev` from `package.json`; `.signaler/server-not-ready.json` artifact; exit 0 (not a hard failure).
- **Managed-serve log streaming** — `[serve]` prefixed child output.

## Changed

- **Attach-first default** — audits expect a running loopback server; Signaler does not auto-start dev servers unless you opt in.
- **`signaler quickstart`** — now runs `bootstrap --audit --yes`.
- **Explore prelude** — runs before every orchestrated audit (port hints, attach, auto-config).

## Breaking / migration

If your CI relied on **implicit managed production serve** (previous default):

```bash
# Option A: explicit flag
signaler audit --managed-serve --cwd . --base-url http://127.0.0.1:3000

# Option B: environment (legacy CI)
SIGNALER_MANAGED_SERVE=1 signaler audit --cwd .

# Option C: config
# "serve": { "mode": "production" }
```

Recommended new-user flow:

```bash
# Terminal 1
pnpm dev

# Terminal 2
signaler bootstrap --audit --yes
```

## Upgrade

Re-run your original install method with a pinned version:

```bash
SIGNALER_VERSION=5.2.0 curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
```

```powershell
$env:SIGNALER_VERSION = "5.2.0"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
```
