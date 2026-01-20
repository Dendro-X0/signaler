# Framework Integration Examples

This document provides specific integration examples for popular web frameworks.

## nextjs Integration

### Basic nextjs Setup

```bash
# In your Next.js project
npm run build  # Ensure .next directory exists
signaler wizard  # Auto-detects Next.js structure
```

### nextjs Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile", "desktop"] },
    { "path": "/products", "label": "Products", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 85,
      "accessibility": 95
    }
  }
}
```

### nextjs API Integration

```typescript
// pages/api/audit.ts or app/api/audit/route.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pages } = req.body;
    
    const config = signaler.createConfig({
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      pages: pages.map((path: string) => ({
        path,
        label: path.replace('/', '') || 'Home',
        devices: ['mobile'] as const
      }))
    });

    const result = await signaler.audit(config);
    
    res.status(200).json({
      success: true,
      results: result.results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

## Next.js Integration

### Basic Next.js Setup

```bash
# In your Next.js project
npm run build  # Ensure .next directory exists
signaler wizard  # Auto-detects Next.js structure
```

### Next.js Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "parallel": 2,
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile", "desktop"] },
    { "path": "/products", "label": "Products", "devices": ["mobile"] },
    { "path": "/products/shoes", "label": "Shoes", "devices": ["mobile"] },
    { "path": "/products/clothing", "label": "Clothing", "devices": ["mobile"] }
  ],
  "budgets": {
    "categories": {
      "performance": 85,
      "accessibility": 95
    },
    "metrics": {
      "lcpMs": 2500,
      "cls": 0.1
    }
  }
}
```

### Next.js API Route for Auditing

```typescript
// pages/api/audit.ts or app/api/audit/route.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pages } = req.body;
    
    const config = signaler.createConfig({
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      pages: pages.map((path: string) => ({
        path,
        label: path.replace('/', '') || 'Home',
        devices: ['mobile'] as const
      })),
      parallel: 1, // Single worker for API usage
      auditTimeoutMs: 45000
    });

    const result = await signaler.audit(config);
    
    res.status(200).json({
      success: true,
      auditTime: result.meta.elapsedMs,
      results: result.results.map(r => ({
        path: r.path,
        label: r.label,
        device: r.device,
        scores: r.scores,
        metrics: r.metrics
      }))
    });

  } catch (error) {
    console.error('Audit failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### Next.js Package.json Scripts

```json
{
  "scripts": {
    "audit": "signaler audit",
    "audit:quick": "signaler measure",
    "audit:focus": "signaler audit --focus-worst 5",
    "audit:ci": "signaler audit --ci --fail-on-budget",
    "audit:setup": "signaler wizard"
  }
}
```

## Nuxt Integration

### Basic Nuxt Setup

```bash
# In your Nuxt project
npm run build  # Creates .nuxt directory
signaler wizard  # Auto-detects Nuxt routes
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
    { "path": "/blog", "label": "Blog", "devices": ["mobile", "desktop"] },
    { "path": "/blog/post-1", "label": "Blog Post 1", "devices": ["mobile"] },
    { "path": "/blog/post-2", "label": "Blog Post 2", "devices": ["mobile"] }
  ]
}
```

### Nuxt Plugin for Auditing

```typescript
// plugins/signaler.client.ts
import { SignalerAPI } from '@signaler/cli/api';

export default defineNuxtPlugin(() => {
  const signaler = new SignalerAPI();
  
  return {
    provide: {
      audit: async (pages: string[]) => {
        const config = signaler.createConfig({
          baseUrl: window.location.origin,
          pages: pages.map(path => ({
            path,
            label: path.replace('/', '') || 'Home',
            devices: ['mobile'] as const
          }))
        });
        
        return await signaler.audit(config);
      }
    }
  };
});
```

### Nuxt Server API

```typescript
// server/api/audit.post.ts
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { pages } = body;
  
  try {
    const config = signaler.createConfig({
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      pages: pages.map((path: string) => ({
        path,
        label: path.replace('/', '') || 'Home',
        devices: ['mobile'] as const
      }))
    });
    
    const result = await signaler.audit(config);
    
    return {
      success: true,
      results: result.results
    };
    
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Audit failed'
    });
  }
});
```

## Remix Integration

### Basic Remix Setup

```bash
# In your Remix project
npm run build  # Creates build directory
signaler wizard  # Auto-detects Remix routes
```

### Remix Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/contact", "label": "Contact", "devices": ["mobile"] },
    { "path": "/dashboard", "label": "Dashboard", "devices": ["desktop"] }
  ],
  "budgets": {
    "categories": {
      "performance": 90,
      "accessibility": 95
    }
  }
}
```

### Remix Action for Auditing

```typescript
// app/routes/admin.audit.tsx
import { ActionFunction, json } from '@remix-run/node';
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    throw new Response('Method not allowed', { status: 405 });
  }

  const formData = await request.formData();
  const pages = JSON.parse(formData.get('pages') as string);

  try {
    const config = signaler.createConfig({
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      pages: pages.map((path: string) => ({
        path,
        label: path.replace('/', '') || 'Home',
        devices: ['mobile'] as const
      }))
    });

    const result = await signaler.audit(config);
    
    return json({
      success: true,
      auditTime: result.meta.elapsedMs,
      results: result.results
    });

  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export default function AuditPage() {
  return (
    <div>
      <h1>Performance Audit</h1>
      <form method="post">
        <input
          type="hidden"
          name="pages"
          value={JSON.stringify(['/', '/about', '/contact'])}
        />
        <button type="submit">Run Audit</button>
      </form>
    </div>
  );
}
```

## SvelteKit Integration

### Basic SvelteKit Setup

```bash
# In your SvelteKit project
npm run build  # Creates build directory
signaler wizard  # Auto-detects SvelteKit routes
```

### SvelteKit Configuration

```json
{
  "baseUrl": "http://localhost:5173",
  "throttlingMethod": "simulate",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/blog", "label": "Blog", "devices": ["mobile", "desktop"] },
    { "path": "/contact", "label": "Contact", "devices": ["mobile"] }
  ]
}
```

### SvelteKit API Endpoint

```typescript
// src/routes/api/audit/+server.ts
import { json } from '@sveltejs/kit';
import { SignalerAPI } from '@signaler/cli/api';
import type { RequestHandler } from './$types';

