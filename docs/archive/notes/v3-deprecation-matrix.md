# V3 Deprecation Matrix (Aliases and Compatibility)

Status: Draft baseline  
Date: March 23, 2026  
Scope: V2.x -> V3 -> V4 migration timeline

## Purpose

This matrix defines how long legacy aliases and compatibility artifacts remain supported so developers and agents can migrate without guesswork.

## Command Alias Timeline

| Alias | Canonical Command | V3.0 | V3.1 | V3.2 | V4.0 |
| --- | --- | --- | --- | --- | --- |
| `init` | `discover` | supported | supported + deprecation note in help/docs | supported + deprecation note in runtime output | removed (breaking) |
| `audit` | `run` | supported | supported + deprecation note in help/docs | supported + deprecation note in runtime output | removed (breaking) |
| `review` | `report` | supported | supported + deprecation note in help/docs | supported + deprecation note in runtime output | removed (breaking) |

Policy:

1. No alias removal before a major version boundary.
2. Deprecation warnings are informational in V3.x and become removal actions only in V4.0.
3. Canonical docs and CI templates must always prefer canonical commands.

## Artifact Compatibility Timeline

| Artifact Family | V3.0 | V3.x | V4.0 |
| --- | --- | --- | --- |
| Canonical (`run/results/suggestions/agent-index`) | required | required | required |
| V6 action/verify (`analyze/verify`) | required for agent-first loop | required | required |
| Legacy compatibility (`summary-lite`, `ai-ledger`, `ai-fix*`) | optional compatibility path | optional compatibility path | optional plugin/legacy mode only (subject to review) |

Policy:

1. V3 and V6 required fields remain additive-only in V3.x.
2. Compatibility files are not guaranteed as default outputs unless explicitly enabled.
3. Legacy consumers should migrate to canonical artifacts before V4.0.

## Messaging Requirements

1. `signaler help` and command-level help must show canonical commands first.
2. Migration docs must include alias mapping and timeline.
3. Release notes must include an alias/compatibility section for any timeline change.

## Exit Criteria for Phase 3 Completion

1. Deprecation matrix is linked from migration and docs index pages.
2. CLI help/docs consistently present canonical commands as primary.
3. Timeline is referenced in release notes and roadmap.
