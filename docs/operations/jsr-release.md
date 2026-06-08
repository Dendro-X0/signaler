# JSR release checklist

Use this checklist when publishing `@signaler/cli` to [JSR](https://jsr.io/@signaler/cli).

## 1. Version sync

`package.json` and `jsr.json` **must match** (enforced by `scripts/jsr-publish.js` and `pnpm run release:preflight`).

**Before every JSR publish:** bump both files to a **new** semver (JSR versions are immutable — you cannot republish `4.1.0` as `4.1.0`).

Current line: **5.0.1**

```bash
node -e "const p=require('./package.json');const j=require('./jsr.json');console.log(p.version,j.version,p.version===j.version?'ok':'MISMATCH')"
```

## 2. Clean worktree (JSR requirement)

`jsr publish` aborts on uncommitted changes. Benchmark gate evaluators write to **`benchmarks/out/`** (gitignored). If publish fails with dirty `benchmarks/out/`:

```bash
git restore benchmarks/out/   # or delete the directory
```

Committed snapshots live under **`benchmarks/fixtures/`**. Refresh after intentional gate regen: `pnpm run bench:sync-fixtures`.

## 3. Preflight

```bash
pnpm run build
pnpm run test:smoke
pnpm run release:preflight
```

Preflight validates **fixtures** and runs tests; it does not regenerate `benchmarks/out/` gate files.

Optional strict gate:

```bash
pnpm run release:preflight:strict
```

## 4. JSR preparation

```bash
pnpm run prepare:jsr
```

Validates exports, essential files, and version alignment.

## 5. Publish

**Dry run (no upload):**

```bash
pnpm run jsr:publish -- --dry-run
```

**Publish (interactive browser auth):**

```bash
pnpm run jsr:publish
```

**CI / non-interactive:** create a token at https://jsr.io/account/tokens then:

```bash
export JSR_TOKEN="<token>"
pnpm run jsr:publish
```

**Skip rebuild** (only if `dist/` is already fresh):

```bash
pnpm run jsr:publish:skip-build
```

## 6. Post-publish smoke

```bash
npx jsr run @signaler/cli@5.0.1 -- --version
node node_modules/@signaler/cli/src/cli-entry.js --version
npx jsr run @signaler/cli@5.0.1 -- help audit
```

## 7. Consumer upgrade

```bash
npx jsr add @signaler/cli@5.0.1 --pnpm
```

Agents and CI should read `docs/guides/migration-v4.md` before upgrading from 3.2.x.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Version mismatch | Set the same semver in `package.json` and `jsr.json` |
| Dirty worktree | Commit/tag release, or `pnpm run jsr:publish -- --allow-dirty` (avoid for real releases) |
| Missing `dist/engine` | Run `pnpm run build` before publish |
| Slow types warning | Default `--allow-slow-types` is passed by the publish helper |
| `pnpm i jsr:@signaler/cli` fails | Use `npx jsr add @signaler/cli --pnpm` (pnpm 10.9+ can use `pnpm add jsr:@signaler/cli` with `.npmrc`) |
| No `signaler` on PATH after JSR add | Expected — use `node node_modules/@signaler/cli/src/cli-entry.js` or `install-shim` |
| `dist/bin.js` fails with `npm:` scheme | Use `src/cli-entry.js` from JSR installs; portable/GitHub release uses compiled `dist/` |
| GitHub CI test failed, empty log UI | Download workflow artifact `vitest-log-<node-version>` from the failed run; re-run locally with `CI=true pnpm test:full` |

## CI vs JSR publish

GitHub **CI** on `main` does not block **JSR** publish. After local verification:

```bash
CI=true pnpm test:full
pnpm run release:preflight
pnpm run jsr:publish
```

GitHub **Release** assets (portable zip / Windows installer) use tag push `v*` and only require `pnpm test:smoke` in `publish.yml`.
