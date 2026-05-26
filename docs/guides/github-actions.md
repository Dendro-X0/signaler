# Signaler GitHub Actions

Status: Active (v4.2 development)  
Audience: platform engineers, CI maintainers

## Official composite action

This repository ships a composite action at [`.github/actions/signaler`](../../.github/actions/signaler/action.yml).

Use it from the same repo (or pin to a tag after release):

```yaml
- uses: ./.github/actions/signaler
  with:
    cli-version: "4.2.0"   # bump when you publish a new JSR version
    base-url: http://127.0.0.1:3000
    preset: ci              # audit | ci | pr | agent
    scope: full
    managed-serve-mode: auto
```

### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `cli-version` | `4.2.0` | JSR `@signaler/cli` version |
| `base-url` | `http://127.0.0.1:3000` | App URL |
| `cwd` | `.` | Project root |
| `scope` | `full` | Discover scope for `audit` / `ci` / `agent` |
| `preset` | `ci` | `audit`, `ci`, `pr`, or `agent` |
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

- [Phase 2 roadmap](../roadmap/phase2-v4.2-team-ci.md)
- [B2B team value](./b2b-team-value.md)
- [CLI reference — workflow templates](../reference/cli.md)
