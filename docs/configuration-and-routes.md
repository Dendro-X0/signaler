# Configuration and Route Detection

This document describes the `apex.config.json` format and how ApexAuditor discovers routes for popular frameworks.

---

## 1. ApexConfig shape

TypeScript view of the config:

```ts
export type ApexDevice = "mobile" | "desktop";

export interface ApexPageConfig {
  readonly path: string;
  readonly label: string;
  readonly devices: readonly ApexDevice[];
}

export interface CategoryBudgetThresholds {
  readonly performance?: number;
  readonly accessibility?: number;
  readonly bestPractices?: number;
  readonly seo?: number;
}

export interface MetricBudgetThresholds {
  readonly lcpMs?: number;
  readonly fcpMs?: number;
  readonly tbtMs?: number;
  readonly cls?: number;
}

export interface ApexBudgets {
  readonly categories?: CategoryBudgetThresholds;
  readonly metrics?: MetricBudgetThresholds;
}

export interface ApexConfig {
  readonly baseUrl: string;
  readonly query?: string;
  readonly chromePort?: number;
  readonly runs?: number;
  readonly logLevel?: "silent" | "error" | "info" | "verbose";
  readonly pages: readonly ApexPageConfig[];
  readonly budgets?: ApexBudgets;
}
```

### Required fields

- **`baseUrl`**
  - Full origin where your app is available, without a trailing slash.
  - Example: `"http://localhost:3000"`.
- **`pages`**
  - Non-empty array of `ApexPageConfig` entries.
  - Each page must have a `path` that starts with `/`.

### Optional fields

- **`query`**
  - Query string appended to every audited URL.
  - Use this to disable analytics or enable debug modes; example: `"?lhci=1"`.
- **`chromePort`**
  - Advanced: attach to an existing Chrome instance instead of launching a headless one.
  - When omitted, ApexAuditor launches its own headless Chrome via `chrome-launcher`.
- **`runs`**
  - Number of Lighthouse runs per `page × device`.
  - Must be a positive integer; defaults to `1`.
- **`logLevel`**
  - Lighthouse log level; one of `"silent" | "error" | "info" | "verbose"`.
  - Can be overridden at runtime with `--log-level` on the CLI.
- **`budgets`**
  - Optional thresholds for CI gating; see `cli-and-ci.md`.

### Page configuration

Each `ApexPageConfig` describes a URL path and devices to audit:

```jsonc
{
  "path": "/blog",
  "label": "blog",
  "devices": ["mobile", "desktop"]
}
```

Rules:

- `path` must start with `/`.
- `label` is used in reports. If omitted, it falls back to the `path`.
- `devices` can contain `"mobile"`, `"desktop"`, or both.
  - If omitted, it defaults to `["mobile"]`.

---

## 2. Budgets (for CI)

Budgets let you define **minimum acceptable scores** and **maximum acceptable metric values**.

Example:

```jsonc
{
  "baseUrl": "http://localhost:3000",
  "pages": [
    { "path": "/", "label": "home", "devices": ["mobile", "desktop"] }
  ],
  "budgets": {
    "categories": {
      "performance": 90,
      "accessibility": 95
    },
    "metrics": {
      "lcpMs": 2500,
      "cls": 0.1
    }
  }
}
```

Rules:

- Category budgets (`performance`, `accessibility`, `bestPractices`, `seo`)
  - Values must be numbers between 0 and 100.
  - A violation occurs when the actual score is **less than** the threshold.
- Metric budgets (`lcpMs`, `fcpMs`, `tbtMs`, `cls`)
  - Values must be non-negative numbers.
  - A violation occurs when the actual value is **greater than** the threshold.

When you run:

```bash
npx apex-auditor audit --ci
```

ApexAuditor:

- Evaluates all configured budgets against the aggregated results.
- Prints a summary of any violations.
- Sets a non-zero exit code if there are violations (to fail CI jobs).

See `cli-and-ci.md` for end-to-end CI examples.

---

## 3. Route detection overview

ApexAuditor includes pluggable detectors to reduce the amount of manual configuration you need. These detectors are used by the **wizard** and **quickstart** flows.

### Supported frameworks

- **Next.js App Router**
  - Looks for `app/` and `src/app/` directories.
  - In monorepos, also scans `apps/*/app` and `packages/*/app`.
  - Treats `**/page.{tsx,ts,jsx,js}` as route entries.
- **Next.js Pages Router**
  - Looks for `pages/` and `src/pages/` directories, including under `apps/*` and `packages/*`.
  - Ignores `api/` routes and files starting with `_`.
- **Remix**
  - Looks for `app/routes` and parses route filenames into URL patterns.
- **SPA / static HTML**
  - Searches for `index.html` in common build folders such as `dist/`, `build/`, and `public/`.
  - Extracts internal routes from `href="/..."` and `data-route="/..."` attributes.

The detectors always respect an upper limit on the number of routes returned to keep quickstart fast.

### Monorepos and discovery

For complex workspaces, the wizard can:

- Start from a repo root that you provide.
- Use a breadth-first search to find candidate Next.js projects by
  - presence of `next.config.*`, or
  - `package.json` dependencies including `next`.
- Prompt you to choose which Next.js app to use when multiple are found.

Once a project root is chosen, the relevant detector is run under that folder.

### Editing detected routes

Detected routes are **suggestions** only:

- In the wizard, you choose which ones to keep via a multi-select prompt.
- After generation, you can freely edit `apex.config.json` to add, modify, or remove pages.

Quickstart does not prompt; it simply uses the top detected routes (or falls back to `/`). If you like the result, you can copy `.apex-auditor/quickstart.config.json` into a permanent `apex.config.json`.
