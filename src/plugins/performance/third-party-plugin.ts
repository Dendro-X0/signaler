
import type { Page } from 'playwright';
import type {
    AuditPlugin,
    AuditContext,
    AuditResult,
    PluginConfig,
    Issue,
    FixGuidance,
} from '../../core/plugin-interface.js';

/**
 * Third-party resource details
 */
interface ResourceDetail {
    url: string;
    domain: string;
    initiatorType: string;
    transferSize: number;
    duration: number;
    isThirdParty: boolean;
}

/**
 * Grouped third-party data
 */
interface ThirdPartySummary {
    domain: string;
    requestCount: number;
    totalBytes: number;
    totalDuration: number;
    category?: string;
    isBlocking: boolean;
}

/**
 * Third-Party Script Audit Plugin
 * 
 * Analyzes third-party scripts and their impact on performance and privacy:
 * - Identify third-party domains and request counts
 * - Measure performance cost (bytes, execution time)
 * - Detect render-blocking third-party scripts
 * - Categorize common third-party services
 * - Suggest lighter alternatives
 */
export class ThirdPartyPlugin implements AuditPlugin {
    public readonly name = 'third-party-scripts';
    public readonly version = '1.0.0';
    public readonly type = 'performance' as const;
    public readonly phase = 4 as const;
    public readonly dependencies: readonly string[] = ['lighthouse'];

    private config: PluginConfig = {
        enabled: true,
        settings: {
            blockingThresholdMs: 100,
            largeResourceThresholdBytes: 50000,
        },
    };

    /**
     * Known third-party categories and their domains
     */
    private static readonly CATEGORIES: Record<string, string[]> = {
        'Analytics': ['google-analytics.com', 'googletagmanager.com', 'hotjar.com', 'mixpanel.com'],
        'Advertising': ['doubleclick.net', 'facebook.net', 'googleadservices.com', 'adnxs.com'],
        'Customer Success': ['intercom.com', 'zendesk.com', 'drift.com', 'hubspot.com'],
        'Social': ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com'],
        'Utilities': ['fontawesome.com', 'gstatic.com', 'googleapis.com', 'cloudflare.com'],
    };

    /**
     * Configure the plugin
     */
    public async configure(config: PluginConfig): Promise<void> {
        this.config = {
            ...this.config,
            ...config,
            settings: {
                ...this.config.settings,
                ...config.settings,
            },
        };
    }

    /**
     * Validate the configuration
     */
    public validate(config: PluginConfig): boolean {
        return !!config;
    }

