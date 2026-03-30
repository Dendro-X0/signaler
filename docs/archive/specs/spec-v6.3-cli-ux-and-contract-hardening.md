# Spec: V6.3 CLI UX and Contract Hardening

Status: Draft  
Date: March 21, 2026  
Owners: CLI + Contracts maintainers  
Depends on: Workstream F, Workstream G in `v6.3-adoption-roadmap.md`

## 1. Summary

This spec defines concrete fixes for two adoption blockers:

1. Command UX inconsistencies (`--help`, command suggestions, Windows output encoding).
2. Agent contract ambiguity when optional external signals are not provided.

## 2. Goals

- Ensure help behavior is deterministic and side-effect-free.
- Ensure generated command hints are executable in the caller's runtime context.
- Ensure machine artifacts always expose explicit external-input comparability metadata.

## 3. Non-Goals

- No change to core Lighthouse scoring logic.
- No live provider fetch for external signals.
- No breaking schema changes to existing required v3/v6 fields.

## 4. Functional Requirements

## 4.1 Help behavior

- `signaler <command> --help` must:
  - print command-scoped help text
  - exit with code `0`
  - perform no command side effects (no prompts, no file writes, no network requests)

Applies at minimum to:

- `discover`
- `run`
- `analyze`
- `verify`
- `report`
- `quickstart`

## 4.2 Command hint normalization

Any command string printed as "copy/paste ready" must use an invocation prefix compatible with runtime context:

- Installed/binary context: `signaler ...`
- Local dist context: `node <absolute-or-relative-dist-bin> ...`
- Optional dev-source context (if explicitly enabled): `pnpm tsx src/bin.ts ...`

Default behavior must avoid suggesting developer-only entrypoints in user-facing output.

## 4.3 Encoding safety

CLI output must avoid malformed Unicode on Windows terminals.

- Prefer ASCII-safe fallbacks for decorative symbols when terminal encoding support is uncertain.
- Error banners and troubleshooting hints must remain readable in `--no-color` mode.

## 4.4 External input metadata defaults

`suggestions.json` and `analyze.json` must always emit:

```ts
externalSignals: {
  enabled: boolean;
  inputFiles: string[];
  accepted: number;
  rejected: number;
  digest: string | null;
  policy: string;
}
```

Default when flag omitted:

- `enabled = false`
- `inputFiles = []`
- `accepted = 0`
- `rejected = 0`
- `digest = null`
- `policy = "confidence=high;mapping=issueId+path;evidence>0;freshness<=30d;weight<=0.3;totalBoost<=0.3"`

## 5. Technical Design

## 5.1 Parsing and dispatch

- Centralize `--help` short-circuit in command dispatch before command execution branches.
- Add command-specific help renderers where missing.
- Ensure legacy aliases (`init`, `audit`, `review`) map help to canonical command sections.

## 5.2 Invocation prefix resolution

Introduce a small resolver utility that derives suggestion prefix from `process.argv` context:

- Detect direct `node .../dist/bin.js`
- Detect installed `signaler`
- Return canonical command prefix for suggestion builders

This resolver is used by:

- run/export suggestion output
- verify suggestion output
- any "next step" command hints

## 5.3 Metadata defaults

- Create one shared helper to construct default `externalSignals` metadata.
- Use same helper in `run` (v3 suggestions) and `analyze` (v6 actions).
- Override defaults only when `--external-signals` is present and files are processed.

## 6. Validation Plan

1. Help tests:
   - `discover --help` no prompt, exit `0`
   - `run --help` no side effects, exit `0`
2. Suggestion-prefix tests:
   - installed context emits `signaler ...`
   - local dist context emits `node .../dist/bin.js ...`
3. Encoding tests:
   - Windows snapshot of error banner has readable ASCII fallback
4. Metadata tests:
   - no-flag run/analyze include default `externalSignals`
   - flag + valid files include non-null digest and accepted/rejected counters
5. Regression tests:
   - existing v3/v6 validators and strict-mode behavior unchanged

## 7. Rollout and Compatibility

- Release as additive patch/minor update.
- Keep prior artifact readers functional (new block is additive).
- Update docs:
  - `docs/cli-and-ci.md`
  - `docs/getting-started.md`
  - `README.md`
