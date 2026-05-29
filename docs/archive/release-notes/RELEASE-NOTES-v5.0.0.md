# Release Notes - v5.0.0

**Date:** 2026-05-29  
**Package:** `@signaler/cli@5.0.0` (JSR + GitHub Release)

## Summary

Signaler 5.0.0 is the **quality profiles** release: one command runs Lighthouse policy gates plus **headers**, **links**, **health**, **console**, **measure**, **accessibility**, and **bundle**, producing a unified pack artifact (`gates/quality-pack.json`) and a single CI exit code. Works with the v4.5 **tree artifact layout** by default.

## Added

- **`--quality-profile web-quality`** on `audit` and `job run` — `discover` → `run` (ci-strict) → `analyze` → side runners → quality pack gate.
- **`--quality-profile pr-quality`** — changed-only Lighthouse (`pr-quick`) plus the same side runners and pack.
- **`signaler accessibility`** — standalone axe-core audit CLI.
- **`qualityPack` config** — thresholds for headers, links, health, console, measure, accessibility, and bundle failures.
- **Agent-index pack pointers** — pack summary and side-runner entrypoints after evaluation.
- **GitHub Action `quality-profile` input** — run `web-quality` from CI; job summary surfaces pack failures.

## Changed

- Quality-profile jobs **continue side runners** when analyze fails after a successful run (exit code 2).
- **`analyze`** prefers fresh flat artifacts over stale tree copies when both exist (tree layout reruns).

## Upgrade from 4.5

- No breaking CLI renames. Default artifact layout remains **tree**.
- Add `--quality-profile web-quality` (CLI) or `quality-profile: web-quality` (Action) instead of wiring side runners manually.
- Strict pack gates may fail typical apps until you fix links, console errors, or tune `qualityPack` for phased rollout.

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

## Install (JSR)

```bash
npx jsr add @signaler/cli@5.0.0
```

## Docs

- [GitHub Actions guide](../../guides/github-actions.md)
- [Configuration reference](../../reference/configuration.md) — `qualityPack`
- [Phase 4 roadmap](../../roadmap/phase4-v5.0-quality-profiles.md)
