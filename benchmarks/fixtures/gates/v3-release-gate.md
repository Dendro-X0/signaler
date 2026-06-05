# V3 Release Gate (Phase 1)

Generated: 2026-06-05T12:24:28.882Z
Status: WARN

## Summary

- Blocking failures: 0
- Warnings: 1
- Manual items: 3

## Checks

| Check | Status | Blocking | Details |
| --- | --- | --- | --- |
| v3-core-docs | ok | yes | V3 contract and migration docs are present. |
| canonical-flow-docs-v3 | ok | yes | Canonical flow is clear in 3 key docs. |
| local-build-flow-docs | ok | yes | Local unpublished-build workflow (`node ./dist/bin.js`) is documented. |
| required-cli-scripts | ok | yes | Required build/smoke scripts are present. |
| v63-gate-dependencies | ok | yes | V6.3 gate dependency scripts are present. |
| package-metadata | ok | yes | Package name and signaler bin mapping are valid. |
| v3-gate-schema-files | ok | yes | V3 gate evaluator/validator/schema files are present. |
| release-manifest-contract | ok | yes | V3 release manifest schema/example files are present. |
| release-checklist-v3-gate | ok | yes | Launch checklist references V3 release gate commands. |
| dogfood-evidence | ok | no | Dogfood evidence complete for 3 repos (>=14 days each). |
| loop-smoke-evidence | warn | no | Loop smoke evidence exists but appears stale (>30 days) or missing generatedAt. |
| release-notes-draft | ok | no | V3 release notes draft/candidate exists. |

