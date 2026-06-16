# Configuration

This document describes the `signaler.config.json` format.

## 1. ApexConfig shape

Key points:

- `pages` defines which routes to check and which devices to run against.
- **Runs-per-combo is always 1**. Re-run the same command to compare results.
- Budgets are optional and are used for CI gating.

Minimal example:

```json
{
  "baseUrl": "http://localhost:3000",
  "pages": [
    { "path": "/", "label": "home", "devices": ["mobile", "desktop"] }
  ]
}
```

Common fields:

- `baseUrl`
- `query` (optional query string appended to every URL)
- `throttlingMethod` (`simulate` or `devtools`)
- `cpuSlowdownMultiplier` (default 4)
- `parallel` (optional; default **6** on most machines when omitted; CLI may cap lower on low-memory hosts)
- `sessionIsolation` (optional; `shared` or `per-audit`)
- `throughputBackoff` (optional; `auto`, `aggressive`, or `off`)
- `warmUp` (optional)
- `perfIncludeYellow` (optional, default `false` on lean profile) — include yellow performance issues in triage and TUI. `false` = red-only (recommended for production optimization rounds).
- `routePreflight` (optional, default true)
- `auditTimeoutMs` (optional per-audit timeout)
- `incremental` + `buildId` (optional cache reuse)
- `gitIgnoreSignalerDir` (optional; when true, Signaler appends `.signaler/` to `.gitignore` if a `.gitignore` exists)
- `budgets` (optional)

## Route auto-detection notes

When the init wizard auto-detects routes, Signaler filters out unresolved dynamic route patterns to avoid inaccurate audits.

Examples that are excluded:

- Next.js/Remix-style: `[slug]`, `[...catchall]`
- Express-style: `:id`
- Wildcards: `*`

## 2. Pages

Each page entry:

```json
{ "path": "/pricing", "label": "pricing", "devices": ["mobile", "desktop"] }
```

Optional fields:

- `scope`: `public` (default) or `requires-auth`

- `auth`: optional session cookies for protected routes (preflight + Lighthouse)

```json
{
  "auth": {
    "cookies": "session_token=...",
    "cookieFile": ".signaler/audit.cookies.txt",
    "warmupUrl": "/api/demo-auth?callbackUrl=/admin"
  }
}
```

- `cookies` — raw `Cookie` header value sent on every probe and Lighthouse run.
- `cookieFile` — path relative to config file; one `name=value` per line (`#` comments allowed).
- `warmupUrl` — GET before audit to collect `Set-Cookie` (merged with `cookies` / file).
- `headers` — extra request headers for preflight + Lighthouse (lab bypass secrets, etc.).
- `lab` — when `true` (or with CLI `--lab-auth`), restricts to localhost / `127.0.0.1` and validates `probePath`.
- `probePath` — GET after warmup to confirm session (defaults to first `requires-auth` route).
- `protectedPathPrefixes` — path prefixes for login-HTML heuristics (default: `/dashboard/`, `/admin/`, `/account/`).
- `profiles` — named sessions; pages may set `authProfile` to select one.
- `login` — Playwright form login (`signaler auth login`); writes `cookieFile`.

```json
{
  "auth": {
    "lab": true,
    "warmupUrl": "/api/demo-auth",
    "cookieFile": ".signaler/audit.cookies.txt",
    "protectedPathPrefixes": ["/dashboard/"],
    "profiles": {
      "user": { "warmupUrl": "/api/demo-auth" },
      "admin": { "cookies": "role=admin" }
    },
    "login": {
      "loginUrl": "/login",
      "emailEnv": "SIGNALER_AUTH_EMAIL",
      "passwordEnv": "SIGNALER_AUTH_PASSWORD"
    }
  }
}
```

Per-page profile:

```json
{ "path": "/dashboard/admin", "label": "admin", "devices": ["desktop"], "authProfile": "admin" }
```

CLI:

```bash
signaler auth login --config signaler.config.json --base-url http://127.0.0.1:3000
signaler auth probe --path /dashboard/user/wishlist --config signaler.config.json --lab-auth
signaler audit --lab-auth --cwd . --base-url http://127.0.0.1:3000
signaler run --lab-auth --config signaler.config.json
```

- `serveEnv`: ephemeral env vars injected into Signaler's **managed production `start` process only** (never written to project `.env`). Use this for audit-lab auth bypass flags your app already supports (e.g. `DEMO_AUTH_BYPASS=true`) while still auditing a production build.

```json
{
  "serveEnv": {
    "DEMO_AUTH_BYPASS": "true"
  },
  "auth": {
    "warmupUrl": "/api/demo-auth?callbackUrl=/admin"
  }
}
```

Notes:

