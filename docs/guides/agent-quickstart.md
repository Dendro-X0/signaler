# Agent Quickstart

This guide is the fastest way to make an LLM agent productive with Signaler.

For model-specific prompt variants, see [`../examples/agent-prompt-pack.md`](../examples/agent-prompt-pack.md).
Repository-level agent defaults are also available in [`../../AGENTS.md`](../../AGENTS.md).
Shell-specific bootstrap blocks are available in [`../../scripts/agent-bootstrap.md`](../../scripts/agent-bootstrap.md).
Executable helpers are available in `../../scripts/agent-bootstrap.sh` and `../../scripts/agent-bootstrap.ps1`.

Use Signaler as an **agent-first web lab runner**:

1. discover routes
2. run a canonical audit
3. read the canonical artifacts in the right order
4. propose fixes with evidence

## 1. Fast start commands

Local app example:

```bash
signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
signaler run --contract v3 --mode throughput --ci --no-color --yes
signaler report
```

If the project already has `signaler.config.json`, the minimum path is:

```bash
signaler run --contract v3 --mode throughput --ci --no-color --yes
signaler report
```

## 2. What the agent should read

Read in this order:

1. `.signaler/agent-index.json`
2. `.signaler/suggestions.json`
3. `.signaler/issues.json`
4. `.signaler/results.json`
5. `.signaler/run.json`

Do not start by loading every file in `.signaler/`.

## 3. What each artifact is for

- `agent-index.json`
  - first AI entrypoint
  - small token budget
  - top ranked actions
  - legacy-to-canonical mapping
- `suggestions.json`
  - ranked actions
  - confidence and estimated impact
  - evidence pointers for exact follow-up
- `issues.json`
  - suite-level issue aggregation
  - offenders, failing combos, and pointers into diagnostics
- `results.json`
  - per-route and per-device metrics
- `run.json`
  - mode, profile, comparability hash, runtime semantics

## 4. Agent operating rules

1. Use `agent-index.json` first.
2. Follow evidence pointers before proposing code changes.
3. Prefer suggestions with:
   - `confidence = high`
   - many affected combos
   - non-zero `timeMs` or `bytes`
4. Treat `throughput` mode as trend-oriented.
5. Use focused `fidelity` reruns when validating parity-sensitive fixes.

## 5. Prompt template: analyze an existing run

Use this as a system or task prompt for an agent:

```text
You are analyzing Signaler artifacts for a web app.

Workflow:
1. Read .signaler/agent-index.json first.
2. Then read only the files it points to, starting with suggestions.json.
3. Use evidence pointers to inspect the exact issue rows before making recommendations.
4. Prioritize high-confidence, high-impact suggestions affecting the most combos.
5. Do not summarize every artifact. Focus on the top issues, likely root causes, and the smallest set of fixes with the largest impact.
6. If the run mode is throughput, treat performance scores as trend-oriented rather than exact DevTools parity.
7. When proposing fixes, separate:
   - immediate fixes
   - follow-up verification steps
   - cases where a fidelity rerun is required

Output format:
- Top 3 issues
- Root-cause hypothesis for each
- Proposed fixes in implementation order
- Validation plan
```

## 6. Prompt template: fix a project with Signaler

```text
Use Signaler as the primary audit tool for this repository.

Steps:
1. Run discover if signaler.config.json is missing or stale.
2. Run `signaler run --contract v3 --mode throughput --ci --no-color --yes`.
3. Run `signaler report`.
4. Read .signaler/agent-index.json first, then suggestions.json, issues.json, and results.json as needed.
5. Choose one high-confidence issue at a time.
6. Implement the smallest credible fix.
7. Re-run Signaler and compare the new artifacts.
8. Stop if the evidence does not support the proposed fix.

Constraints:
- Prefer canonical v3 artifacts over legacy files.
- Do not ingest the entire .signaler directory by default.
- Use fidelity reruns only for focused parity validation after a likely fix is identified.
```

## 7. Recommended agent workflow

1. First pass:
   - `discover`
   - `run --mode throughput`
   - `report`
2. Analysis pass:
   - read `agent-index.json`
   - inspect top 1-3 suggestions
   - map evidence to project code or route behavior
3. Fix pass:
   - implement smallest high-impact fix
4. Verification pass:
   - rerun throughput
   - if needed, rerun fidelity on `--focus-worst <n>`

## 8. What to ignore by default

Ignore these unless you explicitly need them:

- legacy AI files
- raw large artifacts
- screenshots and full LHR payloads
- every JSON file in `.signaler`

## 9. When Cortex is optional

Cortex is an optional assistant surface.

For direct agent workflows, it is not required when:

- the agent can run CLI commands
- the agent can read `.signaler/agent-index.json`
- the agent can follow evidence pointers into canonical artifacts

That is the preferred workflow for editor agents and terminal agents.

## 10. Next step

If you want a prewritten prompt for a specific agent session, use:

- [`../examples/agent-prompt-pack.md`](../examples/agent-prompt-pack.md)

