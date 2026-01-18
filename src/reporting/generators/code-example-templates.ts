/**
 * Code Example Templates
 * 
 * Provides framework-specific code examples for common performance optimizations
 * including Next.js dynamic imports, React code-splitting, image optimization,
 * and cache control middleware.
 */

export interface CodeTemplate {
  readonly framework: 'nextjs' | 'react' | 'vue' | 'angular' | 'generic';
  readonly category: 'dynamic-import' | 'code-splitting' | 'image-optimization' | 'cache-control' | 'compression';
  readonly title: string;
  readonly description: string;
  readonly before?: string;
  readonly after: string;
  readonly config?: string;
  readonly installation?: string;
  readonly notes?: readonly string[];
}

export class CodeExampleTemplates {
  /**
   * Get all available templates
   */
  getAllTemplates(): readonly CodeTemplate[] {
    return [
      ...this.getDynamicImportTemplates(),
      ...this.getCodeSplittingTemplates(),
      ...this.getImageOptimizationTemplates(),
      ...this.getCacheControlTemplates(),
      ...this.getCompressionTemplates()
    ];
  }

  /**
   * Get templates by framework
   */
  getTemplatesByFramework(framework: string): readonly CodeTemplate[] {
    return this.getAllTemplates().filter(template => 
      template.framework === framework || template.framework === 'generic'
    );
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): readonly CodeTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Dynamic import templates
   */
  private getDynamicImportTemplates(): readonly CodeTemplate[] {
    return [
      {
        framework: 'nextjs',
        category: 'dynamic-import',
        title: 'Next.js Dynamic Component Import',
        description: 'Use Next.js dynamic imports to code-split heavy components and reduce initial bundle size.',
        before: `import { HeavyChart } from './components/HeavyChart';
import { DataTable } from './components/DataTable';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart data={chartData} />
      <DataTable data={tableData} />
    </div>
  );
}`,
        after: `import dynamic from 'next/dynamic';
import { useState } from 'react';

// Dynamic imports with loading states
const HeavyChart = dynamic(() => import('./components/HeavyChart'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded" />,
  ssr: false // Disable SSR for client-only components
});

const DataTable = dynamic(() => import('./components/DataTable'), {
  loading: () => <div>Loading table...</div>
});

export default function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Conditional loading */}
      <button onClick={() => setShowChart(true)}>
        Show Chart
      </button>
      {showChart && <HeavyChart data={chartData} />}
      
      {/* Always load but with dynamic import */}
      <DataTable data={tableData} />
    </div>
  );
}`,
        notes: [
          'Use ssr: false for components that require browser APIs',
          'Provide meaningful loading states to improve UX',
          'Consider conditional loading for heavy components'
        ]
      },
      {
        framework: 'react',
        category: 'dynamic-import',
        title: 'React Lazy Loading with Suspense',
        description: 'Use React.lazy and Suspense for component-level code splitting.',
        before: `import HeavyComponent from './HeavyComponent';
import AnotherComponent from './AnotherComponent';

function App() {
  return (
    <div>
      <HeavyComponent />
      <AnotherComponent />
    </div>
  );
}`,
        after: `import { lazy, Suspense, useState } from 'react';

// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const AnotherComponent = lazy(() => import('./AnotherComponent'));

// Error boundary for lazy loading
function LazyErrorBoundary({ children }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {children}
    </Suspense>
  );
}

function App() {
  const [showHeavy, setShowHeavy] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowHeavy(!showHeavy)}>
        Toggle Heavy Component
      </button>
      
      {showHeavy && (
        <LazyErrorBoundary>
          <HeavyComponent />
        </LazyErrorBoundary>
      )}
      
      <LazyErrorBoundary>
        <AnotherComponent />
      </LazyErrorBoundary>
    </div>
  );
}`,
        notes: [
          'Always wrap lazy components in Suspense',
          'Consider error boundaries for better error handling',
          'Use meaningful fallback components'
        ]
      }
    ];
  }

