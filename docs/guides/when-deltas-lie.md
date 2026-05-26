# When Deltas Lie

Signaler compares runs using **comparability hashes** and **issue-count triage**, not raw Lighthouse score deltas alone. Use this guide before failing or passing a PR based on `query --view delta`.

## Safe comparisons

Comparisons are trustworthy when:

1. **Same `comparabilityHash`** in `run.json` and `performance-triage.json` on baseline and current runs.
2. **Same run mode** (`throughput` vs `fidelity`) and similar scope (same routes/devices).
3. **Same build artifact** when using production managed serve (or document intentional build id change).

```bash
signaler query --view delta --dir .signaler --baseline ../main-signaler
```

`--baseline` is shorthand for `--baseline-dir <path>` with compare dir defaulting to `--dir`.

## Common false signals

| Change | Effect on delta |
|--------|------------------|
| `quick` → `full` scope | More routes → more red issues (not a regression) |
| Throughput → fidelity mode | Scores and issue mix shift |
| Different `buildId` / incremental cache | Different lab conditions |
| Parallelism change | Throughput scores drift (P(ref) semantics) |
| Comparing to verify without `verify.json` | Use `--baseline` + `--compare-dir` instead |

When `comparability.matched` is `false`, treat numeric deltas as **informational only** unless you override `requireComparabilityMatch`.

## Policy in config (v4.3)

```json
{
  "baselineCompare": {
    "baselineDir": ".signaler-main",
    "maxRedIncrease": 0,
    "requireComparabilityMatch": true
  },
  "qualityGate": {
    "maxRedPerfIssues": 10
  }
}
```

Or set `SIGNALER_BASELINE_DIR` in CI to the downloaded main-branch artifact path.

## CI patterns

**GitHub Actions** (composite action):

```yaml
- uses: ./.github/actions/signaler
  with:
    preset: pr
    baseline-artifacts-path: .signaler-main
```

Download main-branch `.signaler` in a prior step (artifact from `main` workflow) into `.signaler-main`.

**CLI gate after run:**

```bash
signaler query --view delta --dir .signaler --baseline .signaler-main --fail-on-regression
```

## Related

- [Lab semantics](./lab-semantics.md)
- [GitHub Actions](./github-actions.md)
- [Configuration — baselineCompare](../reference/configuration.md)
