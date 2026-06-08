# Demo assets

## Current status

The three GIFs linked from `README.md` and the marketing site were recorded on **v2.6.4** UI and flat artifact layout. They remain for continuity but **do not reflect v5**:

- `init_and_audit.gif` — shows legacy init/wizard flow
- `file_tree_report.gif` — flat root dump, not tree `INDEX.md`
- `HTML_report.gif` — still valid conceptually (`developer/report.html`)

## v5 replacement storyboard

Record on a small Next.js demo app (e.g. blogkit) at **1280×720**, 15–20 fps, &lt;5 MB per GIF.

### 1. `audit-quality-profile.gif` (replaces `init_and_audit.gif`)

**Script:**

```bash
signaler clean --yes --project-root .
signaler audit --scope quick --quality-profile web-quality \
  --cwd . --base-url http://127.0.0.1:3000 --yes
```

**Show:** managed serve starting, job steps through side runners, exit code summary.  
**End frame:** `.signaler/INDEX.md` in editor.

### 2. `agent-query-loop.gif` (new — optional fourth tab on site)

**Script:**

```bash
signaler query --view perf --dir .signaler --json | head
signaler explain --id <top-issue-id> --dir .signaler
```

**Show:** perf triage output, explain evidence pointers — no raw `results.json`.

### 3. `tree-artifacts-and-report.gif` (replaces `file_tree_report.gif`)

**Show:** `.signaler/` tree (`agent/`, `runners/`, `gates/`, `runs/`), then `developer/report.html` in browser.

### 4. `quality-pack-gate.gif` (replaces or supplements `HTML_report.gif`)

**Show:** `gates/quality-pack.json` + one `developer/reports/*.report.md` (e.g. links or headers).

## After recording

1. Optimize with `gifsicle -O3` or convert to WebM for the docs site.
2. Update `README.md` Demos section captions.
3. Update `site/src/components/landing/demo-section.tsx` tab labels and sources.
4. Remove the “recorded on older CLI” disclaimer once all three are replaced.

## Static fallbacks

If GIF size is a concern, use PNG screenshots of `INDEX.md`, `report.html`, and `quality-pack.json` in this folder instead.
