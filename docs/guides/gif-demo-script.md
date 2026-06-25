# GIF Demo Script (v5.2.0)

Record on your **real dev workspace** — no staging required. Technical audiences trust terminal + browser captures from a monorepo more than a narrated promo.

**Demo app (recommended):** `next-ecommercekit-monorepo-main` — 45 routes, 90 combos, pnpm + turbo.  
**Signaler:** pin **v5.2.0** (GitHub Release install or local `pnpm run build`).

## Canonical output files

Save optimized GIFs to `docs/assets/` (linked from `README.md` and the marketing site):

| Clip | Filename | What to show |
|------|----------|--------------|
| Init | `init.gif` | `signaler discover` / project setup |
| Audit | `audit.gif` | `signaler audit` end-to-end (~90 combos) |
| Artifacts | `artifacts.gif` | `.signaler/` tree layout (`INDEX.md`, agent paths) |
| Dashboard | `analytics_dashboard.gif` | `developer/report.html` KPI + triage |

## Recording settings

| Setting | Value |
|---------|-------|
| Resolution | 1280×720 (or 1920×1080 cropped) |
| FPS | 12–15 (GIF) or record MP4 and convert |
| Terminal font | 14–16px, dark theme matching dashboard |
| Max file size | &lt;8 MB per GIF (`gifsicle -O3 --colors 128`) |

**Tools:** ScreenToGif, LICEcap, or OBS → ffmpeg → gifsicle.

## Paths (edit once)

Set these in your shell before recording — **do not use `...` placeholders**:

```bash
export SIGNALER="signaler"
# Or built checkout:
# export SIGNALER="node E:/Web Projects/experimental-workspace/apex-auditor-workspace/signaler/dist/cli-entry.js"

export APP="E:/Web Projects/starterkit/next-ecommercekit-workspace/next-ecommercekit-monorepo-main"
export ART="$APP/.signaler"
```

Windows Git Bash: use forward slashes as above. PowerShell: `$env:APP = "E:\Web Projects\..."`.

---

## GIF 1 — Init (`init.gif`)

**Caption:**  
*Discover routes and write `signaler.config.json` in one guided step.*

```bash
cd "$APP"
"$SIGNALER" discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
```

**Hold:** route count, saved config path, discovery summary line.

---

## GIF 2 — Full monorepo audit (`audit.gif`)

**Caption:**  
*One command: 45 routes × 2 devices on a pnpm monorepo. ~90 combos in under 3 minutes.*

**Terminal only.** Use lab auth for protected dashboard routes:

```bash
cd "$APP"
"$SIGNALER" audit --lab-auth --cwd . --base-url http://127.0.0.1:3000 --skip-discover --yes --parallel 6
```

**Hold these frames:**

1. `Lab auth: mode=warmup (probe OK)` + managed serve start  
2. `Init: excluded N route(s)` — un-auditable paths filtered at init (v5.1.9+)  
3. `Audit plan: … combos … parallel 6`  
4. Progress crossing ~50%  
5. Final summary + `Analyze complete`

**Do not** speed up the completion line — the wall clock is the proof.

---

## GIF 3 — Artifacts tree (`artifacts.gif`)

**Caption:**  
*Tree layout under `.signaler/` — start at `INDEX.md`, agents use `query` / `explain`.*

Show in editor or terminal:

```bash
"$SIGNALER" query --view agent --dir "$ART"
```

**Highlight:** `agent/fix-queue.json`, `agent/coverage.json`, `developer/report.html`, `runs/lighthouse/`.

---

## GIF 4 — Developer dashboard (`analytics_dashboard.gif`)

**Caption:**  
*Issue-count triage, median LCP, and category scores — not vanity P(ref) alone.*

**Browser:**

```
file:///E:/Web Projects/starterkit/next-ecommercekit-workspace/next-ecommercekit-monorepo-main/.signaler/developer/report.html
```

Or:

```bash
"$SIGNALER" open --dir "$ART"
```

**Scroll slowly:**

1. **KPI strip** — median LCP, red/yellow counts, A/BP/SEO medians  
2. **Trust banner** — lab semantics + fidelity command  
3. **Route cards** — one high-red route and one clean route  

---

## Optional clip — Incremental skip (after a fix)

```bash
"$SIGNALER" audit --lab-auth --cwd "$APP" --base-url http://127.0.0.1:3000 --incremental-skip --skip-discover --yes
"$SIGNALER" query --view delta --dir "$ART" --json | head -40
```

---

## Post-production checklist

1. Optimize: `gifsicle -O3 --lossy=30 -o out.gif raw.gif`
2. Save to `docs/assets/` as `init.gif`, `audit.gif`, `artifacts.gif`, `analytics_dashboard.gif`
3. Update `README.md` Demos section and `site/src/components/landing/demo-section.tsx`
4. Pin install: `SIGNALER_VERSION=5.2.0`

## Troubleshooting recordings

| Issue | Fix |
|-------|-----|
| `Missing fix-queue.json` | Use full `$ART` path; run `analyze` after `run` |
| Audit fails ECONNREFUSED | Kill zombie on `:3000`; use `127.0.0.1` |
| Most routes `skip:auth` | Add `--lab-auth` and `auth.lab` + `serveEnv` in config |
| Stale CLI | `$SIGNALER --version` must show **5.2.0** |
