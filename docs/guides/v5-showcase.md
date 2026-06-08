# v5.0 Showcase — features and usage

Signaler **v5.0** bundles Lighthouse policy gates with side runners in one job. Artifacts use the **tree layout** (v4.5) under `.signaler/`.

## Three workflows (pick one)

| Audience | Command | What you get |
|----------|---------|--------------|
| **Agent / fix loop** | `signaler audit --cwd . --base-url http://127.0.0.1:3000` | discover → run → analyze; lean agent projections |
| **Full web quality (CI)** | `signaler audit --quality-profile web-quality --cwd . --base-url http://127.0.0.1:3000` | Lighthouse + headers, links, health, console, measure, accessibility, bundle → `gates/quality-pack.json` |
| **PR / changed routes** | `signaler job run --quality-profile pr-quality --managed-serve --in-process --cwd .` | Changed-only Lighthouse + same side runners |

Managed serve and in-process steps are **on by default** for `audit` and `job run`. Opt out with `--no-managed-serve` / `--no-in-process`.

## v5 quality profile — job steps

`web-quality` runs, in order:

1. `discover` (full routes)
2. `run` (ci-strict: quality gate + baseline compare flags)
3. `analyze` (v6 lean)
4. `headers` → `links` → `health` → `console` → `measure` → `accessibility` → `bundle`
5. **Quality pack** evaluation → `.signaler/gates/quality-pack.json`

Exit codes: `0` pass, `1` hard fail (discover/run), `2` run OK but analyze partial — side runners still run in v5.

## Read results (developers)

1. Open `.signaler/INDEX.md`
2. Open `developer/report.html` for the visual Lighthouse report
3. Side runners: `developer/reports/*.report.md`
4. CI gate: `gates/quality-pack.json`

## Read results (agents)

Do **not** list the whole `.signaler/` tree. Use projections:

```bash
signaler query --view agent --dir .signaler --json
signaler query --view perf --dir .signaler --json
signaler explain --id <issue-id> --dir .signaler
```

Fallback entrypoints: `.signaler/agent/entrypoints.json`, `.signaler/manifest.json`.

## Quality pack (tune for rollout)

Strict defaults (`maxBrokenLinks: 0`, etc.) may fail real apps at first. Phased rollout in `signaler.config.json`:

```json
{
  "qualityPack": {
    "maxBrokenLinks": 10,
    "maxHealthErrors": 2,
    "maxConsoleErrorCombos": 5,
    "maxMeasureRuntimeErrors": 10
  }
}
```

See [Configuration reference](../reference/configuration.md#qualitypack).

## GitHub Actions

```yaml
- uses: ./.github/actions/signaler
  with:
    cli-version: "5.0.0"
    quality-profile: web-quality
    base-url: http://127.0.0.1:3000
```

[GitHub Actions guide](./github-actions.md)

## What changed since v2.x demos

| v2.6 era | v5 today |
|----------|----------|
| `init` / `wizard` primary | `discover` or `signaler audit` one-shot |
| Flat `.signaler/*.json` dump | Tree: `agent/`, `runners/`, `gates/`, `runs/` |
| Manual headers/links/bundle | `--quality-profile web-quality` orchestrates all |
| Browse all artifacts | `signaler query` / `explain` projections |
| Score-only perf | Issue-count triage (`performance-triage.json`) |

## Demo media (GIF refresh)

Replace legacy GIFs under `docs/assets/` with v5 recordings. Suggested three clips (~30–45s each):

1. **Audit + INDEX** — `signaler audit --scope quick --quality-profile web-quality --cwd <demo-app> --yes` → open `.signaler/INDEX.md` and `developer/report.html`
2. **Agent loop** — `signaler query --view perf` → `signaler explain --id …` → terminal shows ranked actions
3. **Quality pack** — show `gates/quality-pack.json` violations + `developer/reports/links.report.md`

Recording checklist: [docs/assets/README.md](../assets/README.md)
