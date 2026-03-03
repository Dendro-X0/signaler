# Current Shortcomings (March 2026)

This document records the practical gaps in Signaler today so the project can be refocused.

It is intentionally direct: this is the "reality check" baseline before new promotion work.

## 1. Product Positioning Is Blurry

Severity: High

- The project is described as:
  - A batch Lighthouse CLI
  - An AI optimization engineer (Cortex)
  - A shell tool
  - A fullscreen TUI
- This makes the primary value proposition unclear for new users.
- A user should quickly answer: "What problem does Signaler solve better than alternatives?"

Impact:
- Harder onboarding.
- Harder marketing (including dev.to launch).
- Scope creep in implementation.

## 2. Documentation Drift and Inconsistency

Severity: High

- README, ROADMAP, and docs have mixed eras and mixed claims.
- `ROADMAP.md` is Cortex-centric and does not represent the full current product state.
- Some docs emphasize old/new features unevenly, and command surface is hard to parse for newcomers.
- Encoding/formatting artifacts are visible in some markdown output.

Impact:
- Low trust for first-time users.
- Increased support burden.
- Contributors cannot tell what is current vs legacy.

## 3. Artifact Strategy Produces Too Much AI Input by Default

Severity: High

- Audit output writes many JSON files by default.
- In a real run (`next-blogkit-pro/.signaler`), total payload is large:
  - ~552 KB artifacts overall (~138k token rough upper-bound if all files are ingested)
  - JSON alone ~96k token rough upper-bound
- "Lite" and "AI" outputs still carry substantial overlap.
- AI-oriented files are generated even when AI mode is not actively needed.

Impact:
- Wasted tokens and cost in downstream AI workflows.
- Slower agent loops.
- More confusion over which file should be read first.

## 4. AI Signal Quality Is Mixed

Severity: Medium-High

- A large share of opportunity rows are zero-impact (`estimatedSavingsMs = 0`) and still appear in key artifacts.
- Some "quick wins" and issue summaries can include weak or low-actionability items.
- This introduces noise for both humans and AI.

Impact:
- Worse prioritization quality.
- Token spent on low-value context.
- Reduced confidence in generated recommendations.

## 5. UX Surface Is Fragmented

Severity: Medium

- Shell, TUI, and Cortex flows overlap but are not yet fully unified.
- Discoverability of "best path" is weak for first-run users.
- Exit behavior, terminal lifecycle, and interaction polish have required multiple iterative fixes.

Impact:
- Perceived instability.
- Learning curve feels steeper than expected for a CLI tool.

## 6. "Expert Tool" Expectations vs Current Defaults

Severity: Medium

- Expert users need:
  - Stable compare/diff workflows
  - Strong CI budget governance
  - High-signal top-N prioritization
  - Deterministic machine-readable contracts
- Current defaults still emphasize breadth over high-signal decision support.

Impact:
- Practical day-to-day value is lower than feature count suggests.
- Harder adoption in performance-focused teams.

## 7. Promotion Readiness Is Not Yet There

Severity: High

- The project can run and produce rich outputs, but messaging and workflow clarity are not at "showcase quality" yet.
- A dev.to launch now risks attracting users before "first 10 minute experience" is sharp.

Impact:
- Early audience may churn.
- Feedback quality degrades because product story is unclear.

---

## Immediate Refocus (Recommended)

If we pause feature expansion and focus on practicality:

1. Define one primary promise:
   "Fast, high-signal web quality triage for CI and local iteration."
2. Make one canonical AI entry artifact:
   `agent-index.json` only, with strict token budget.
3. Filter zero-impact opportunities from default AI outputs.
4. Publish a "start here" workflow with 3 commands only:
   `init` -> `run` -> `review`.
5. Rewrite README hero + quickstart + outputs section to match current reality.
6. Split roadmap:
   - Product roadmap (practical UX/CI/output quality)
   - Cortex research roadmap (advanced AI capabilities)

---

## Launch Gate (Before dev.to)

Only launch when all are true:

- New users can complete first run in <= 10 minutes.
- One artifact is clearly documented as the AI input contract.
- Default output set is token-conscious and non-redundant.
- README and docs are internally consistent.
- TUI and shell exit/terminal behavior is stable across common terminals.