const signaler = new SignalerAPI();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { pages } = await request.json();
    
    const config = signaler.createConfig({
      baseUrl: 'http://localhost:5173',
      pages: pages.map((path: string) => ({
        path,
        label: path.replace('/', '') || 'Home',
        devices: ['mobile'] as const
      }))
    });
    
    const result = await signaler.audit(config);
    
    return json({
      success: true,
      results: result.results
    });
    
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Audit failed'
    }, { status: 500 });
  }
};
```

### SvelteKit Component

```svelte
<!-- src/routes/admin/audit/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  
  let auditResults: any[] = [];
  let isLoading = false;
  
  async function runAudit() {
    isLoading = true;
    
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pages: ['/', '/about', '/blog', '/contact']
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        auditResults = data.results;
      } else {
        console.error('Audit failed:', data.error);
      }
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      isLoading = false;
    }
  }
</script>

<h1>Performance Audit</h1>

<button on:click={runAudit} disabled={isLoading}>
  {isLoading ? 'Running Audit...' : 'Run Audit'}
</button>

{#if auditResults.length > 0}
  <div class="results">
    <h2>Audit Results</h2>
    {#each auditResults as result}
      <div class="result-card">
        <h3>{result.label} ({result.device})</h3>
        <p>Performance: {result.scores.performance}</p>
        <p>Accessibility: {result.scores.accessibility}</p>
        <p>LCP: {result.metrics.lcpMs}ms</p>
      </div>
    {/each}
  </div>
{/if}

<style>
  .results {
    margin-top: 2rem;
  }
  
  .result-card {
    border: 1px solid #ccc;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
  }
</style>
```

## Astro Integration

### Basic Astro Setup

```bash
# In your Astro project
npm run build  # Creates dist directory
signaler wizard  # Auto-detects static routes
```

### Astro Configuration

```json
{
  "baseUrl": "http://localhost:3000",
  "throttlingMethod": "simulate",
  "pages": [
    { "path": "/", "label": "Home", "devices": ["mobile", "desktop"] },
    { "path": "/about", "label": "About", "devices": ["mobile"] },
    { "path": "/blog", "label": "Blog", "devices": ["mobile"] },
    { "path": "/blog/post-1", "label": "Blog Post 1", "devices": ["mobile"] }
  ]
}
```

### Astro API Endpoint

```typescript
// src/pages/api/audit.ts
import type { APIRoute } from 'astro';
import { SignalerAPI } from '@signaler/cli/api';

const signaler = new SignalerAPI();

export const POST: APIRoute = async ({ request }) => {
  try {
    const { pages } = await request.json();
    
    const config = signaler.createConfig({
      baseUrl: 'http://localhost:3000',
      pages: pages.map((path: string) => ({
        path,
        label: path.replace('/', '') || 'Home',
        devices: ['mobile'] as const
      }))
    });
    
    const result = await signaler.audit(config);
    
    return new Response(JSON.stringify({
      success: true,
      results: result.results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Audit failed'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
```

## Express.js Integration

### Express API Server

```typescript
import express from 'express';
import cors from 'cors';
import { SignalerAPI } from '@signaler/cli/api';

const app = express();
const signaler = new SignalerAPI();

app.use(cors());
app.use(express.json());

// Audit endpoint
app.post('/api/audit', async (req, res) => {
  try {
    const { baseUrl, pages, options = {} } = req.body;
    
    if (!baseUrl || !pages || !Array.isArray(pages)) {
      return res.status(400).json({
        success: false,
        error: 'baseUrl and pages array are required'
      });
    }
    
    const config = signaler.createConfig({
      baseUrl,
      pages: pages.map(page => ({
        path: typeof page === 'string' ? page : page.path,
        label: typeof page === 'string' 
          ? (page.replace('/', '') || 'Home')
          : page.label,
        devices: typeof page === 'string' 
          ? ['mobile'] as const
          : (page.devices || ['mobile'] as const)
      })),
      parallel: options.parallel || 1,
      throttlingMethod: options.throttlingMethod || 'simulate',
      auditTimeoutMs: options.timeout || 45000
    });
    
    const validation = signaler.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        details: validation.errors
      });
    }
    
    const result = await signaler.audit(config);
    
    res.json({
      success: true,
      auditTime: result.meta.elapsedMs,
      totalPages: result.results.length,
      results: result.results.map(r => ({
        path: r.path,
        label: r.label,
        device: r.device,
        scores: r.scores,
        metrics: r.metrics,
        opportunities: r.opportunities.slice(0, 3) // Top 3 opportunities
      }))
    });
    
  } catch (error) {
    console.error('Audit failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Audit API server running on port ${PORT}`);
});
```

## CI/CD Integration Examples

### GitHub Actions

```yaml
name: Performance Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        framework: [nextjs, nuxt, remix, sveltekit]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build
      
    - name: Start application
      run: |
        npm start &
        npx wait-on http://localhost:3000 --timeout 60000
      
    - name: Install Signaler
      run: npm install -g @signaler/cli
      
    - name: Run performance audit
      run: signaler audit --ci --fail-on-budget --no-color
      
    - name: Upload audit results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: audit-results-${{ matrix.framework }}
        path: .signaler/
        
    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const summary = JSON.parse(fs.readFileSync('.signaler/AI-SUMMARY.json', 'utf8'));
          
          const comment = `## 🚀 Performance Audit Results
          
          **Framework:** ${{ matrix.framework }}
          **Audit Time:** ${summary.meta.elapsedMs}ms
          **Pages Audited:** ${summary.results.length}
          
          ### Key Metrics
          ${summary.results.map(r => 
            `- **${r.label}** (${r.device}): Performance ${r.scores.performance}/100`
          ).join('\n')}
          
          [View detailed report](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

### GitLab CI

```yaml
stages:
  - build
  - test
  - audit

variables:
  NODE_VERSION: "18"

audit:
  stage: audit
  image: node:${NODE_VERSION}
  
  before_script:
    - npm ci
    - npm run build
    - npm start &
    - npx wait-on http://localhost:3000
    - npm install -g @signaler/cli
  
  script:
    - signaler audit --ci --fail-on-budget
  
  artifacts:
    when: always
    paths:
      - .signaler/
    expire_in: 1 week
    reports:
      junit: .signaler/junit-report.xml
  
  only:
    - main
    - merge_requests
```

### Docker Integration

```dockerfile
# Dockerfile for audit runner
FROM node:18-alpine

# Install Chrome dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chrome path
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV CHROME_FLAGS="--no-sandbox --headless --disable-gpu --disable-dev-shm-usage"

WORKDIR /app

# Install Signaler
RUN npm install -g @signaler/cli

# Copy configuration
COPY apex.config.json .

# Run audit
CMD ["signaler", "audit", "--ci", "--no-color"]
```

These examples should help you integrate Signaler effectively with your chosen framework and deployment pipeline.