# Migration Guide

This guide covers practical migration paths to the current Signaler CLI.

## 1) Package and Command Naming

If you still use legacy naming, migrate to:

- Package: `@signaler/cli`
- Command: `signaler`
- Config file: `signaler.config.json`
- Output directory: `.signaler/`

## 2) Install Current CLI

```bash
npx jsr add @signaler/cli
```

Or run without permanent installation:

```bash
npx jsr run @signaler/cli run
```

## 3) Rename Legacy Config (if needed)

If your repo still uses `apex.config.json`, rename it to `signaler.config.json` and verify fields against [configuration reference](/docs/signaler/configuration).

## 4) Rebuild Discovery/Config (recommended)

```bash
signaler discover --scope full
```

Compatibility alias remains available:

```bash
signaler wizard
```

This is the safest migration path when old configs include deprecated fields.

## 5) Validate CLI Behavior in CI

Use:

```bash
signaler run --ci --fail-on-budget --no-color
```

And ensure your budgets are defined in `signaler.config.json`.

## 6) API Consumers

Use `@signaler/cli/api` and create an instance with `createSignalerAPI()`.
Do not assume CLI config shape equals programmatic API config shape. See [API reference](/docs/signaler/api-reference).

## 7) Common Breaking/Confusing Areas

- Historical docs may mention `@kiro/signaler`; use `@signaler/cli`.
- Historical docs may mention removed commands (`budget`, `monitor`, `dashboard`, `migrate`, `validate`); use current CLI help (`signaler help`).
- The CLI is Node.js 18+.

## 8) Alias Deprecation Timeline

Legacy aliases remain supported in V3.x but are tracked by an explicit timeline:

- `init` -> `discover`
- `audit` -> `run`
- `review` -> `report`

See the policy matrix:

- [V3 Deprecation Matrix](/docs/signaler/v3-deprecation-matrix)

## Quick Checklist

- [ ] Installed `@signaler/cli`
- [ ] Using `signaler` command
- [ ] Using `signaler.config.json`
- [ ] Verified discovery/config with `signaler discover --scope full` (or `signaler wizard`) and manual review
- [ ] Updated CI command to `signaler run --ci --fail-on-budget`
- [ ] Updated links/bookmarks to `https://github.com/Dendro-X0/signaler/issues`
