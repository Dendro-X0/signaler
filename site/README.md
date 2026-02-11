# Signaler docs

This folder contains the documentation site for Signaler.

Signaler consists of:

- A Node.js **engine** (`dist/bin.js`) that runs audits and produces artifacts under `.signaler/`.
- A Rust **launcher** (in `apex-auditor/launcher/`) that performs environment checks and orchestrates engine runs.

## Development

Install dependencies:

```bash
pnpm install
```

Run the docs dev server:

```bash
pnpm dev
```

## What to document

- The default artifacts root is `.signaler/`.
- Folder mode produces `folder-run.json` alongside the usual engine `run.json`.
- The engine can emit NDJSON progress events with `--engine-json`.
- The launcher provides:
  - `signaler doctor`
  - `signaler run audit -- <engine args...>`
  - `signaler run folder -- <engine args...>`
