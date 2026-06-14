# Demo assets

## Current status

The three GIFs linked from `README.md` and the marketing site were recorded on **v2.6.4** UI and flat artifact layout. They remain for continuity but **do not reflect v5.1.6**:

| File | Issue |
|------|-------|
| `init_and_audit.gif` | Legacy init/wizard flow |
| `file_tree_report.gif` | Flat root dump, not tree `INDEX.md` |
| `HTML_report.gif` | Concept still valid (`developer/report.html`) |

## v5.1.6 replacement (primary guide)

**Use:** [gif-demo-script.md](../guides/gif-demo-script.md)

Suggested output filenames (save here after recording):

| GIF | Filename | Replaces |
|-----|----------|----------|
| Monorepo audit (~1m 45s) | `audit-monorepo-5.1.6.gif` | `init_and_audit.gif` |
| Dashboard triage KPIs | `dashboard-triage-5.1.6.gif` | `HTML_report.gif` |
| Fix queue + explain | `agent-fix-queue-5.1.6.gif` | (new) |
| Coverage honesty | `coverage-honesty-5.1.6.gif` | `file_tree_report.gif` |

Settings: **1280×720**, 12–15 fps, &lt;8 MB per GIF after `gifsicle -O3`.

## Optional: quality-profile clip

For CI-oriented demos (side runners + quality pack):

```bash
signaler audit --scope quick --quality-profile web-quality \
  --cwd . --base-url http://127.0.0.1:3000 --yes
```

Show `gates/quality-pack.json` + one `developer/reports/*.report.md`.

## After recording

1. Optimize with `gifsicle -O3 --lossy=30`
2. Update `README.md` Demos section with new GIFs and captions from the script
3. Update `site/src/components/landing/demo-section.tsx` tab labels and sources
4. Remove the “recorded on older CLI” disclaimer once all clips are replaced

## Static fallbacks

If GIF size is a concern, use PNG screenshots of `developer/report.html`, `agent/fix-queue.json`, and `agent/coverage.json` in this folder instead.
