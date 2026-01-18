/**
 * Actionable Recommendation Generator
 * 
 * Generates framework-specific code examples and step-by-step fix instructions
 * for performance issues identified in Lighthouse audits.
 */

import type { PageDeviceSummary, OpportunitySummary } from '../../core/types.js';

export interface ActionableRecommendation {
  readonly issueId: string;
  readonly title: string;
  readonly description: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly category: 'javascript' | 'css' | 'images' | 'caching' | 'network' | 'accessibility';
  readonly framework?: 'nextjs' | 'react' | 'vue' | 'angular' | 'generic';
  readonly implementation: {
    readonly difficulty: 'easy' | 'medium' | 'hard';
    readonly estimatedTimeMinutes: number;
    readonly steps: readonly string[];
    readonly codeExample?: string;
    readonly configExample?: string;
    readonly documentation: readonly string[];
  };
  readonly impact: {
    readonly performanceGainMs?: number;
    readonly byteSavings?: number;
    readonly affectedPages: number;
  };
}

export interface RecommendationContext {
  readonly framework?: string;
  readonly buildTool?: string;
  readonly hasTypeScript?: boolean;
  readonly hasNextConfig?: boolean;
  readonly packageManager?: 'npm' | 'yarn' | 'pnpm';
}

export class ActionableRecommendationGenerator {
  private readonly frameworkDetectors = new Map<string, RegExp>([
    ['nextjs', /next\.config\.|pages\/|app\/|_app\.|_document\./],
    ['react', /react|jsx|tsx/],
    ['vue', /\.vue$|vue\.config/],
    ['angular', /angular\.json|\.component\.|\.module\./]
  ]);

