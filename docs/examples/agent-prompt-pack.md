# Agent Prompt Pack

Use these prompts to get editor and terminal agents productive with Signaler quickly.

All variants assume the same operating model:

1. run Signaler
2. read canonical v3 artifacts only
3. follow evidence pointers
4. implement the smallest credible fix
5. rerun and verify

## Shared setup note

Use this context with any model:

```text
Signaler is an agent-first web lab runner.

Canonical workflow:
1. signaler discover --scope full --non-interactive --yes --base-url http://127.0.0.1:3000
2. signaler run --contract v3 --mode throughput --ci --no-color --yes
3. signaler report

Canonical artifact read order:
1. .signaler/agent-index.json
2. .signaler/suggestions.json
3. .signaler/issues.json
4. .signaler/results.json
5. .signaler/run.json

Rules:
- Do not ingest the whole .signaler directory by default.
- Prefer canonical v3 artifacts over legacy files.
- Treat throughput runs as trend-oriented.
- Use focused fidelity reruns only after a likely fix is identified.
```

## Codex prompt

```text
Use Signaler as the primary audit tool for this repository.

First:
1. Run the canonical Signaler workflow if fresh artifacts are missing.
2. Read .signaler/agent-index.json first.
3. Follow only the artifact pointers needed to inspect the top 1-3 suggestions.

Then:
1. Identify the smallest high-confidence fix with the best expected impact.
2. Explain the suspected root cause using Signaler evidence.
3. Implement one fix at a time.
4. Re-run Signaler and compare outputs.

Output format:
- Issue selected
- Evidence used
- Root-cause hypothesis
- Proposed fix
- Validation result
```

## Claude prompt

```text
Analyze this project using Signaler artifacts.

Start with .signaler/agent-index.json and use it as the primary context anchor.
Read only the linked canonical files required to understand the top suggestions.

Prioritize:
- high-confidence suggestions
- issues affecting many combos
- fixes with clear evidence pointers

Do not produce a broad narrative summary.
Produce:
1. top issues
2. probable root causes
3. implementation plan
4. rerun/verification plan
```

## GPT prompt

```text
You are using Signaler to triage and improve a web app.

Workflow:
1. Run discover, run, and report if artifacts are missing.
2. Read .signaler/agent-index.json first.
3. Use suggestions.json and issues.json to inspect the best supported actions.
4. Recommend the highest-leverage fix first.
5. Avoid low-impact or zero-impact work.
6. Re-run Signaler after each meaningful change.

When you answer:
- cite the exact artifact and pointer you used
- keep the fix set small
- separate immediate fixes from follow-up checks
- call out when fidelity reruns are required
```

## One-line starter prompts

Short versions for agent chat boxes:

- `Use Signaler canonical v3 artifacts only. Read .signaler/agent-index.json first, then inspect the top evidence-backed suggestions and fix the highest-impact issue.`
- `Run Signaler, read agent-index.json, follow evidence pointers, implement one small high-confidence fix, rerun, and compare results.`

## Recommended usage

- Use `docs/agent-quickstart.md` first.
- Use this prompt pack when configuring a specific agent workspace or custom instruction file.
- Keep prompts short and operational; the artifact contract should do most of the work.