  /**
   * Code splitting templates
   */
  private getCodeSplittingTemplates(): readonly CodeTemplate[] {
    return [
      {
        framework: 'nextjs',
        category: 'code-splitting',
        title: 'Next.js Route-Based Code Splitting',
        description: 'Leverage Next.js automatic code splitting with optimized page loading.',
        after: `// pages/dashboard/index.tsx
import dynamic from 'next/dynamic';
import { GetServerSideProps } from 'next';

// Split heavy dashboard components
const Analytics = dynamic(() => import('../../components/Analytics'));
const UserTable = dynamic(() => import('../../components/UserTable'));
const Charts = dynamic(() => import('../../components/Charts'), {
  ssr: false // Client-side only for chart libraries
});

interface DashboardProps {
  initialData: any;
}

export default function Dashboard({ initialData }: DashboardProps) {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {/* Critical above-the-fold content */}
      <div className="summary">
        <p>Welcome back! Here's your overview.</p>
      </div>
      
      {/* Lazy-loaded sections */}
      <Analytics data={initialData.analytics} />
      <UserTable users={initialData.users} />
      <Charts data={initialData.charts} />
    </div>
  );
}

// Server-side data fetching
export const getServerSideProps: GetServerSideProps = async (context) => {
  // Only fetch critical data on server
  const initialData = await fetchCriticalData();
  
  return {
    props: {
      initialData,
    },
  };
};`,
        config: `// next.config.js
module.exports = {
  experimental: {
    // Enable modern bundling
    esmExternals: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split vendor chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};`,
        notes: [
          'Next.js automatically splits pages into separate bundles',
          'Use dynamic imports for heavy components within pages',
          'Consider ISR for better performance with dynamic content'
        ]
      },
      {
        framework: 'react',
        category: 'code-splitting',
        title: 'Webpack Bundle Splitting',
        description: 'Configure Webpack for optimal bundle splitting in React applications.',
        config: `// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // Common code shared between chunks
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
        },
        // Large libraries (e.g., chart libraries)
        charts: {
          test: /[\\/]node_modules[\\/](chart\.js|d3|recharts)[\\/]/,
          name: 'charts',
          chunks: 'all',
          priority: 15,
        },
      },
    },
    // Generate runtime chunk
    runtimeChunk: {
      name: 'runtime',
    },
  },
};`,
        after: `// Dynamic imports with webpack magic comments
import { lazy } from 'react';

// Preload for better UX
const Dashboard = lazy(() => 
  import(
    /* webpackChunkName: "dashboard" */
    /* webpackPreload: true */
    './pages/Dashboard'
  )
);

// Prefetch for likely navigation
const Settings = lazy(() => 
  import(
    /* webpackChunkName: "settings" */
    /* webpackPrefetch: true */
    './pages/Settings'
  )
);

// Heavy library with separate chunk
const ChartComponent = lazy(() => 
  import(
    /* webpackChunkName: "charts" */
    './components/ChartComponent'
  )
);`,
        notes: [
          'Use webpackChunkName for better debugging',
          'webpackPreload for critical resources',
          'webpackPrefetch for likely future resources'
        ]
      }
    ];
  }