  /**
   * Generate actionable recommendations from audit results
   */
  generateRecommendations(
    results: readonly PageDeviceSummary[],
    context?: RecommendationContext
  ): readonly ActionableRecommendation[] {
    const recommendations: ActionableRecommendation[] = [];
    const issueMap = new Map<string, OpportunitySummary[]>();

    // Aggregate issues across all pages
    for (const result of results) {
      for (const opportunity of result.opportunities) {
        if (!issueMap.has(opportunity.id)) {
          issueMap.set(opportunity.id, []);
        }
        issueMap.get(opportunity.id)!.push(opportunity);
      }
    }

    // Generate recommendations for each issue type
    for (const [issueId, opportunities] of issueMap) {
      const recommendation = this.createRecommendation(
        issueId,
        opportunities,
        context || this.detectFramework(results)
      );
      
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Sort by impact (performance gain * affected pages)
    return recommendations.sort((a, b) => {
      const impactA = (a.impact.performanceGainMs || 0) * a.impact.affectedPages;
      const impactB = (b.impact.performanceGainMs || 0) * b.impact.affectedPages;
      return impactB - impactA;
    });
  }

  /**
   * Detect framework from audit results
   */
  private detectFramework(results: readonly PageDeviceSummary[]): RecommendationContext {
    const paths = results.map(r => r.path).join(' ');
    
    for (const [framework, pattern] of this.frameworkDetectors) {
      if (pattern.test(paths)) {
        return {
          framework,
          hasTypeScript: /\.tsx?$/.test(paths),
          packageManager: 'npm' // Default, could be enhanced with detection
        };
      }
    }

    return { framework: 'generic' };
  }

  /**
   * Create recommendation for specific issue type
   */
  private createRecommendation(
    issueId: string,
    opportunities: readonly OpportunitySummary[],
    context: RecommendationContext
  ): ActionableRecommendation | null {
    const totalSavingsMs = opportunities.reduce((sum, opp) => sum + (opp.estimatedSavingsMs || 0), 0);
    const totalSavingsBytes = opportunities.reduce((sum, opp) => sum + (opp.estimatedSavingsBytes || 0), 0);
    const affectedPages = opportunities.length;

    switch (issueId) {
      case 'unused-javascript':
        return this.createUnusedJavaScriptRecommendation(totalSavingsMs, totalSavingsBytes, affectedPages, context);
      
      case 'render-blocking-resources':
        return this.createRenderBlockingRecommendation(totalSavingsMs, totalSavingsBytes, affectedPages, context);
      
      case 'unoptimized-images':
      case 'modern-image-formats':
        return this.createImageOptimizationRecommendation(totalSavingsMs, totalSavingsBytes, affectedPages, context);
      
      case 'unused-css-rules':
        return this.createUnusedCSSRecommendation(totalSavingsMs, totalSavingsBytes, affectedPages, context);
      
      case 'server-response-time':
        return this.createServerResponseRecommendation(totalSavingsMs, totalSavingsBytes, affectedPages, context);
      
      case 'uses-text-compression':
        return this.createCompressionRecommendation(totalSavingsMs, totalSavingsBytes, affectedPages, context);
      
      default:
        return this.createGenericRecommendation(issueId, opportunities[0]?.title || issueId, totalSavingsMs, totalSavingsBytes, affectedPages, context);
    }
  }

  /**
   * Create unused JavaScript recommendation
   */
  private createUnusedJavaScriptRecommendation(
    savingsMs: number,
    savingsBytes: number,
    affectedPages: number,
    context: RecommendationContext
  ): ActionableRecommendation {
    const isNextJS = context.framework === 'nextjs';
    const isTypeScript = context.hasTypeScript;
    const ext = isTypeScript ? 'tsx' : 'jsx';

    return {
      issueId: 'unused-javascript',
      title: 'Remove Unused JavaScript',
      description: 'Eliminate unused JavaScript code to reduce bundle size and improve loading performance.',
      severity: savingsBytes > 100000 ? 'critical' : savingsBytes > 50000 ? 'high' : 'medium',
      category: 'javascript',
      framework: context.framework as any,
      implementation: {
        difficulty: isNextJS ? 'easy' : 'medium',
        estimatedTimeMinutes: isNextJS ? 30 : 60,
        steps: isNextJS ? [
          'Identify unused components and utilities',
          'Implement dynamic imports for large components',
          'Use Next.js built-in code splitting',
          'Remove unused dependencies from package.json',
          'Verify bundle size reduction with next/bundle-analyzer'
        ] : [
          'Analyze bundle with webpack-bundle-analyzer',
          'Identify unused code with tree-shaking',
          'Implement dynamic imports for large modules',
          'Remove unused dependencies',
          'Configure webpack for better tree-shaking'
        ],
        codeExample: isNextJS ? `// Before: Static import
import { HeavyComponent } from './HeavyComponent';

// After: Dynamic import
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false // Optional: disable SSR for client-only components
});

// Usage in component
export default function MyPage() {
  const [showHeavy, setShowHeavy] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowHeavy(true)}>
        Load Heavy Component
      </button>
      {showHeavy && <HeavyComponent />}
    </div>
  );
}` : `// Dynamic import with React.lazy
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function MyComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}`,
        configExample: isNextJS ? `// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    // Enable tree shaking
    config.optimization.usedExports = true;
    return config;
  },
});` : undefined,
        documentation: [
          isNextJS 
            ? 'https://nextjs.org/docs/advanced-features/dynamic-import'
            : 'https://react.dev/reference/react/lazy',
          'https://webpack.js.org/guides/tree-shaking/',
          'https://web.dev/reduce-unused-javascript/'
        ]
      },
      impact: {
        performanceGainMs: savingsMs,
        byteSavings: savingsBytes,
        affectedPages
      }
    };
  }

  /**
   * Create render-blocking resources recommendation
   */
  private createRenderBlockingRecommendation(
    savingsMs: number,
    savingsBytes: number,
    affectedPages: number,
    context: RecommendationContext
  ): ActionableRecommendation {
    const isNextJS = context.framework === 'nextjs';

    return {
      issueId: 'render-blocking-resources',
      title: 'Eliminate Render-Blocking Resources',
      description: 'Defer or inline critical CSS and JavaScript to improve First Contentful Paint.',
      severity: savingsMs > 1000 ? 'critical' : savingsMs > 500 ? 'high' : 'medium',
      category: 'css',
      framework: context.framework as any,
      implementation: {
        difficulty: 'medium',
        estimatedTimeMinutes: 45,
        steps: [
          'Identify critical CSS for above-the-fold content',
          'Inline critical CSS in document head',
          'Defer non-critical CSS loading',
          'Use preload hints for important resources',
          'Optimize font loading strategy'
        ],
        codeExample: isNextJS ? `// pages/_document.${context.hasTypeScript ? 'tsx' : 'js'}
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Inline critical CSS */}
        <style dangerouslySetInnerHTML={{
          __html: \`
            body { margin: 0; font-family: Inter, sans-serif; }
            .hero { min-height: 100vh; display: flex; align-items: center; }
          \`
        }} />
        
        {/* Defer non-critical CSS */}
        <link
          rel="preload"
          href="/styles/non-critical.css"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}` : `// Critical CSS inlining
const criticalCSS = \`
  body { margin: 0; font-family: system-ui, sans-serif; }
  .hero { min-height: 100vh; display: flex; align-items: center; }
\`;

// Inject into document head
const style = document.createElement('style');
style.textContent = criticalCSS;
document.head.appendChild(style);

// Defer non-critical CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/styles/main.css';
link.media = 'print';
link.onload = () => { link.media = 'all'; };
document.head.appendChild(link);`,
        documentation: [
          'https://web.dev/extract-critical-css/',
          'https://web.dev/defer-non-critical-css/',
          isNextJS ? 'https://nextjs.org/docs/basic-features/font-optimization' : 'https://web.dev/font-display/'
        ]
      },
      impact: {
        performanceGainMs: savingsMs,
        byteSavings: savingsBytes,
        affectedPages
      }
    };
  }

  /**
   * Create image optimization recommendation
   */
  private createImageOptimizationRecommendation(
    savingsMs: number,
    savingsBytes: number,
    affectedPages: number,
    context: RecommendationContext
  ): ActionableRecommendation {
    const isNextJS = context.framework === 'nextjs';

    return {
      issueId: 'image-optimization',
      title: 'Optimize Images',
      description: 'Use modern image formats, proper sizing, and lazy loading to reduce bandwidth usage.',
      severity: savingsBytes > 500000 ? 'critical' : savingsBytes > 200000 ? 'high' : 'medium',
      category: 'images',
      framework: context.framework as any,
      implementation: {
        difficulty: isNextJS ? 'easy' : 'medium',
        estimatedTimeMinutes: isNextJS ? 20 : 45,
        steps: isNextJS ? [
          'Replace <img> tags with Next.js Image component',
          'Configure image domains in next.config.js',
          'Set appropriate sizes for responsive images',
          'Enable automatic WebP/AVIF conversion',
          'Implement lazy loading for below-fold images'
        ] : [
          'Convert images to WebP/AVIF formats',
          'Implement responsive images with srcset',
          'Add lazy loading attributes',
          'Optimize image dimensions',
          'Set up image CDN or optimization service'
        ],
        codeExample: isNextJS ? `// Before: Regular img tag
<img src="/hero.jpg" alt="Hero image" width="800" height="600" />

// After: Next.js Image component
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={800}
  height={600}
  priority // For above-the-fold images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
/>

// For responsive images
<Image
  src="/hero.jpg"
  alt="Hero image"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  style={{ objectFit: 'cover' }}
/>` : `<!-- Modern responsive images -->
<picture>
  <source
    srcset="/hero-800.avif 800w, /hero-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    type="image/avif"
  />
  <source
    srcset="/hero-800.webp 800w, /hero-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    type="image/webp"
  />
  <img
    src="/hero-800.jpg"
    srcset="/hero-800.jpg 800w, /hero-1200.jpg 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    alt="Hero image"
    loading="lazy"
    decoding="async"
  />
</picture>`,
        configExample: isNextJS ? `// next.config.js
module.exports = {
  images: {
    domains: ['example.com', 'cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },
};` : undefined,
        documentation: [
          isNextJS 
            ? 'https://nextjs.org/docs/basic-features/image-optimization'
            : 'https://web.dev/serve-responsive-images/',
          'https://web.dev/uses-webp-images/',
          'https://web.dev/browser-level-image-lazy-loading/'
        ]
      },
      impact: {
        performanceGainMs: savingsMs,
        byteSavings: savingsBytes,
        affectedPages
      }
    };
  }

  /**
   * Create unused CSS recommendation
   */
  private createUnusedCSSRecommendation(
    savingsMs: number,
    savingsBytes: number,
    affectedPages: number,
    context: RecommendationContext
  ): ActionableRecommendation {
    return {
      issueId: 'unused-css',
      title: 'Remove Unused CSS',
      description: 'Eliminate unused CSS rules to reduce stylesheet size and improve loading performance.',
      severity: savingsBytes > 50000 ? 'high' : 'medium',
      category: 'css',
      framework: context.framework as any,
      implementation: {
        difficulty: 'medium',
        estimatedTimeMinutes: 40,
        steps: [
          'Analyze CSS usage with PurgeCSS or similar tools',
          'Remove unused CSS rules and selectors',
          'Implement CSS-in-JS for component-specific styles',
          'Use CSS modules for better scoping',
          'Set up automated CSS purging in build process'
        ],
        codeExample: `// PurgeCSS configuration
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  css: ['./styles/**/*.css'],
  defaultExtractor: content => content.match(/[\\w-/:]+(?<!:)/g) || [],
  safelist: ['html', 'body', /^__next/],
};

// CSS Modules approach
import styles from './Component.module.css';

export default function Component() {
  return <div className={styles.container}>Content</div>;
}`,
        documentation: [
          'https://purgecss.com/',
          'https://web.dev/remove-unused-css/',
          'https://nextjs.org/docs/basic-features/built-in-css-support#css-modules'
        ]
      },
      impact: {
        performanceGainMs: savingsMs,
        byteSavings: savingsBytes,
        affectedPages
      }
    };
  }

  /**
   * Create server response time recommendation
   */
  private createServerResponseRecommendation(
    savingsMs: number,
    savingsBytes: number,
    affectedPages: number,
    context: RecommendationContext
  ): ActionableRecommendation {
    const isNextJS = context.framework === 'nextjs';

    return {
      issueId: 'server-response-time',
      title: 'Improve Server Response Time',
      description: 'Optimize server-side processing and database queries to reduce Time to First Byte (TTFB).',
      severity: savingsMs > 2000 ? 'critical' : savingsMs > 1000 ? 'high' : 'medium',
      category: 'network',
      framework: context.framework as any,
      implementation: {
        difficulty: 'hard',
        estimatedTimeMinutes: 120,
        steps: [
          'Profile server-side code for bottlenecks',
          'Optimize database queries and add indexes',
          'Implement caching strategies',
          'Use CDN for static assets',
          'Consider server-side rendering optimizations'
        ],
        codeExample: isNextJS ? `// API route optimization
export default async function handler(req, res) {
  // Add caching headers
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  
  try {
    // Use connection pooling
    const data = await db.query('SELECT * FROM posts WHERE published = true');
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ISR for static generation
export async function getStaticProps() {
  const data = await fetchData();
  
  return {
    props: { data },
    revalidate: 60, // Regenerate every 60 seconds
  };
}` : `// Express.js optimization
const express = require('express');
const redis = require('redis');
const client = redis.createClient();

app.get('/api/data', async (req, res) => {
  const cacheKey = 'api:data';
  
  // Check cache first
  const cached = await client.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Fetch from database
  const data = await db.query('SELECT * FROM posts');
  
  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(data));
  
  res.json(data);
});`,
        documentation: [
          'https://web.dev/time-to-first-byte/',
          'https://web.dev/reduce-server-response-times/',
          isNextJS ? 'https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration' : 'https://expressjs.com/en/advanced/best-practice-performance.html'
        ]
      },
      impact: {
        performanceGainMs: savingsMs,
        byteSavings: savingsBytes,
        affectedPages
      }
    };
  }

  /**
   * Create compression recommendation
   */
  private createCompressionRecommendation(
    savingsMs: number,
    savingsBytes: number,
    affectedPages: number,
    context: RecommendationContext
  ): ActionableRecommendation {
    return {
      issueId: 'text-compression',
      title: 'Enable Text Compression',
      description: 'Use Gzip or Brotli compression to reduce the size of text-based resources.',
      severity: savingsBytes > 100000 ? 'high' : 'medium',
      category: 'network',
      framework: context.framework as any,
      implementation: {
        difficulty: 'easy',
        estimatedTimeMinutes: 15,
        steps: [
          'Configure server to enable Gzip/Brotli compression',
          'Verify compression is working for text assets',
          'Set appropriate compression levels',
          'Test compression effectiveness',
          'Monitor compression ratios'
        ],
        configExample: `// Next.js (next.config.js)
module.exports = {
  compress: true, // Enable gzip compression
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Encoding',
            value: 'gzip',
          },
        ],
      },
    ];
  },
};

// Nginx configuration
server {
  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/xml+rss
    application/json;
  
  # Brotli compression (if module available)
  brotli on;
  brotli_comp_level 6;
  brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}`,
        documentation: [
          'https://web.dev/uses-text-compression/',
          'https://nextjs.org/docs/api-reference/next.config.js/compression',
          'https://nginx.org/en/docs/http/ngx_http_gzip_module.html'
        ]
      },
      impact: {
        performanceGainMs: savingsMs,
        byteSavings: savingsBytes,
        affectedPages
      }
    };
  }

  /**
   * Create generic recommendation for unknown issue types
   */
  private createGenericRecommendation(
    issueId: string,
    title: string,
    savingsMs: number,
    savingsBytes: number,
    affectedPages: number,
    context: RecommendationContext
  ): ActionableRecommendation {
    return {
      issueId,
      title: title || 'Performance Optimization',
      description: 'Address this performance issue to improve loading times and user experience.',
      severity: savingsMs > 1000 ? 'high' : 'medium',
      category: 'network',
      framework: context.framework as any,
      implementation: {
        difficulty: 'medium',
        estimatedTimeMinutes: 60,
        steps: [
          'Analyze the specific issue in Lighthouse report',
          'Research best practices for this optimization',
          'Implement the recommended changes',
          'Test the impact on performance',
          'Monitor for regressions'
        ],
        documentation: [
          'https://web.dev/performance/',
          'https://developers.google.com/web/tools/lighthouse'
        ]
      },
      impact: {
        performanceGainMs: savingsMs,
        byteSavings: savingsBytes,
        affectedPages
      }
    };
  }
}