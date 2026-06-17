# Demo assets

## Current set (used by README + website)

These four GIFs are the canonical demo set:

| File | What it shows |
|------|---------------|
| `init.gif` | `signaler discover` initialization |
| `audit.gif` | `signaler audit` end-to-end run |
| `artifacts.gif` | `.signaler/` tree layout + entrypoints |
| `analytics_dashboard.gif` | `developer/report.html` KPI + triage dashboard |

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
2. Update `README.md` Demos section
3. Update `site/src/components/landing/demo-section.tsx` tab labels and sources

## Static fallbacks

If GIF size is a concern, use PNG screenshots of `developer/report.html`, `agent/fix-queue.json`, and `agent/coverage.json` in this folder instead.
