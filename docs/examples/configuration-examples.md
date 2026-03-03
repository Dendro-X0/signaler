# Configuration Examples

Valid examples for `signaler.config.json`.

## Minimal

```json
{
  "baseUrl": "http://localhost:3000",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] }
  ]
}
```

## Standard

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 90,
      "accessibility": 95,
      "bestPractices": 90,
      "seo": 90
    },
    "metrics": {
      "lcpMs": 2500,
      "inpMs": 200,
      "cls": 0.1
    }
  }
}
```

## CI-Oriented

```json
{
  "baseUrl": "http://localhost:3000",
  "parallel": 1,
  "auditTimeoutMs": 60000,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] },
    { "path": "/checkout", "label": "Checkout", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": { "performance": 85, "accessibility": 90 }
  }
}
```

## Validate a Config

```bash
signaler config --validate --output ./signaler.config.json
```
