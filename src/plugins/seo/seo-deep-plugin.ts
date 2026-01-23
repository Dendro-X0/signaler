
import type { Page } from 'playwright';
import type {
    AuditPlugin,
    AuditContext,
    AuditResult,
    PluginConfig,
    Issue,
    IssueSeverity,
    FixGuidance,
} from '../../core/plugin-interface.js';

type SEOData = {
    title?: string;
    description?: string;
    canonical?: string;
    robots?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    structuredData: any[];
    h1Count: number;
};

type SEOMetrics = {
    hasTitle: number;
    hasDescription: number;
    hasCanonical: number;
    hasStructuredData: number;
    hasOpenGraph: number;
    metaDescriptionLength: number;
};

/**
 * SEO Deep Dive Plugin
 * 
 * Analyzes pages for Search Engine Optimization best practices:
 * - Meta tags (Title, Description, Robots)
 * - Canonical URLs
 * - Open Graph & Twitter Card data
 * - Structured Data (JSON-LD)
 * - Heading hierarchy (H1 checks)
 */
export class SEODeepPlugin implements AuditPlugin {
    public readonly name = 'seo-deep';
    public readonly version = '1.0.0';
    public readonly type = 'seo' as const;
    public readonly phase = 3 as const;
    public readonly dependencies: readonly string[] = ['lighthouse'];

    private config: PluginConfig = {
        enabled: true,
        settings: {
            minDescriptionLength: 50,
            maxDescriptionLength: 160,
        },
    };

    public async configure(config: PluginConfig): Promise<void> {
        this.config = config;
    }

    public validate(config: PluginConfig): boolean {
        return config.enabled === true;
    }

    public async audit(context: AuditContext): Promise<AuditResult> {
        const startTime = Date.now();
        const issues: Issue[] = [];
        const { page } = context;

        try {
            const seoData = await this.collectSEOData(page);
            const metrics = this.analyzeSEO(seoData, issues, context.url);

            return {
                pluginName: this.name,
                type: this.type,
                issues,
                metrics: metrics as unknown as Record<string, number>,
                metadata: {
                    title: seoData.title,
                },
                executionTimeMs: Date.now() - startTime,
                success: true,
            };
        } catch (error) {
            console.error('SEO audit failed:', error);
            return {
                pluginName: this.name,
                type: this.type,
                issues: [],
                metrics: {},
                metadata: {},
                executionTimeMs: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    public async cleanup(): Promise<void> {
        // cleanup
    }

    private async collectSEOData(page: Page): Promise<SEOData> {
        return page.evaluate(() => {
            const getMeta = (name: string) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || undefined;
            const getProperty = (property: string) => document.querySelector(`meta[property="${property}"]`)?.getAttribute('content') || undefined;

            const structuredData = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                .map(script => {
                    try {
                        return JSON.parse(script.textContent || '{}');
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);

            return {
                title: document.title,
                description: getMeta('description'),
                canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined,
                robots: getMeta('robots'),
                ogTitle: getProperty('og:title'),
                ogDescription: getProperty('og:description'),
                ogImage: getProperty('og:image'),
                twitterCard: getMeta('twitter:card'),
                structuredData,
                h1Count: document.querySelectorAll('h1').length,
            };
        });
    }

    private analyzeSEO(data: SEOData, issues: Issue[], pageUrl: string): SEOMetrics {
        const metrics: SEOMetrics = {
            hasTitle: data.title ? 1 : 0,
            hasDescription: data.description ? 1 : 0,
            hasCanonical: data.canonical ? 1 : 0,
            hasStructuredData: data.structuredData.length > 0 ? 1 : 0,
            hasOpenGraph: (data.ogTitle && data.ogImage) ? 1 : 0,
            metaDescriptionLength: data.description?.length || 0,
        };

        // Title Check
        if (!data.title) {
            issues.push({
                id: 'seo-title',
                type: 'seo',
                severity: 'critical',
                impact: 100,
                title: 'Page missing title tag',
                description: 'The page has no <title> tag, which is essential for search results.',
                affectedPages: [pageUrl],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '5m',
                    implementation: 'Add a <title> tag to the <head> of the document.',
                    codeExample: '<title>Page Title</title>',
                    resources: ['https://moz.com/learn/seo/title-tag'],
                },
            });
        } else if (data.title.length < 10 || data.title.length > 70) {
            issues.push({
                id: 'seo-title-length',
                type: 'seo',
                severity: 'low',
                impact: 20,
                title: 'Title length optimization',
                description: `Page title is ${data.title.length} characters. Recommended length is between 10 and 60-70 characters.`,
                affectedPages: [pageUrl],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '5m',
                    implementation: 'Update the title tag to be descriptive but concise.',
                    resources: ['https://moz.com/learn/seo/title-tag'],
                },
            });
        }

        // Meta Description Check
        if (!data.description) {
            issues.push({
                id: 'seo-description',
                type: 'seo',
                severity: 'high',
                impact: 80,
                title: 'Page missing meta description',
                description: 'The page has no meta description, which influences click-through rates in search results.',
                affectedPages: [pageUrl],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '10m',
                    implementation: 'Add a <meta name="description"> tag to the <head>.',
                    codeExample: '<meta name="description" content="Detailed page description...">',
                    resources: ['https://moz.com/learn/seo/meta-description'],
                },
            });
        }

        // Canonical URL Check
        if (!data.canonical) {
            issues.push({
                id: 'seo-canonical',
                type: 'seo',
                severity: 'medium',
                impact: 50,
                title: 'Page missing canonical URL',
                description: 'A canonical URL helps search engines understand the preferred version of a page.',
                affectedPages: [pageUrl],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '5m',
                    implementation: 'Add a <link rel="canonical"> tag pointing to the original URL of this content.',
                    codeExample: `<link rel="canonical" href="${pageUrl}">`,
                    resources: ['https://developers.google.com/search/docs/crawling-indexing/canonicalization'],
                },
            });
        }

        // H1 Check
        if (data.h1Count === 0) {
            issues.push({
                id: 'seo-h1-missing',
                type: 'seo',
                severity: 'high',
                impact: 70,
                title: 'Page missing H1 heading',
                description: 'An <h1> tag is important for signaling the main topic of the page to search engines.',
                affectedPages: [pageUrl],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '5m',
                    implementation: 'Add one <h1> tag representing the main page title.',
                    resources: ['https://moz.com/learn/seo/h1-tag'],
                },
            });
        } else if (data.h1Count > 1) {
            issues.push({
                id: 'seo-h1-multiple',
                type: 'seo',
                severity: 'medium',
                impact: 30,
                title: 'Multiple H1 headings found',
                description: `Found ${data.h1Count} <h1> tags. Best practice is to have exactly one H1 per page.`,
                affectedPages: [pageUrl],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '10m',
                    implementation: 'Ensure only the main title uses <h1>, and use <h2>-<h6> for subsections.',
                    resources: ['https://developers.google.com/style/headings'],
                },
            });
        }

        // Structured Data Check
        if (data.structuredData.length === 0) {
            issues.push({
                id: 'seo-structured-data',
                type: 'seo',
                severity: 'low',
                impact: 30,
                title: 'No structured data found',
                description: 'Structured data (JSON-LD) helps search engines understand page content and can enable rich snippets.',
                affectedPages: [pageUrl],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '30m',
                    implementation: 'Add JSON-LD structured data (e.g., Article, Product, Organization) to the page.',
                    codeExample: '<script type="application/ld+json">{ "@context": "https://schema.org", ... }</script>',
                    resources: ['https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data'],
                },
            });
        }

        return metrics;
    }
}