- `serveEnv` applies only when `--managed-serve` starts the app (production `build` + `start` by default). It does not affect `pnpm dev` or your committed env files.
- Combine with `auth.warmupUrl` / `cookies` when the bypass still needs a session cookie or demo-auth handshake.
- CLI override (repeatable): `--serve-env DEMO_AUTH_BYPASS=true`
- CI without config edits: `SIGNALER_SERVE_ENV='{"DEMO_AUTH_BYPASS":"true"}'` (merged before config; CLI wins over both)

- Pages marked `requires-auth` are still audited and appear in per-combo outputs, but they are excluded from global suite scoring and aggregated issue counts.

Rules:

- `path` must start with `/`.
- `label` is used in reports.
- `devices` is a list of `mobile` and/or `desktop`.

## 3. Budgets

Budgets gate CI.

Example:

```json
{
  "baseUrl": "http://localhost:3000",
  "pages": [{ "path": "/", "label": "home", "devices": ["mobile"] }],
  "budgets": {
    "categories": { "performance": 90, "accessibility": 95, "bestPractices": 90, "seo": 90 },
    "metrics": { "lcpMs": 2500, "inpMs": 200, "cls": 0.1 }
  }
}
```

Rules:

- Category budgets are minimum scores (0-100).
- Metric budgets are maximum values.

## 3b. Quality gate (v4.3, policy-as-code)

Use `qualityGate` for issue-count performance limits and category floors. Evaluated after each run when the block is present and `enabled` is not `false`, in `--ci` mode, or with `--fail-on-quality-gate`.

```json
{
  "qualityGate": {
    "enabled": true,
    "maxRedPerfIssues": 0,
    "maxUniqueRedIssues": 5,
    "minCategoryScores": {
      "accessibility": 90,
      "bestPractices": 90,
      "seo": 90
    },
    "requireHeadersPass": true
  }
}
```

Writes `.signaler/quality-gate.json`. Pair with `signaler job run --run-profile ci-strict` for a single CI policy bundle.

- `maxRedPerfIssues` — cap on `performance-triage.json` `totals.red` (issue instances).
- `maxUniqueRedIssues` — cap on deduplicated red rows in `uniqueIssues`.
- `minCategoryScores` — minimum **median** suite scores from triage (not Lighthouse performance score).
- `requireHeadersPass` — fails if `headers.json` is missing or any route has missing headers.

## 3c. Baseline compare (v4.3, PR vs main)

Compare the current run to a **baseline artifact directory** (typically main-branch CI output).

```json
{
  "baselineCompare": {
    "enabled": true,
    "baselineDir": ".signaler-main",
    "maxRedIncrease": 0,
    "maxActionableIncrease": 0,
    "requireComparabilityMatch": true,
    "failOnIncomparable": true
  }
}
```

- Evaluated after run in CI when the block is present (or `--fail-on-baseline-compare`).
- Writes `.signaler/baseline-compare.json` with delta + comparability warnings.
- Override path with env `SIGNALER_BASELINE_DIR`.

CLI equivalent:

```bash
signaler query --view delta --dir .signaler --baseline .signaler-main --fail-on-regression
```

See [When deltas lie](../guides/when-deltas-lie.md).

## 3d. Quality pack (v5, `--quality-profile`)

Evaluated after side runners when using `--quality-profile web-quality` or `pr-quality` (headers, links, health, console, measure, accessibility, bundle).

```json
{
  "qualityPack": {
    "maxHeaderFailures": 0,
    "maxBrokenLinks": 0,
    "maxHealthErrors": 0,
    "maxConsoleErrorCombos": 0,
    "maxMeasureRuntimeErrors": 0,
    "maxAccessibilityCriticalViolations": 0,
    "maxAccessibilitySeriousViolations": 0,
    "maxAccessibilityRuntimeErrors": 0
  }
}
```

- Writes `.signaler/quality-pack.json` with pass/fail and counts.
- On failure, includes **onboarding guidance** in CLI output and `quality-pack.json` (`guidance` sections for headers, links, health, console, measure, bundle).
- Merges pack summary into `agent-index.json` (`qualityPack` block + entrypoints).
- Pair with `signaler audit --quality-profile web-quality` for a single CI exit code.

CLI:

```bash
signaler audit --quality-profile web-quality --managed-serve --in-process
signaler job run --quality-profile pr-quality --managed-serve --in-process
```

Do not combine `--quality-profile` with `--preset` or `--run-profile`.

## 4. Warm-up

Set `warmUp: true` to run a lightweight warm-up request pass before Lighthouse audits.

## 5. Incremental caching

Incremental mode reuses cached results for unchanged combos between runs.

- Set `incremental: true`.
- Provide a `buildId` (string).

See `cli.md` for recommended CI usage.

