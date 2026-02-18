# Signaler overview

Generated: 2026-02-15T18:14:18.794Z

## ⚠️ Performance Score Context

**Important**: Signaler runs in headless Chrome with parallel execution for batch efficiency.
Performance scores are typically **10-30 points lower** than Chrome DevTools due to:
- Headless browser environment
- Simulated throttling
- Parallel execution overhead

**Use these scores for**:
- ✅ Relative comparison between pages
- ✅ Trend analysis over time
- ✅ Identifying optimization opportunities

**Not for**:
- ❌ Absolute performance measurement
- ❌ Direct comparison with DevTools scores
- ❌ Production performance guarantees

The actual user experience is better than these test results indicate.

---

## Key files

- Overview: [overview.md](overview.md)
- Triage: [triage.md](triage.md)
- Quick Fixes: [QUICK-FIXES.md](QUICK-FIXES.md)
- Plan (JSON): [plan.json](plan.json)
- Report: [report.html](report.html)
- Issues (JSON): [issues.json](issues.json)
- AI Analysis (JSON): [AI-ANALYSIS.json](AI-ANALYSIS.json)
- AI Summary (JSON): [AI-SUMMARY.json](AI-SUMMARY.json)
- AI ledger (JSON): [ai-ledger.json](ai-ledger.json)
- AI fix packet (JSON): [ai-fix.json](ai-fix.json)
- AI fix packet (min): [ai-fix.min.json](ai-fix.min.json)
- Summary (lite): [summary-lite.json](summary-lite.json)
- Export: [export.json](export.json)

---

## Run settings

```text
Build ID: -
Incremental: no
Resolved parallel: 1
Warm-up: yes
Throttling: simulate
CPU slowdown: 4
Throttling overrides applied: yes
Chrome: managed-headless (headless)
Combos: 1
Runs per combo: 1
Elapsed: 14s
```

---

## Status

```text
Target score: 95+
Below target — P: 1 | A: 1 | BP: 0 | SEO: 1
Suite totals — red: 0 | yellow: 1 | green: 0 | runtime errors: 0
```

---

## Top issues (by total estimated savings)

| Issue | Count | Total savings (ms) |
| --- | --- | --- |
| Reduce unused JavaScript | 1 | 1350 |
| Initial server response time was short | 1 | 192 |
| Avoid multiple page redirects | 1 | 0 |

---

## Worst combos (quick jump)

### Performance

| Label | Path | Device | P | A | BP | SEO | Artifacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google | `/` | mobile | 69 | 82 | 96 | 91 | [diagnostics-lite](lighthouse-artifacts/diagnostics-lite/Google__item__mobile.json) |

### Accessibility

| Label | Path | Device | P | A | BP | SEO | Artifacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google | `/` | mobile | 69 | 82 | 96 | 91 | [diagnostics-lite](lighthouse-artifacts/diagnostics-lite/Google__item__mobile.json) |

### Best Practices

| Label | Path | Device | P | A | BP | SEO | Artifacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google | `/` | mobile | 69 | 82 | 96 | 91 | [diagnostics-lite](lighthouse-artifacts/diagnostics-lite/Google__item__mobile.json) |

### SEO

| Label | Path | Device | P | A | BP | SEO | Artifacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google | `/` | mobile | 69 | 82 | 96 | 91 | [diagnostics-lite](lighthouse-artifacts/diagnostics-lite/Google__item__mobile.json) |

---

## Next runs (fast iteration)

Use this to iterate quickly and keep a high-signal feedback loop. Treat `--stable` as a fallback when parallel mode flakes.

```bash
# Full sweep (fast feedback)
signaler audit --diagnostics
# Focused rerun (high signal)
# - re-runs only the worst N combos from the previous summary.json
signaler audit --focus-worst 10 --diagnostics
# Fallback stability mode (only if parallel flakes)
signaler audit --stable --diagnostics
```