  /**
   * Image optimization templates
   */
  private getImageOptimizationTemplates(): readonly CodeTemplate[] {
    return [
      {
        framework: 'nextjs',
        category: 'image-optimization',
        title: 'Next.js Image Component Optimization',
        description: 'Use Next.js Image component for automatic optimization, lazy loading, and modern formats.',
        before: `<img 
  src="/hero-image.jpg" 
  alt="Hero image" 
  width="1200" 
  height="600" 
  style={{ width: '100%', height: 'auto' }}
/>`,
        after: `import Image from 'next/image';

// Hero image (above the fold)
<Image
  src="/hero-image.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // Load immediately
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
/>

// Gallery images (below the fold)
<Image
  src="/gallery-1.jpg"
  alt="Gallery image"
  width={400}
  height={300}
  loading="lazy" // Default behavior
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 400px"
/>

// Fill container (responsive)
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
  <Image
    src="/background.jpg"
    alt="Background"
    fill
    style={{ objectFit: 'cover' }}
    sizes="100vw"
  />
</div>`,
        config: `// next.config.js
module.exports = {
  images: {
    // External image domains
    domains: ['example.com', 'cdn.example.com'],
    
    // Modern formats (automatic conversion)
    formats: ['image/avif', 'image/webp'],
    
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    
    // Image sizes for different use cases
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Cache optimization
    minimumCacheTTL: 31536000, // 1 year
    
    // Quality settings
    quality: 75, // Default quality (1-100)
    
    // Loader configuration for custom CDNs
    loader: 'custom',
    loaderFile: './my-loader.js',
  },
};

// Custom loader (my-loader.js)
export default function myLoader({ src, width, quality }) {
  return \`https://cdn.example.com/\${src}?w=\${width}&q=\${quality || 75}\`;
}`,
        notes: [
          'Use priority for above-the-fold images',
          'Always provide alt text for accessibility',
          'Use appropriate sizes attribute for responsive images',
          'Consider blur placeholders for better UX'
        ]
      },
      {
        framework: 'generic',
        category: 'image-optimization',
        title: 'Modern Responsive Images',
        description: 'Implement responsive images with modern formats and lazy loading.',
        before: `<img src="hero.jpg" alt="Hero image" width="800" height="600">`,
        after: `<!-- Modern responsive image with multiple formats -->
<picture>
  <!-- AVIF format (best compression) -->
  <source
    srcset="
      hero-400.avif 400w,
      hero-800.avif 800w,
      hero-1200.avif 1200w,
      hero-1600.avif 1600w
    "
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
    type="image/avif"
  />
  
  <!-- WebP format (good compression, wide support) -->
  <source
    srcset="
      hero-400.webp 400w,
      hero-800.webp 800w,
      hero-1200.webp 1200w,
      hero-1600.webp 1600w
    "
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
    type="image/webp"
  />
  
  <!-- Fallback JPEG -->
  <img
    src="hero-800.jpg"
    srcset="
      hero-400.jpg 400w,
      hero-800.jpg 800w,
      hero-1200.jpg 1200w,
      hero-1600.jpg 1600w
    "
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
    alt="Hero image"
    loading="lazy"
    decoding="async"
    width="800"
    height="600"
  />
</picture>

<!-- Lazy loading with Intersection Observer -->
<script>
  // Lazy loading polyfill for older browsers
  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading supported
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
      img.src = img.dataset.src;
    });
  } else {
    // Fallback to Intersection Observer
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    
    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach(img => imageObserver.observe(img));
  }
</script>`,
        notes: [
          'Always provide multiple formats for better compression',
          'Use appropriate sizes attribute for bandwidth optimization',
          'Include width/height to prevent layout shift',
          'Consider lazy loading for below-the-fold images'
        ]
      }
    ];
  }

