# GitHub Actions troubleshooting (Signaler repo)

Use this when pushes to `main` land on GitHub but **no CI check appears** on the commit and [Actions](https://github.com/Dendro-X0/signaler/actions) shows no new runs.

## Quick facts (this repo)

| Item | Value |
|------|--------|
| CI workflow | `.github/workflows/ci.yml` |
| Triggers | `push` to `main` / `develop`, `pull_request`, `workflow_dispatch` |
| Release workflow | `.github/workflows/publish.yml` — **`push` of tags `v*` only** (not branch pushes) |
| Dogfood | `signaler-dogfood.yml` — **manual only** (`workflow_dispatch`) |

A commit titled “Release v4.3.0” on `main` runs **CI** only. It does **not** create a GitHub Release until you push a matching tag, e.g. `git tag v4.3.0 && git push origin v4.3.0`.

## Symptom: zero runs after push

If the [runs API](https://api.github.com/repos/Dendro-X0/signaler/actions/runs) shows no runs for your commit SHA, the problem is **GitHub not dispatching Actions**, not a failing job.

### 1. Confirm Actions are enabled (most common)

Repo: **Settings → Actions → General**

- **Actions permissions:** choose **Allow all actions and reusable workflows** (or at least allow actions for this repo).
- Ensure Actions are **not** set to **Disable actions**.

Account: **https://github.com/settings/billing** → check **Actions** minutes / spending limit (exhausted limits can stop new runs entirely).

### 2. Look for pending workflow approvals

Repo: **Actions** tab

- Yellow banner: **“Workflows awaiting approval”** (common after adding new workflow files).
- Approve **CI** (and any other listed workflows), then re-run or push again.

### 3. Manual run (bypasses push delivery)

**Actions → CI → Run workflow** → branch `main` → **Run workflow**

- If this **also** does nothing → Actions are disabled or billing-blocked (step 1).
- If manual runs work but push does not → rare webhook issue; try another push or contact GitHub Support with commit SHAs.

### 4. Release still on v4.2.0?

Releases come from **tags**, not release commits:

```bash
# After CI is green and package.json/jsr.json match the tag:
git tag v4.3.0
git push origin v4.3.0
```

`publish.yml` runs on `push` of `v*` tags. Tag must match `package.json` version (`v${version}`).

### 5. Verify from the command line

```bash
# Recent runs (needs gh CLI + auth)
gh run list --repo Dendro-X0/signaler --limit 5

# Runs for a specific commit
gh run list --repo Dendro-X0/signaler --commit <sha>
```

Public API (no auth): `https://api.github.com/repos/Dendro-X0/signaler/actions/runs?head_sha=<sha>`

## Known-good last CI on main

As of 2026-05-26, the last successful **push** CI on `main` was for commit `612f976` (CI run #152). Any commits after that with `total_count: 0` runs indicate dispatch failure, not test failure.

## Retrigger after fixing settings

```bash
git commit --allow-empty -m "ci: retrigger workflows"
git push origin main
```

Or use **Actions → CI → Run workflow**.
