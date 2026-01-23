
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

type FontDetails = {
    family: string;
    status: string; // 'loaded' | 'loading' | 'error' | 'unloaded'
    display?: string; // from @font-face if accessible
    source?: string;
};

type FontMetrics = {
    totalFonts: number;
    googleFontsWithoutDisplay: number;
    missingPreconnect: number;
};

/**
 * Font Performance Plugin
 * 
 * Analyzes font loading strategies:
 * - Google Fonts display=swap check
 * - Preconnect usage for font origins
 * - Font loading status
 */
export class FontPerformancePlugin implements AuditPlugin {
    public readonly name = 'font-performance';
    public readonly version = '1.0.0';
    public readonly type = 'performance' as const;
    public readonly phase = 2 as const;
    public readonly dependencies: readonly string[] = ['lighthouse'];

    private config: PluginConfig = {
        enabled: true,
        settings: {},
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
        const metrics: FontMetrics = {
            totalFonts: 0,
            googleFontsWithoutDisplay: 0,
            missingPreconnect: 0,
        };

        try {
            await this.checkGoogleFonts(page, issues, metrics);
            await this.checkPreconnect(page, issues, metrics);

            // Collect loaded fonts count
            metrics.totalFonts = await page.evaluate(() => {
                // @ts-ignore
                return document.fonts ? document.fonts.size : 0;
            });

            return {
                pluginName: this.name,
                type: this.type,
                issues,
                metrics: metrics as unknown as Record<string, number>,
                metadata: {},
                executionTimeMs: Date.now() - startTime,
                success: true,
            };
        } catch (error) {
            console.error('Font performance audit failed:', error);
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

    private async checkGoogleFonts(page: Page, issues: Issue[], metrics: FontMetrics): Promise<void> {
        const googleFontLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'));
            return links.map(link => (link as HTMLLinkElement).href);
        });

        const badLinks = googleFontLinks.filter(url => !url.includes('display=swap'));

        if (badLinks.length > 0) {
            metrics.googleFontsWithoutDisplay = badLinks.length;
            issues.push({
                id: 'font-display-swap',
                type: 'performance',
                severity: 'medium',
                impact: 50,
                title: 'Ensure text remains visible during webfont load',
                description: `Found ${badLinks.length} Google Font links missing the 'display=swap' parameter, which can cause invisible text (FOIT) while fonts load.`,
                affectedPages: [badLinks[0]],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '5m',
                    implementation: 'Add &display=swap to the end of your Google Fonts URLs.',
                    codeExample: '<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">',
                    resources: ['https://web.dev/font-display/'],
                },
                metadata: {
                    links: badLinks
                }
            });
        }
    }

    private async checkPreconnect(page: Page, issues: Issue[], metrics: FontMetrics): Promise<void> {
        const hasExternalFonts = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'));
            return links.length > 0;
        });

        if (hasExternalFonts) {
            const hasPreconnect = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('link[rel="preconnect"]'));
                return links.some(link => (link as HTMLLinkElement).href.includes('fonts.gstatic.com'));
            });

            if (!hasPreconnect) {
                metrics.missingPreconnect = 1;
                issues.push({
                    id: 'preconnect-to-font-origin',
                    type: 'performance',
                    severity: 'medium',
                    impact: 40,
                    title: 'Preconnect to required origins',
                    description: 'The page uses Google Fonts but does not preconnect to fonts.gstatic.com, which can delay font loading.',
                    affectedPages: [],
                    fixGuidance: {
                        difficulty: 'easy',
                        estimatedTime: '5m',
                        implementation: 'Add a preconnect link for the font file origin.',
                        codeExample: '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
                        resources: ['https://web.dev/uses-rel-preconnect/'],
                    },
                });
            }
        }
    }
}
