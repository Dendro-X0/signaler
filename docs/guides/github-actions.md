# Signaler GitHub Actions

Status: Active (v5.0)  
Audience: platform engineers, CI maintainers

## Official composite action

This repository ships a composite action at [`.github/actions/signaler`](../../.github/actions/signaler/action.yml).

Use it from the same repo (or pin to a tag after release):

```yaml
- uses: ./.github/actions/signaler
  with:
    cli-version: "5.0.0"
    base-url: http://127.0.0.1:3000
    preset: ci              # audit | ci | pr | agent
    scope: full
    managed-serve-mode: auto
```

### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `cli-version` | `5.0.0` | JSR `@signaler/cli` version |
| `base-url` | `http://127.0.0.1:3000` | App URL |
| `cwd` | `.` | Project root |
| `scope` | `full` | Discover scope for `audit` / `ci` / `agent` |
| `preset` | `ci` | `audit`, `ci`, `pr`, or `agent` |
| `run-profile` | (empty) | `ci-strict`, `pr-quick`, or `release-full` (overrides `preset`) |
| `quality-profile` | (empty) | `web-quality` or `pr-quality` — Lighthouse + headers + links + bundle (overrides `preset` and `run-profile`) |
| `managed-serve-mode` | `auto` | `auto`, `dev`, or `production` |
| `output-dir` | `.signaler` | Artifact directory |
| `config-path` | (empty) | Optional config file |
| `upload-artifacts` | `true` | Upload `.signaler/` after run |
| `write-summary` | `true` | Append summary to job summary panel |
| `artifact-name` | `signaler` | Artifact name prefix |

### Presets

| Preset | Command | Best for |
|--------|---------|----------|
| `audit` | `signaler audit` (discover → run → analyze) | Greenfield, full v4 loop |
| `ci` | `job run --preset ci` | Strict CI with `--fail-on-budget` on run |
| `pr` | `job run --preset pr` | Changed-files only |
| `agent` | `job run --preset agent` | Agent bootstrap parity |

### Run profiles (v4.3+)

Use `--run-profile` instead of `--preset` when you want named policy bundles:

| Profile | Steps | Use when |
|---------|-------|----------|
| `ci-strict` | discover → run (throughput + `--fail-on-budget`) → analyze | Main-branch CI gate |
| `pr-quick` | run (`--changed-only`) → analyze | PR changed-files only |
| `release-full` | discover → run (**fidelity**, parallel 2) → analyze | Pre-release / parity-sensitive |

```bash
signaler job run --run-profile ci-strict --managed-serve --in-process --base-url http://127.0.0.1:3000
```

Do not combine `--preset`, `--run-profile`, and `--quality-profile`.

### Quality profiles (v5.0+)

**`web-quality`** runs ci-strict Lighthouse, then headers, links, health, console, measure, accessibility, and bundle side runners, and evaluates `quality-pack.json`:

```yaml
- uses: ./.github/actions/signaler
  with:
    cli-version: "5.0.0"
    quality-profile: web-quality
    base-url: http://127.0.0.1:3000
    scope: full
```

```bash
signaler audit --quality-profile web-quality --managed-serve --in-process --base-url http://127.0.0.1:3000
```

After the run, read `agent-index.json` → `qualityPack` and side-runner entrypoints, or `quality-pack.json` directly.

**`pr-quality`** uses changed-only Lighthouse (`--changed-only`) plus the same side runners — suited for PR workflows:

```bash
signaler job run --quality-profile pr-quality --managed-serve --in-process --base-url http://127.0.0.1:3000
```

### PR baseline regression

Download or restore main-branch `.signaler` artifacts, then pass the path:

```yaml
- uses: ./.github/actions/signaler
  with:
    preset: pr
    baseline-artifacts-path: .signaler-main
```

This runs `query --view delta --baseline … --fail-on-regression` and appends comparability + delta JSON to the job summary when comparability mismatches, the step fails with explicit warnings.

See [When deltas lie](./when-deltas-lie.md).

## Exit codes (Action failure semantics)

GitHub Actions fails a step when the process exits non-zero. Signaler uses these conventions:

| Code | Command | Meaning | Fail the Action? |
|------|---------|---------|------------------|
| `0` | `job run`, `audit` | All steps succeeded | No |
| `1` | `job run`, `audit` | `discover` or `run` failed (hard failure) | **Yes** |
| `2` | `job run`, `audit` | `run` ok, `analyze` failed (partial; triage may still exist) | **Yes** (default) |
| `1` | `run --ci --fail-on-budget` | Budget or CI gate failed | **Yes** |
| `3` | `verify --dry-run` | Planned verify only (no rerun) | Treat as success unless you require a real verify |

**Partial success (`2`):** Artifacts such as `performance-triage.json` and `run.json` may be usable. Set `continue-on-error` only if your team explicitly allows analyze failures.

**Composite action:** The `Run Signaler` step propagates the CLI exit code. Summary steps use `if: always()` and do not mask failure.

## Example — pull request

```yaml
name: Signaler PR

on:
  pull_request:

jobs:
  signaler:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - run: pnpm install --frozen-lockfile

      - uses: ./.github/actions/signaler
        with:
          cli-version: "4.2.0"
          preset: pr
          managed-serve-mode: auto
```

## Example — main branch CI

```yaml
- uses: ./.github/actions/signaler
  with:
    cli-version: "4.2.0"
    preset: ci
    scope: full
```

## Workflow templates (GitHub “New workflow”)

Starter templates (no manual `pnpm start` — uses **managed serve**):

- [`.github/workflow-templates/signaler-audit-pnpm.yml`](../../.github/workflow-templates/signaler-audit-pnpm.yml)
- [`.github/workflow-templates/signaler-audit-npm.yml`](../../.github/workflow-templates/signaler-audit-npm.yml)
- [`.github/workflow-templates/signaler-audit-yarn.yml`](../../.github/workflow-templates/signaler-audit-yarn.yml)

## Monorepo

Set `cwd` to the app package:

```yaml
- uses: ./.github/actions/signaler
  with:
    cwd: apps/web
    base-url: http://127.0.0.1:3000
    preset: audit
```

## Versioning note

**Bump `cli-version` when you publish a new JSR release.** JSR versions are immutable — you cannot republish the same semver.

See [`../operations/jsr-release.md`](../operations/jsr-release.md).

## Related

- [Phase 3 roadmap — policy gates](../roadmap/phase3-v4.3-policy-gates.md)
- [Phase 2 roadmap](../roadmap/phase2-v4.2-team-ci.md)
- [B2B team value](./b2b-team-value.md)
- [CLI reference — workflow templates](../reference/cli.md)
