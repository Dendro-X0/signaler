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
npx jsr run @signaler/cli audit
```

## 3) Rename Legacy Config (if needed)

If your repo still uses `apex.config.json`, rename it to `signaler.config.json` and verify fields against [configuration-and-routes.md](configuration-and-routes.md).

## 4) Rebuild Config via Wizard (recommended)

```bash
signaler wizard
```

This is the safest migration path when old configs include deprecated fields.

## 5) Validate CLI Behavior in CI

Use:

```bash
signaler audit --ci --fail-on-budget --no-color
```

And ensure your budgets are defined in `signaler.config.json`.

## 6) API Consumers

Use `@signaler/cli/api` and create an instance with `createSignalerAPI()`.
Do not assume CLI config shape equals programmatic API config shape. See [api-reference.md](api-reference.md).

## 7) Common Breaking/Confusing Areas

- Historical docs may mention `@kiro/signaler`; use `@signaler/cli`.
- Historical docs may mention removed commands (`budget`, `monitor`, `dashboard`, `migrate`, `validate`); use current CLI help (`signaler help`).
- The CLI is Node.js 18+.

## Quick Checklist

- [ ] Installed `@signaler/cli`
- [ ] Using `signaler` command
- [ ] Using `signaler.config.json`
- [ ] Verified config with `signaler wizard` or manual review
- [ ] Updated CI command to `signaler audit --ci --fail-on-budget`
- [ ] Updated links/bookmarks to `https://github.com/Dendro-X0/signaler/issues`
