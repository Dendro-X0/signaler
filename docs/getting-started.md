# Getting Started

ApexAuditor is a small, framework-agnostic Lighthouse runner that gives you **fast, structured insights** across multiple pages and devices.

This guide covers installation and the three primary workflows:

- **Quickstart** – auto-detect routes and run a one-off audit with minimal setup.
- **Wizard** – generate a reusable `apex.config.json` interactively.
- **Manual audit** – run audits from an existing config.

---

## 1. Install and run the CLI

You do not need to add ApexAuditor as a permanent dependency to try it.

From your web project root, use one of the following:

```bash
# Using pnpm (recommended)
pnpm dlx apex-auditor@latest --help

# Using npm
npx apex-auditor@latest --help
```

This runs the published CLI binary `apex-auditor` from npm.

If you prefer to install it as a dev dependency:

```bash
pnpm add -D apex-auditor
# then
npx apex-auditor --help
```

Ensure your application can be reached at a stable URL (for example `http://localhost:3000`).

---

## 2. Quickstart (zero-config audit)

Quickstart is the fastest way to try ApexAuditor on an existing project. It:

- Detects routes from your project structure (Next.js App/Pages, Remix, SPA HTML, monorepos).
- Picks sensible defaults (`runs = 1`, mobile + desktop).
- Writes a temporary config under `.apex-auditor/quickstart.config.json`.
- Delegates to the regular `audit` command.

Run from your project root:

```bash
npx apex-auditor quickstart --base-url http://localhost:3000
```

Options:

- `--base-url <url>` (required)
  - Full URL where your app is reachable.
- `--project-root <path>` (optional)
  - Directory to scan for routes. Defaults to the current directory.

Outputs:

- `.apex-auditor/quickstart.config.json` – generated config for this run.
- `.apex-auditor/summary.json` – structured results.
- `.apex-auditor/summary.md` – Markdown table.
- A colourised table is printed to the terminal.

If no routes can be detected, quickstart falls back to auditing `/` on both mobile and desktop.

---

## 3. Wizard (guided config creation)

Use the wizard when you want a **reusable config file** that you can commit to your repo.

From your project root:

```bash
npx apex-auditor wizard
```

What the wizard does:

1. Asks for **project type** (Next.js App/Pages, Remix, SPA, or custom).
2. Asks for **base URL**, optional query string, and number of Lighthouse runs.
3. Offers to **auto-detect routes**:
   - For Next.js, it can scan under `app/`, `src/app/`, `pages/`, `src/pages/`, and common monorepo layouts (`apps/*`, `packages/*`).
   - For Remix, it inspects `app/routes`.
   - For SPA, it can crawl an `index.html` bundle (for example in `dist/` or `build/`).
4. Lets you **select which detected routes** to include in your config.
5. Lets you add or edit pages manually.
6. Writes the result to `apex.config.json` by default.

You can override the output path:

```bash
npx apex-auditor wizard --config config/apex.blog.json
```

The generated config is a plain JSON file; see `configuration-and-routes.md` for details.

---

## 4. Running audits from a config

Once you have an `apex.config.json` (either from the wizard or created manually), run:

```bash
npx apex-auditor audit
```

By default this reads `apex.config.json` from the current directory. To point to a different file:

```bash
npx apex-auditor audit --config config/apex.blog.json
```

What happens during an audit:

- ApexAuditor performs an HTTP **health check** against the first page to ensure the server is reachable.
- It launches a **dedicated headless Chrome** instance by default and reuses it for all audits.
- For each `page × device`, it runs Lighthouse `runs` times and averages scores/metrics.
- Results are written to `.apex-auditor/summary.json` and `.apex-auditor/summary.md`.
- A compact table is printed to stdout with Lighthouse-style colour coding.

If you prefer to attach to an existing Chrome instance, you can set `chromePort` in your config; see `configuration-and-routes.md`.

---

## 5. Next steps

- Learn the full config shape and route detection behavior in `configuration-and-routes.md`.
- Add performance **budgets** and integrate ApexAuditor into CI using `cli-and-ci.md`.
- Check `ROADMAP.md` for feature status and future plans.