    /**
     * Run the audit
     */
    public async audit(context: AuditContext): Promise<AuditResult> {
        const startTime = Date.now();
        const issues: Issue[] = [];
        const { page, url: mainUrl } = context;

        try {
            const resources = await this.collectResourceData(page, mainUrl);
            const thirdParties = this.groupThirdParties(resources);
            const metrics = this.analyzeThirdParties(thirdParties, issues, mainUrl);

            return {
                pluginName: this.name,
                type: this.type,
                issues,
                metrics: metrics as unknown as Record<string, number>,
                metadata: {
                    thirdPartyDomains: thirdParties.map(tp => tp.domain),
                    totalThirdPartyBytes: thirdParties.reduce((sum, tp) => sum + tp.totalBytes, 0),
                },
                executionTimeMs: Date.now() - startTime,
                success: true,
            };
        } catch (error) {
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

    /**
     * Cleanup resources
     */
    public async cleanup(): Promise<void> {
        // No resources to clean up
    }

    /**
     * Collect resource timing data from the page
     */
    private async collectResourceData(page: Page, mainUrl: string): Promise<ResourceDetail[]> {
        const mainDomain = new URL(mainUrl).hostname;

        return page.evaluate((domain) => {
            const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            return entries.map(entry => {
                let entryDomain = '';
                try {
                    entryDomain = new URL(entry.name).hostname;
                } catch {
                    // Handle relative URLs
                    entryDomain = domain;
                }

                return {
                    url: entry.name,
                    domain: entryDomain,
                    initiatorType: entry.initiatorType,
                    transferSize: entry.transferSize || 0,
                    duration: entry.duration,
                    isThirdParty: entryDomain !== domain && !entryDomain.endsWith(`.${domain}`),
                };
            });
        }, mainDomain);
    }

    /**
     * Group resources by domain
     */
    private groupThirdParties(resources: ResourceDetail[]): ThirdPartySummary[] {
        const groups = new Map<string, ThirdPartySummary>();

        for (const res of resources) {
            if (!res.isThirdParty) continue;

            let summary = groups.get(res.domain);
            if (!summary) {
                summary = {
                    domain: res.domain,
                    requestCount: 0,
                    totalBytes: 0,
                    totalDuration: 0,
                    isBlocking: res.initiatorType === 'script' || res.initiatorType === 'link',
                    category: this.identifyCategory(res.domain),
                };
                groups.set(res.domain, summary);
            }

            summary.requestCount++;
            summary.totalBytes += res.transferSize;
            summary.totalDuration += res.duration;
        }

        return Array.from(groups.values());
    }

    /**
     * Identify category based on domain
     */
    private identifyCategory(domain: string): string | undefined {
        for (const [category, domains] of Object.entries(ThirdPartyPlugin.CATEGORIES)) {
            if (domains.some(d => domain.includes(d))) {
                return category;
            }
        }
        return undefined;
    }

    /**
     * Analyze third-party impact and generate issues
     */
    private analyzeThirdParties(thirdParties: ThirdPartySummary[], issues: Issue[], url: string): Record<string, number> {
        const totalBytes = thirdParties.reduce((sum, tp) => sum + tp.totalBytes, 0);
        const totalRequests = thirdParties.reduce((sum, tp) => sum + tp.requestCount, 0);

        // Issue: Too many third-party scripts
        if (totalRequests > 20) {
            issues.push({
                id: 'performance-too-many-third-parties',
                type: 'performance',
                severity: 'medium',
                impact: 60,
                title: 'High number of third-party requests',
                description: `Found ${totalRequests} requests to ${thirdParties.length} third-party domains. Excessive third-party scripts can significantly slow down page load and affect privacy.`,
                affectedPages: [url],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '2h',
                    implementation: 'Audit third-party scripts and remove those that are not strictly necessary. Consider self-hosting critical assets.',
                    resources: ['https://web.dev/identify-slow-third-party-scripts/'],
                },
                metadata: { totalRequests, domainCount: thirdParties.length },
            });
        }

        // Issue: Large third-party payload
        const threshold = this.config.settings.largeResourceThresholdBytes as number || 500000;
        if (totalBytes > threshold) {
            issues.push({
                id: 'performance-large-third-party-payload',
                type: 'performance',
                severity: 'high',
                impact: 70,
                title: 'Large third-party payload size',
                description: `Third-party resources account for ${(totalBytes / 1024).toFixed(1)}KB of data.`,
                affectedPages: [url],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '1h',
                    implementation: 'Reduce the weight of third-party scripts. Use lighter alternatives or defer loading using "async" or "defer" attributes.',
                    resources: ['https://web.dev/efficiently-load-third-party-javascript/'],
                },
                metadata: { totalBytes },
            });
        }

        // Issue: Blocking third-party scripts
        const blockingTp = thirdParties.filter(tp => tp.isBlocking && tp.totalDuration > (this.config.settings.blockingThresholdMs as number));
        if (blockingTp.length > 0) {
            issues.push({
                id: 'performance-blocking-third-parties',
                type: 'performance',
                severity: 'high',
                impact: 85,
                title: 'Render-blocking third-party scripts',
                description: `Found ${blockingTp.length} third-party domains providing scripts that may be render-blocking: ${blockingTp.map(tp => tp.domain).join(', ')}.`,
                affectedPages: [url],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '30m',
                    implementation: 'Ensure third-party scripts use "async" or "defer" attributes to prevent them from blocking the main thread.',
                    codeExample: '<script src="https://example.com/script.js" async></script>',
                    resources: ['https://web.dev/render-blocking-resources/'],
                },
            });
        }

        return {
            thirdPartyCount: thirdParties.length,
            thirdPartyRequests: totalRequests,
            thirdPartyBytes: totalBytes,
        };
    }
}
