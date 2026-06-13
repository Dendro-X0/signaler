# Push and Release Playbook

Use this playbook to push and publish release candidates and GA builds with deterministic evidence.

Recommended placeholder:

- `<version>` (for example `3.1.6-rc.1` or `3.1.6`)

## 1) Preflight (Local)

From the `signaler` repository root (`.../apex-auditor-workspace/signaler`):

```bash
corepack pnpm install
corepack pnpm run build
corepack pnpm run bench:workstream-j:overhead
corepack pnpm run bench:workstream-k:rust-benchmark
corepack pnpm run bench:v63:gate
corepack pnpm run release -- --target-version <version>
```

What this does:

1. Runs release gate checks (v3 contract, phase6, and success-gate evaluators).
2. Validates required docs and release manifest assets.
3. Writes machine-readable output to `release/v3/release-preflight.json`.

**Registry publish (npm / JSR) is deprecated** — do not run `jsr:publish`. See [Distribution policy](../specs/distribution-policy.md).

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

1. Confirm `package.json` and `jsr.json` already match `<version>` on `main` (CI `release-readiness` job enforces this).
2. Confirm `docs/archive/release-notes/RELEASE-NOTES-v<version>.md` exists.
3. Tag **only after** those files are merged — the GitHub Release workflow checks `tag === v${package.json.version}`.

```bash
pnpm run release:check-tag -- v<version>   # must pass before tagging
git tag v<version>
git push origin main
git push origin v<version>
```

**Never tag a new version without bumping `package.json` first.** If you tagged by mistake, delete the bad tag (`git push origin :refs/tags/vX.Y.Z`) rather than creating another mismatched tag.

GitHub Actions builds and uploads release assets automatically (see §4.1). No npm or JSR publish step.

If a tag was pushed too early, move it to the version-bump commit (do not re-tag a different semver):

```bash
git tag -f v<version> <commit-with-matching-package.json>
git push origin v<version> --force
```

## 4.1 GitHub Release Assets

GitHub Releases are the primary global distribution channel for Signaler.

Required release assets:

1. `signaler-<version>-portable.zip`
2. `signaler-<version>-windows-setup.exe`

Build them locally:

```bash
pnpm run release:portable -- --version <version>
```

Automated path:

- pushing tag `v<version>` triggers `.github/workflows/publish.yml`
- the workflow builds the assets and uploads them to the GitHub Release
- release artifacts now come from two jobs:
  - `release-portable` on Ubuntu
  - `release-windows-installer` on Windows

Manual recovery path for an existing tag/release:

- run the `GitHub Release` workflow via `workflow_dispatch`
- pass `tag=v<version>`
- the workflow will build and upload the release assets to the existing GitHub Release

## 5) Post-Publish Validation

1. Confirm GitHub Release assets exist for `v<version>`:
   - `signaler-<version>-portable.zip`
   - `signaler-<version>-windows-setup.exe`
2. Run clean install smoke per shell ([install matrix](../guides/install-matrix.md)):

```bash
# Bash / Git Bash / macOS / Linux / WSL
SIGNALER_VERSION=<version> curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash
signaler --version
signalar --version
```

```powershell
# Windows PowerShell
$env:SIGNALER_VERSION = "<version>"
irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex
signaler --version
```

3. On Windows Git Bash, confirm install dir is `%LOCALAPPDATA%\signaler\current` (not `~/.local/share/signaler/`).
4. Run `pnpm exec vitest run test/global-install-lifecycle.test.ts` — install script contract tests must pass.
5. Update launch checklist / release notes index as needed.

## 6) Rollback Rules

1. Never republish an existing version number.
2. If post-publish issues are found, publish a new patch/rc (`3.1.6-rc.2` or `3.1.7`) with the same preflight steps.

