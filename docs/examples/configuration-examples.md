# Configuration Examples

This document provides comprehensive configuration examples for different use cases and scenarios.

## Basic Configuration

### Minimal Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] }
  ]
}
```

### Standard Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/contact", "label": "Contact", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 85,
      "accessibility": 90
    }
  }
}
```

## Performance-Focused Configuration

Optimized for performance monitoring and improvement:

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 4,
  "parallel": 2,
  "warmUp": true,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/products", "label": "Products", "devices": ["mobile"] },
    { "path": "/checkout", "label": "Checkout", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 90,
      "accessibility": 95,
      "bestPractices": 85,
      "seo": 90
    },
    "metrics": {
      "lcpMs": 2500,
      "fcpMs": 1800,
      "tbtMs": 300,
      "cls": 0.1,
      "inpMs": 200
    }
  }
}
```

## CI/CD Optimized Configuration

Optimized for continuous integration and deployment pipelines:

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 2,
  "parallel": 1,
  "warmUp": false,
  "auditTimeoutMs": 45000,
  "logLevel": "error",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] },
    { "path": "/critical-page", "label": "Critical", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 85,
      "accessibility": 90
    }
  }
}
```

## Large Site Configuration

Optimized for large websites with many pages:

```json
{
  "baseUrl": "https://mysite.com",
  "throttlingMethod": "simulate",
  "parallel": 4,
  "warmUp": true,
  "incremental": true,
  "buildId": "v1.2.3",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/products", "label": "Products", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/contact", "label": "Contact", "devices": ["mobile"] },
    { "path": "/blog", "label": "Blog", "devices": ["mobile", "desktop"] },
    { "path": "/support", "label": "Support", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 80,
      "accessibility": 95,
      "bestPractices": 85,
      "seo": 90
    }
  }
}
```

## Debug Configuration

Optimized for debugging and troubleshooting:

```json
{
  "baseUrl": "http://localhost:3000",
  "logLevel": "verbose",
  "auditTimeoutMs": 90000,
  "parallel": 1,
  "warmUp": false,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 50,
      "accessibility": 50
    }
  }
}
```

## Framework-Specific Configurations

### Next.js Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/products/[slug]", "label": "Product Detail", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 85,
      "accessibility": 95
    }
  }
}
```

### Nuxt Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/blog/_slug", "label": "Blog Post", "devices": ["mobile"] }
  ]
}
```

### SvelteKit Configuration

```json
{
  "baseUrl": "http://localhost:5173",
  "throttlingMethod": "simulate",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/blog/[slug]", "label": "Blog Post", "devices": ["mobile"] }
  ]
}
```

### Remix Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/dashboard", "label": "Dashboard", "devices": ["desktop"] },
    { "path": "/profile", "label": "Profile", "devices": ["mobile"] }
  ]
}
```

## Environment-Specific Configurations

### Development Environment

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 1,
  "parallel": 1,
  "warmUp": false,
  "auditTimeoutMs": 30000,
  "logLevel": "info",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] }
  ]
}
```

### Staging Environment

```json
{
  "baseUrl": "https://staging.mysite.com",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 2,
  "parallel": 2,
  "warmUp": true,
  "auditTimeoutMs": 60000,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/products", "label": "Products", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 85,
      "accessibility": 90
    }
  }
}
```

### Production Environment

```json
{
  "baseUrl": "https://mysite.com",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 4,
  "parallel": 3,
  "warmUp": true,
  "auditTimeoutMs": 90000,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/products", "label": "Products", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/contact", "label": "Contact", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 90,
      "accessibility": 95,
      "bestPractices": 90,
      "seo": 95
    },
    "metrics": {
      "lcpMs": 2000,
      "fcpMs": 1500,
      "tbtMs": 200,
      "cls": 0.05,
      "inpMs": 150
    }
  }
}
```

## Advanced Configuration Options

### Custom Budgets Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 90,
      "accessibility": 95,
      "bestPractices": 85,
      "seo": 90
    },
    "metrics": {
      "lcpMs": 2500,
      "fcpMs": 1800,
      "tbtMs": 300,
      "cls": 0.1,
      "inpMs": 200,
      "speedIndex": 3000,
      "interactive": 4000
    },
    "resourceSizes": {
      "totalBytes": 1000000,
      "scriptBytes": 300000,
      "imageBytes": 500000,
      "stylesheetBytes": 100000
    }
  }
}
```

### Throttling Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "cpuSlowdownMultiplier": 4,
  "networkThrottling": {
    "downloadThroughputKbps": 1600,
    "uploadThroughputKbps": 750,
    "latencyMs": 150
  },
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile"] }
  ]
}
```

### Accessibility-Focused Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/form", "label": "Contact Form", "devices": ["mobile"] },
    { "path": "/navigation", "label": "Navigation", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "accessibility": 100,
      "performance": 80
    }
  },
  "axeConfig": {
    "rules": {
      "color-contrast": { "enabled": true },
      "keyboard-navigation": { "enabled": true },
      "aria-labels": { "enabled": true }
    }
  }
}
```

## Configuration Validation

All configurations should include these essential fields:

- `baseUrl`: The base URL of your application
- `pages`: Array of pages to audit with path, label, and devices
- `throttlingMethod`: Usually "simulate" for consistent results
- `budgets`: Performance and accessibility thresholds

Optional but recommended fields:

- `parallel`: Number of concurrent audits (1-4)
- `warmUp`: Whether to warm up pages before auditing
- `auditTimeoutMs`: Timeout for individual page audits
- `logLevel`: Logging verbosity (error, warn, info, verbose)

## Usage Examples

### Using Configuration Files

```bash
# Use specific configuration file
signaler audit --config ./configs/production.json

# Use configuration with custom base URL
signaler audit --config ./configs/staging.json --base-url https://staging.mysite.com

# Validate configuration without running audit
signaler validate --config ./configs/production.json
```

### Environment Variables

```bash
# Set base URL via environment variable
export SIGNALER_BASE_URL=https://mysite.com
signaler audit

# Set log level via environment variable
export SIGNALER_LOG_LEVEL=verbose
signaler audit --config ./configs/debug.json
```

These configuration examples should cover most common use cases and provide a solid foundation for customizing Signaler to your specific needs.