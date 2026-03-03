# Basic Usage Examples

Use this page for fast, valid examples against current Signaler CLI.

## Initialize and Audit

```bash
signaler wizard
signaler audit
```

## Common Commands

```bash
signaler measure
signaler bundle
signaler health
signaler links
signaler headers
signaler console
```

## CI Command

```bash
signaler audit --ci --fail-on-budget --no-color
```

## Focus Worst Pages

```bash
signaler audit --focus-worst 10
```

## Programmatic API

```ts
import { createSignalerAPI } from '@signaler/cli/api';

const api = createSignalerAPI();

const config = api.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [{ path: '/', label: 'Home', devices: ['mobile', 'desktop'] }],
});

const result = await api.audit(config);
console.log(result.meta.completedAt);
```

## Output Files

Key files are written under `.signaler/`:

- `summary.json`
- `summary-lite.json`
- `issues.json`
- `triage.md`
- `report.html`
