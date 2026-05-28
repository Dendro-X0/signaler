# Release Notes - v5.0.0

**Package:** `@signaler/cli@5.0.0` (JSR + GitHub Release)

## Summary

Signaler 5.0.0 is the **quality profiles** release: one command bundles Lighthouse policy gates with headers, links, and bundle checks, producing a unified pack artifact and a single CI exit code.

## Added

- **`--quality-profile web-quality`** on `audit` and `job run` — extends `ci-strict` with `headers`, `links`, and `bundle` steps; writes `quality-pack.json`.
- **`--quality-profile pr-quality`** — `pr-quick` (changed-only Lighthouse) plus the same side runners and pack gate.
- **`qualityPack` config** — `maxHeaderFailures`, `maxBrokenLinks` thresholds for the pack gate.
- **Agent-index pack pointers** — `qualityPack` summary and side-runner entrypoints on `agent-index.json` after pack evaluation.
- **GitHub Action `quality-profile` input** — run `web-quality` from CI; job summary surfaces pack failures.

## Not in this release

- Optional bundle **byte budgets** in `qualityPack` (planned for a follow-up).

## Upgrade from 4.3

- No breaking CLI renames. Existing `audit`, `run-profile`, and `qualityGate` flows are unchanged.
- To adopt the v5 bundle, add `--quality-profile web-quality` (CLI) or `quality-profile: web-quality` (Action) instead of wiring headers/links/bundle manually.
- Strict header checks may fail typical Next.js apps until you add security headers (middleware or `next.config`); tune `qualityPack` or disable side runners if you need a phased rollout.

## Quick start

```bash
signaler audit --quality-profile web-quality --cwd /path/to/app --base-url http://127.0.0.1:3000
signaler query --view agent --dir .signaler
```

```yaml
- uses: ./.github/actions/signaler
  with:
    cli-version: "5.0.0"
    quality-profile: web-quality
    base-url: http://127.0.0.1:3000
```

PR changed-files + pack:

```bash
signaler job run --quality-profile pr-quality --managed-serve --in-process --cwd .
```

## Docs

- [GitHub Actions guide](../../guides/github-actions.md)
- [Configuration reference](../../reference/configuration.md) — `qualityPack`
- [Phase 4 roadmap](../../roadmap/phase4-v5.0-quality-profiles.md)
