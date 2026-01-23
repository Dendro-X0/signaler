
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

type BundleMetrics = {
    totalScripts: number;
    totalBytes: number;
    unusedBytes: number;
    usageRatio: number; // 0-1
    largeBundles: number;
};

/**
 * Bundle Analysis Plugin
 * 
 * Analyzes JavaScript bundles for optimization opportunities:
 * - Unused code detection (via Coverage API)
 * - Large bundle detection
 * - Duplicate framework detection (React, etc.)
 * 
 * Note: This plugin forces a page reload to capture load-time code execution.
 */
export class BundleAnalysisPlugin implements AuditPlugin {
    public readonly name = 'bundle-analysis';
    public readonly version = '1.0.0';
    public readonly type = 'code-quality' as const;
    public readonly phase = 2 as const;
    public readonly dependencies: readonly string[] = [];

    private config: PluginConfig = {
        enabled: true,
        settings: {
            thresholdBytes: 50 * 1024, // 50KB
            unusedThreshold: 0.4, // Report if > 40% unused
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
            // 1. Analyze specific libraries for duplicates (before reload to save state check time)
            await this.checkDuplicateFrameworks(page, issues);

            // 2. Perform Code Coverage analysis (requires reload)
            // Enable coverage
            await page.coverage.startJSCoverage({ resetOnNavigation: false });

            // Reload to capture load-time execution
            // We use 'domcontentloaded' to be faster than 'networkidle' but still capture init
            await page.reload({ waitUntil: 'domcontentloaded' });

            // Wait a bit for hydrations/async scripts
            await page.waitForTimeout(2000);

            const coverage = await page.coverage.stopJSCoverage();

            // 3. Analyze coverage results
            const metrics = this.analyzeCoverage(coverage, issues);

            return {
                pluginName: this.name,
                type: this.type,
                issues,
                metrics: metrics as unknown as Record<string, number>,
                metadata: {
                    details: 'Page was reloaded to capture code coverage',
                },
                executionTimeMs: Date.now() - startTime,
                success: true,
            };
        } catch (error) {
            console.error('Bundle analysis audit failed:', error);
            // Ensure we try to stop coverage if it was started
            try { await page.coverage.stopJSCoverage(); } catch (e) { /* ignore */ }

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
        // cleanup handled in audit
    }

    private async checkDuplicateFrameworks(page: Page, issues: Issue[]): Promise<void> {
        const duplicates = await page.evaluate(() => {
            const results: string[] = [];
            // Simple heuristic checks for global variables
            // This is not exhaustive but catches common issues

            // Check for potential multiple jQuery versions
            // @ts-ignore
            if (window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery) {
                // Hard to detect multiple jQueries attached to window without conflicts, 
                // but we can check if $ != jQuery or similar if mostly used. 
                // Actually, detecting duplicates usually requires inspecting the window objects more deeply
                // or checking script tags. For now, let's look for multiple react versions if possible.
                // React dev tools hook usually exposes versions.
            }
            return results;
        });

        // Current implementation of duplicate detection is limited without deep script parsing.
        // We will focus on coverage for this version.
    }

    private analyzeCoverage(coverage: any[], issues: Issue[]): BundleMetrics {
        let totalBytes = 0;
        let unusedBytes = 0;
        let totalScripts = 0;
        let largeBundles = 0;

        const thresholdBytes = (this.config.settings.thresholdBytes as number) || 50 * 1024;
        const unusedThreshold = (this.config.settings.unusedThreshold as number) || 0.4;

        for (const entry of coverage) {
            // Filter out internal scripts, extensions, etc.
            if (!entry.url || entry.url.startsWith('chrome-extension:') || entry.url.startsWith('node:')) continue;

            totalScripts++;
            const scriptBytes = entry.text.length;
            totalBytes += scriptBytes;

            let usedBytes = 0;
            for (const range of entry.ranges) {
                usedBytes += range.end - range.start;
            }

            const unused = scriptBytes - usedBytes;
            unusedBytes += unused;
            const unusedRatio = unused / scriptBytes;

            // Check for large, mostly unused bundles
            if (scriptBytes > thresholdBytes) {
                largeBundles++;
                if (unusedRatio > unusedThreshold) {
                    issues.push({
                        id: 'unused-javascript-bundle',
                        type: 'code-quality',
                        severity: unusedRatio > 0.7 ? 'high' : 'medium',
                        impact: Math.round(unusedRatio * 100),
                        title: 'Reduce unused JavaScript',
                        description: `Script ${this.getShortUrl(entry.url)} is ${(scriptBytes / 1024).toFixed(1)}KB but ${(unusedRatio * 100).toFixed(0)}% is unused during load.`,
                        affectedPages: [entry.url],
                        fixGuidance: {
                            difficulty: 'hard',
                            estimatedTime: '2h',
                            implementation: 'Use code splitting to break up this bundle. Lazy load components or routes that are not immediately needed.',
                            resources: ['https://web.dev/reduce-javascript-payloads-with-code-splitting/'],
                        },
                        metadata: {
                            url: entry.url,
                            totalBytes: scriptBytes,
                            unusedBytes: unused,
                            unusedPercentage: unusedRatio * 100
                        },
                    });
                }
            }
        }

        return {
            totalScripts,
            totalBytes,
            unusedBytes,
            usageRatio: totalBytes > 0 ? (totalBytes - unusedBytes) / totalBytes : 1,
            largeBundles,
        };
    }

    private getShortUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname.split('/').pop() || urlObj.pathname;
        } catch {
            return url.substring(0, 30) + '...';
        }
    }
}
