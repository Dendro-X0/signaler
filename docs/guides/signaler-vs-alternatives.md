# Signaler vs Alternatives

This page clarifies where Signaler fits compared to common Lighthouse and web-quality tooling.

## Positioning

Signaler is a **route-scale lab runner with an agent-first contract**.

Core differentiators:

1. Canonical workflow for teams and agents: `discover -> run -> analyze -> verify -> report`.
2. Evidence-linked machine artifacts (`run.json`, `results.json`, `suggestions.json`, `agent-index.json`, `analyze.json`, `verify.json`).
3. Built-in focused verification loop (`verify`) with pass/fail outputs for CI and agent workflows.
4. Explicit comparability boundaries via `comparabilityHash`.

## Quick Comparison

| Tool type | Typical strength | Typical gap | Signaler approach |
| --- | --- | --- | --- |
| DevTools Lighthouse | Single-page deep inspection | Hard to run consistently at route-suite scale | Route/device batch orchestration with stable artifacts |
| Raw Lighthouse CLI | Scriptable audits | Machine-action layer and verification loop are DIY | Native analyze/verify contracts for agent loops |
| Hosted synthetic monitors | Historical tracking and alerts | Less code-adjacent remediation context | Local/CI-first artifacts with evidence pointers into routes/issues |
| Generic perf linters | Fast static checks | No end-to-end runtime score + opportunity context | Runtime lab signals merged with actionable ranking |

## When to Choose Signaler

Use Signaler when you need:

1. Project-scale route coverage in CI and local iteration.
2. A token-bounded machine handoff for coding agents.
3. Deterministic pass/fail verification after each fix.
4. One contract that both humans and automation can read.

## Onboarding Narrative for Agent Workflows

Start with the canonical loop:

```bash
signaler discover --scope full
signaler run --contract v3 --mode throughput
signaler analyze --contract v6 --artifact-profile lean
signaler verify --contract v6
signaler report
```

Recommended artifact read order for agents:

1. `.signaler/analyze.json`
2. `.signaler/verify.json`
3. `.signaler/agent-index.json`
4. `.signaler/suggestions.json`
5. `.signaler/results.json`

## Cost Controls

Signaler includes explicit cost/adoption controls for machine-facing outputs:

1. Artifact profiles: `lean`, `standard`, `diagnostics`.
2. Strict token-budget enforcement (`--token-budget` for `analyze`; `--machine-token-budget` for `run` machine index).
3. Profile defaults:
   - `lean`: 8k budget, compact output
   - `standard`: 16k budget, broader context
   - `diagnostics`: 32k budget, richest context
