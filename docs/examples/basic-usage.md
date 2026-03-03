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

## Performance-Focused Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "devtools",
  "parallel": 1,
  "warmUp": true,
  "pages": [{ "path": "/", "label": "Home", "devices": ["mobile", "desktop"] }]
}
```

## CI/CD Optimized Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "pages": [{ "path": "/", "label": "Home", "devices": ["mobile"] }],
  "budgets": { "categories": { "performance": 80 } }
}
```

## Large Site Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "parallel": 1,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] },
    { "path": "/blog", "label": "Blog", "devices": ["mobile"] },
    { "path": "/docs", "label": "Docs", "devices": ["mobile"] }
  ]
}
```

## Debug Configuration

```bash
signaler run --log-level verbose --diagnostics --lhr
```
