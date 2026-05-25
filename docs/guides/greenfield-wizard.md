# Greenfield wizard (first project setup)

Use this flow when a repository has no `signaler.config.json` yet.

## Interactive shell

```bash
cd your-next-app
signaler
```

Then:

1. **`discover`** (or **`init`**) — wizard detects routes, writes `signaler.config.json` and `.signaler/discovery.json`.
2. Accept **Run first audit now?** — Signaler runs **`audit`** with managed serve:
   - **`auto`** mode (default): starts **`pnpm dev`** (or equivalent) when nothing is listening on the configured URL.
   - Falls back to **production** `build` + `start` when no `dev` script exists.
3. **`report`** or **`open`** — review `report.html` and `.signaler/agent-index.json`.

## One-shot CLI (no shell)

```bash
signaler discover --yes
signaler audit --managed-serve --managed-serve-mode auto --yes
```

## Performance scores

Throughput runs label performance as **P(ref)** — a Signaler lab reference score, not a 1:1 Chrome DevTools score. See `performanceScoreSemantics` in `agent-index.json` and the trust banner in `report.html`.

For DevTools-like validation after fixes:

```bash
signaler run --mode fidelity --config signaler.config.json --yes
```

## Managed serve modes

| Mode | Behavior |
|------|----------|
| `auto` | Prefer `dev` script; else production build + start |
| `dev` | `pnpm run dev` (faster, typical local workflow) |
| `production` | `build` + `start` (stable Lighthouse-style target) |

Environment: `SIGNALER_MANAGED_SERVE_MODE=dev|production|auto`

## Troubleshooting

- **ECONNREFUSED** — managed serve did not start in time; run `pnpm dev` manually or retry with `--managed-serve-mode dev`.
- **Production build fails** — use `--managed-serve-mode dev` or fix the Next.js build, then `--managed-serve-skip-build` for production mode.
