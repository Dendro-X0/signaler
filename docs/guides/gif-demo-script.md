# GIF Demo Script (v5.1.6)

Record on your **real dev workspace** — no staging required. Technical audiences trust terminal + browser captures from a monorepo more than a narrated promo.

**Demo app (recommended):** `next-ecommercekit-monorepo-main` — 45 routes, 90 combos, pnpm + turbo.  
**Signaler:** pin **v5.1.6** (Release install or local `pnpm run build`).

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
# Signaler CLI (Release install or built repo)
export SIGNALER="signaler"
# Or built checkout:
# export SIGNALER="node E:/Web Projects/experimental-workspace/apex-auditor-workspace/signaler/dist/cli-entry.js"

export APP="E:/Web Projects/starterkit/next-ecommercekit-workspace/next-ecommercekit-monorepo-main"
export ART="$APP/.signaler"
```

Windows Git Bash: use forward slashes as above. PowerShell: `$env:APP = "E:\Web Projects\..."`.

---

## GIF 1 — Full monorepo audit (~45s)

**Caption (README / tweet):**  
*One command: 45 routes × 2 devices on a pnpm monorepo. ~90 combos in under 2 minutes.*

**Terminal only.** Start recording, then:

```bash
cd "$APP"
"$SIGNALER" audit --cwd . --base-url http://127.0.0.1:3000 --skip-discover --yes --parallel 6
```

**Hold these frames:**

1. `Managed serve: starting production server` + warm-up line  
2. `Route preflight: skipping N path(s)` — shows honest coverage  
3. `Audit plan: 90 combos … parallel 6`  
4. Progress bar crossing ~50%  
5. Final summary: `Completed in 1m …` + red issue totals + `Analyze complete`

**Do not** speed up the completion line — the wall clock is the proof.

---

## GIF 2 — Developer dashboard (~30s)

**Caption:**  
*Issue-count triage, median LCP, and category scores — not vanity P(ref) alone.*

**Browser:** open before recording:

```
file:///E:/Web Projects/starterkit/next-ecommercekit-workspace/next-ecommercekit-monorepo-main/.signaler/developer/report.html
```

Or:

```bash
"$SIGNALER" open --dir "$ART"
```

**Scroll slowly:**

1. **KPI strip** — median LCP, red/yellow counts, A/BP/SEO medians  
2. **Trust banner** — lab semantics + fidelity command + Copy button  
3. **Route cards** — one high-red route (e.g. `/dashboard/admin`) and one clean route (e.g. `/auth/login`)  
4. Click **Fix queue (JSON)** or **Coverage (JSON)** tab link (optional)

---

## GIF 3 — Agent fix queue (~25s)

**Caption:**  
*Ranked fixes with path, device, URL, and JSON pointers — ready for agents.*

**Split or sequential terminal:**

```bash
"$SIGNALER" query --view fix-queue --dir "$ART" --json | head -80
```

Then:

```bash
"$SIGNALER" explain --id action-triage-redirects --dir "$ART" --json | head -60
```

**Highlight:**

- `"view": "fix-queue"` and `"items": 12`  
- Top item: `Avoid multiple page redirects` with `targets[]` paths  
- `explain` output: `"kind": "fix-queue-item"` with `pointer` into triage

---

## GIF 4 — Coverage honesty (~20s)

**Caption:**  
*50 auth-wall skips reported upfront — we don't fake Lighthouse on login pages.*

```bash
"$SIGNALER" query --view coverage --dir "$ART" --json | head -50
```

**Highlight:**

- `"combos": 90`, `"scored": 40`, `"skippedAuth": 50`, `"runnerErrors": 0`  
- `"guidance"."authWall"` string  
- One entry under `skippedByReason.authWall` with `path` + `url`

---

## Optional GIF 5 — Incremental skip (after a fix)

**Caption:**  
*Re-audit skips combos that already pass — fix loop without re-running everything.*

Only record after you land one real fix (even a tiny one):

```bash
"$SIGNALER" audit --cwd "$APP" --base-url http://127.0.0.1:3000 --incremental-skip --skip-discover --yes
"$SIGNALER" query --view delta --dir "$ART" --json | head -40
```

---

## Post-production checklist

1. Optimize: `gifsicle -O3 --lossy=30 -o out.gif raw.gif`
2. Save to `docs/assets/` with v5 names:
   - `audit-monorepo-5.1.6.gif`
   - `dashboard-triage-5.1.6.gif`
   - `agent-fix-queue-5.1.6.gif`
   - `coverage-honesty-5.1.6.gif`
3. Update `README.md` Demos section with captions above.
4. Pin install command: `SIGNALER_VERSION=5.1.6` in tweet/thread.

## Launch thread outline (text-only)

1. **Problem** — route-scale audits produce huge artifact dumps; agents drown in JSON.  
2. **Demo GIF 1** — speed on a real monorepo.  
3. **Demo GIF 2** — dashboard + triage semantics.  
4. **Demo GIF 3+4** — fix-queue + coverage (surgical agent output).  
5. **Install** — GitHub Release one-liner, link to [known limits](./known-limits.md).  
6. **Honest limits** — auth routes, P(ref) ≠ DevTools, first install time.

## Troubleshooting recordings

| Issue | Fix |
|-------|-----|
| `Missing fix-queue.json` | Use full `$ART` path, not `.../.signaler` |
| Audit fails ECONNREFUSED | Ensure no other server on `:3000`; use `127.0.0.1` not `localhost` |
| All routes skip:auth | Expected without auth config — good for GIF 4 |
| Stale CLI | `$SIGNALER --version` must show **5.1.6** |

## Blogkit alternative (faster, fewer routes)

For a shorter GIF when time is tight:

```bash
export APP="E:/Web Projects/starterkit/next-blogkit-workspace/next-blogkit-pro"
"$SIGNALER" audit --cwd "$APP" --base-url http://127.0.0.1:3000 --scope quick --yes
```

Use the same GIF 2–4 flow with `$APP/.signaler`.
