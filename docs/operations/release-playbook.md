# Push and Release Playbook

Use this playbook to push and publish release candidates and GA builds with deterministic evidence.

Recommended placeholder:

- `<version>` (for example `3.1.2-rc.1` or `3.1.2`)

## 1) Preflight (Local)

From the `signaler` repository root:

```bash
corepack pnpm install
corepack pnpm run build
corepack pnpm run bench:workstream-j:overhead
corepack pnpm run bench:v63:gate
corepack pnpm run release -- --target-version <version>
```

What this does:

1. Runs release gate checks (v3 contract, phase6, and success-gate evaluators).
2. Validates required docs and release manifest assets.
3. Writes machine-readable output to `release/v3/release-preflight.json`.

Optional strict CI-equivalent check:

```bash
corepack pnpm run release -- --target-version <version> --require-cross-platform --strict
```

## 2) Local Workspace Smoke (Unpublished Build)

If testing against another local project before publishing:

```bash
# Example from a sibling test app folder (next-blogkit-pro)
node ../signaler/dist/bin.js --version
node ../signaler/dist/bin.js help agent --json
node ../signaler/dist/bin.js discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
node ../signaler/dist/bin.js run --contract v3 --mode throughput --yes --no-color
node ../signaler/dist/bin.js analyze --contract v6 --json
node ../signaler/dist/bin.js verify --contract v6 --runtime-budget-ms 90000 --dry-run --json
node ../signaler/dist/bin.js report
```

## 3) Push Sequence

1. Ensure `package.json` and `jsr.json` versions are synchronized.
2. Commit release-ready changes:

```bash
git add .
git commit -m "release: prepare <version>"
```

3. Push branch and open/update PR:

```bash
git push origin <branch>
```

4. Wait for CI to complete (including cross-platform smoke matrix and Phase 6 gate artifact upload).

## 4) Tag and Publish

After CI is green and checklist is complete:

```bash
git tag v<version>
git push origin v<version>
```

Then publish from local repo root:

```bash
npx jsr publish --allow-slow-types
```

## 5) Post-Publish Validation

1. Confirm package visibility:
   - `https://jsr.io/@signaler/cli`
2. Run clean install smoke in a sample project:

```bash
npx jsr add @signaler/cli
npx jsr run @signaler/cli --version
```

3. Update:
   - `CHANGELOG.md`
   - `docs/operations/launch-checklist.md` (mark cross-platform matrix done when CI confirms)
   - release notes draft to final versioned note

## 6) Rollback Rules

1. Never republish an existing version number.
2. If post-publish issues are found, publish a new patch/rc (`3.1.2-rc.2` or `3.1.3`) with the same preflight steps.