  /**
   * Cache control templates
   */
  private getCacheControlTemplates(): readonly CodeTemplate[] {
    return [
      {
        framework: 'nextjs',
        category: 'cache-control',
        title: 'Next.js API Route Caching',
        description: 'Implement proper caching headers for API routes and static assets.',
        after: `// pages/api/posts.js
export default async function handler(req, res) {
  // Set cache headers
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );
  
  try {
    const posts = await fetchPosts();
    
    // Add ETag for conditional requests
    const etag = generateETag(posts);
    res.setHeader('ETag', etag);
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
}

// Utility function for ETag generation
function generateETag(data) {
  const crypto = require('crypto');
  return crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
}`,
        config: `// next.config.js
module.exports = {
  async headers() {
    return [
      // Cache static assets
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache API responses
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};`,
        notes: [
          'Use s-maxage for CDN caching',
          'stale-while-revalidate for better UX',
          'ETags for conditional requests',
          'Immutable for versioned assets'
        ]
      },
      {
        framework: 'generic',
        category: 'cache-control',
        title: 'Express.js Caching Middleware',
        description: 'Implement comprehensive caching strategy with Express.js middleware.',
        after: `const express = require('express');
const redis = require('redis');
const app = express();
const client = redis.createClient();

// Cache middleware
function cacheMiddleware(duration = 300) {
  return async (req, res, next) => {
    const key = \`cache:\${req.originalUrl}\`;
    
    try {
      const cached = await client.get(key);
      
      if (cached) {
        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', \`public, max-age=\${duration}\`);
        return res.json(JSON.parse(cached));
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        // Cache the response
        client.setex(key, duration, JSON.stringify(data));
        
        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', \`public, max-age=\${duration}\`);
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
}

// Static file caching
app.use('/static', express.static('public', {
  maxAge: '1y', // 1 year for static assets
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes for HTML
    }
  }
}));

// API routes with caching
app.get('/api/posts', cacheMiddleware(300), async (req, res) => {
  const posts = await fetchPosts();
  res.json(posts);
});

// Dynamic content with shorter cache
app.get('/api/user/:id', cacheMiddleware(60), async (req, res) => {
  const user = await fetchUser(req.params.id);
  res.json(user);
});`,
        installation: `npm install redis express`,
        notes: [
          'Use Redis for distributed caching',
          'Set appropriate cache durations',
          'Include cache status in headers',
          'Handle cache errors gracefully'
        ]
      }
    ];
  }

  /**
   * Compression templates
   */
  private getCompressionTemplates(): readonly CodeTemplate[] {
    return [
      {
        framework: 'nextjs',
        category: 'compression',
        title: 'Next.js Compression Configuration',
        description: 'Enable and configure compression for Next.js applications.',
        config: `// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Enable gzip compression
  compress: true,
  
  // Optimize build output
  experimental: {
    optimizeCss: true,
    legacyBrowsers: false,
  },
  
  // Custom server configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Encoding',
            value: 'gzip',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
    ];
  },
  
  // Webpack optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Enable compression plugin
      const CompressionPlugin = require('compression-webpack-plugin');
      
      config.plugins.push(
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        })
      );
    }
    
    return config;
  },
});`,
        after: `// Custom server with compression (server.js)
const express = require('express');
const next = require('next');
const compression = require('compression');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  
  // Enable compression
  server.use(compression({
    level: 6, // Compression level (1-9)
    threshold: 1024, // Only compress files larger than 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      // Use compression for all requests
      return compression.filter(req, res);
    }
  }));
  
  // Handle all requests
  server.all('*', (req, res) => {
    return handle(req, res);
  });
  
  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});`,
        installation: `npm install compression compression-webpack-plugin`,
        notes: [
          'Next.js enables compression by default in production',
          'Use custom server for advanced compression settings',
          'Consider Brotli compression for better ratios'
        ]
      },
      {
        framework: 'generic',
        category: 'compression',
        title: 'Nginx Compression Configuration',
        description: 'Configure Nginx for optimal text compression with Gzip and Brotli.',
        after: `# nginx.conf - Basic compression setup
server {
    listen 80;
    server_name example.com;
    
    # Enable Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json;
    
    # Serve compressed files
    location / {
        try_files $uri $uri/ =404;
    }
}`,
        config: `# nginx.conf
server {
    listen 80;
    server_name example.com;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;
    
    # Brotli compression (requires ngx_brotli module)
    brotli on;
    brotli_comp_level 6;
    brotli_min_length 1024;
    brotli_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;
    
    # Static file caching
    location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # HTML files
    location ~* \\.html$ {
        expires 5m;
        add_header Cache-Control "public, must-revalidate";
        add_header Vary "Accept-Encoding";
    }
    
    # API responses
    location /api/ {
        expires 5m;
        add_header Cache-Control "public, must-revalidate";
        add_header Vary "Accept-Encoding";
        
        # Proxy to application server
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}`,
        notes: [
          'Brotli provides better compression than Gzip',
          'Set minimum file size to avoid over-compression',
          'Include Vary header for proper caching',
          'Configure appropriate compression levels'
        ]
      }
    ];
  }
}