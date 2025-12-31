# ApexAuditor

ApexAuditor is a small, framework-agnostic Lighthouse runner that gives you **fast, structured insights** across multiple pages and devices.

It focuses on:

- **Multi-page, multi-device audits**: run Lighthouse across your key flows in one shot.
- **Framework flexibility**: works with any stack that serves HTTP (Next.js, Remix, Vite/React, SvelteKit, Rails, static sites, etc.).
- **Smart route discovery**: auto-detects routes for Next.js (App/Pages), Remix, SvelteKit, and can crawl generic SPAs.
- **Developer-friendly reports**: readable console output, Markdown tables, HTML reports, and JSON summaries for CI.
- **Configurable throttling**: tune CPU/network throttling for accuracy vs speed trade-offs.
- **Parallel execution**: speed up batch testing with multiple Chrome instances.

---

## Example output

Terminal summary:

![Example terminal output 1](./public/example_output_1.png)

![Example terminal output 2](./public/example_output_2.png)

Wizard route selection:

![Wizard screenshot](./public/wizard_1.png)

---

## Installation

Install as a dev dependency (recommended):

```bash
pnpm add -D apex-auditor
# or
npm install --save-dev apex-auditor
```

You can also run it without installing by using your package manager's "dlx"/"npx" style command, for example:

```bash
pnpm dlx apex-auditor@latest wizard
```

---

## Common commands

All commands are available as a CLI named `apex-auditor` once installed.

### Quickstart (auto-detect routes and run a one-off audit)

```bash
apex-auditor quickstart --base-url http://localhost:3000
```

### Wizard (interactive config with route auto-detection)

```bash
apex-auditor wizard
# or
apex-auditor guide   # same as wizard, with inline tips for new users
```

The wizard can detect routes for:

- Next.js (App Router / Pages Router)
- Remix
- SvelteKit
- Single Page Apps (Vite/CRA/etc., via HTML crawl)

### Audit (run using an existing config)

```bash
apex-auditor audit --config apex.config.json
```

Tip:

- For best accuracy and stable throughput, run audits against a production server (e.g., Next.js: `next build && next start`) instead of `next dev`.

**CLI flags:**

| Flag | Description |
|------|-------------|
| `--ci` | Enable CI mode with budgets and non-zero exit codes |
| `--no-color` / `--color` | Control ANSI colours in console output |
| `--log-level <level>` | Override Lighthouse log level (`silent`, `error`, `info`, `verbose`) |
| `--throttling <method>` | Throttling method: `simulate` (fast) or `devtools` (accurate) |
| `--cpu-slowdown <n>` | CPU slowdown multiplier (1-20, default: 4) |
| `--parallel <n>` | Number of pages to audit in parallel (1-10) |
| `--audit-timeout-ms <ms>` | Per-audit timeout in milliseconds (prevents hung runs from stalling) |
| `--max-steps <n>` | Safety limit: refuse/prompt if planned Lighthouse runs exceed this (default 120) |
| `--max-combos <n>` | Safety limit: refuse/prompt if planned page/device combos exceed this (default 60) |
| `--yes`, `-y` | Auto-confirm large runs (bypass safety prompt) |
| `--warm-up` | Perform warm-up requests before auditing |
| `--open` | Auto-open HTML report in browser after audit |
| `--json` | Output JSON to stdout (for piping) |
| `--show-parallel` | Print the resolved parallel worker count before running |
| `--fast` | Quick preset: simulate throttling, runs=1, performance-only |
| `--quick` | Preset: runs=1 (fast feedback) without changing throttling defaults |
| `--accurate` | Preset: devtools throttling + warm-up, stability-first (parallel=1 unless overridden) |
| `--incremental` | Reuse cached results for unchanged combos (requires `--build-id`). Opt-in; off by default. |
| `--build-id <id>` | Build identifier used as the cache boundary for `--incremental` |
| `--overview` | Preset: quick overview (runs=1) and samples a small set of combos unless `--yes`. |
| `--overview-combos <n>` | Overview sampling size (default 10). |
| `--mobile-only` | Only audit mobile device configurations |
| `--desktop-only` | Only audit desktop device configurations |
| `--parallel <n>` | Override parallel workers (default auto) |
| `--stable` | Flake-resistant: forces serial runs (parallel=1) |

---

## Output files

After each audit, results are saved to `.apex-auditor/`:

- `summary.json` – structured JSON results
- `summary.md` – Markdown table plus a structured meta section (parallel, timings, throttling)
- `report.html` – visual HTML report with score circles, metrics, and a meta grid (resolved parallel, elapsed, avg/step)
- The CLI prints the file path and `file://` URL to the HTML report after every run.

Defaults:
- Parallel auto-tunes based on CPU/memory (up to 4 by default). Override with `--parallel` or see with `--show-parallel`.
- Throttling method: `simulate`, CPU slowdown: `4`, runs per combo: `1`.
- Help topics: `apex-auditor help topics`, `apex-auditor help budgets`, `apex-auditor help configs`, `apex-auditor help ci`.
- Warm-up (`--warm-up` / `warmUp: true`) makes bounded-concurrency requests to each configured page to reduce cold-start/cache noise.
- Incremental (`--incremental --build-id <id>`) reuses `.apex-auditor/cache.json` to skip unchanged audits between runs. This is best for CI/baseline comparisons, and is intentionally opt-in (off by default) to keep local iteration predictable.

---

## Configuration

Example `apex.config.json`:

```json
{
  "baseUrl": "http://localhost:3000",
  "runs": 3,
  "throttlingMethod": "devtools",
  "cpuSlowdownMultiplier": 4,
  "parallel": 2,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "home", "devices": ["mobile", "desktop"] },
    { "path": "/docs", "label": "docs", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": { "performance": 80, "accessibility": 90 },
    "metrics": { "lcpMs": 2500, "inpMs": 200 }
  }
}
```

---

## Metrics tracked

- **LCP** (Largest Contentful Paint)
- **FCP** (First Contentful Paint)
- **TBT** (Total Blocking Time)
- **CLS** (Cumulative Layout Shift)
- **INP** (Interaction to Next Paint) - Core Web Vital

---

## Further documentation

For detailed guides, configuration options, and CI examples, see the `docs/` directory:

- `docs/getting-started.md` – installation, quickstart, wizard, and audit flows.
- `docs/configuration-and-routes.md` – `apex.config.json` schema and route detection details.
- `docs/cli-and-ci.md` – CLI flags, CI mode, budgets, and example workflows.

---

## License

MIT
