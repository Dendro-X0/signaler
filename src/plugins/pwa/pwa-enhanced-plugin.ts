
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

type PWAMetrics = {
    hasManifest: number;
    hasServiceWorker: number;
    installable: number;
    maskableIcon: number;
};

/**
 * PWA Enhanced Plugin
 * 
 * Validates Progressive Web App features:
 * - Web App Manifest presence and validity
 * - Service Worker registration
 * - Installability criteria (icons, display mode)
 */
export class PWAEnhancedPlugin implements AuditPlugin {
    public readonly name = 'pwa-enhanced';
    public readonly version = '1.0.0';
    public readonly type = 'ux' as const; // Sticking to 'ux' as per original plan or could be 'seo'/'performance' but PWA works well as UX
    public readonly phase = 3 as const;
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
        const metrics: PWAMetrics = {
            hasManifest: 0,
            hasServiceWorker: 0,
            installable: 0,
            maskableIcon: 0,
        };

        try {
            await this.checkManifest(page, issues, metrics);
            await this.checkServiceWorker(page, issues, metrics);

            // Note: Full installability check usually requires CDP or specialized logic,
            // we will approximate based on manifest content + SW presence.

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
            console.error('PWA audit failed:', error);
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

    private async checkManifest(page: Page, issues: Issue[], metrics: PWAMetrics): Promise<void> {
        const manifestUrl = await page.evaluate(() => {
            return document.querySelector('link[rel="manifest"]')?.getAttribute('href') || null;
        });

        if (!manifestUrl) {
            issues.push({
                id: 'pwa-manifest-missing',
                type: 'ux',
                severity: 'medium',
                impact: 60,
                title: 'Web App Manifest missing',
                description: 'A manifest.json key is required for PWA installation and defining app appearance.',
                affectedPages: [page.url()],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '15m',
                    implementation: 'Create a manifest.json file and link it in your HTML head.',
                    codeExample: '<link rel="manifest" href="/manifest.json">',
                    resources: ['https://web.dev/add-manifest/'],
                },
            });
            return;
        }

        metrics.hasManifest = 1;

        // Fetch and parse manifest
        try {
            // In a real browser context we might fetch relative to page URL.
            // Here we assume simple fetch works or we'd need to construct absolute URL.
            // Using page evaluate to fetch ensures cookies/auth if needed (though usually public)

            const manifestContent = await page.evaluate(async (url) => {
                try {
                    const resp = await fetch(url);
                    if (!resp.ok) return null;
                    return await resp.json();
                } catch {
                    return null;
                }
            }, manifestUrl);

            if (!manifestContent) {
                issues.push({
                    id: 'pwa-manifest-invalid',
                    type: 'ux',
                    severity: 'medium',
                    impact: 60,
                    title: 'Web App Manifest unreadable',
                    description: `The manifest at ${manifestUrl} could not be fetched or parsed.`,
                    affectedPages: [page.url()],
                    fixGuidance: {
                        difficulty: 'easy',
                        estimatedTime: '5m',
                        implementation: 'Ensure the manifest file exists and is valid JSON.',
                        resources: ['https://web.dev/add-manifest/'],
                    },
                });
                return;
            }

            // Check basic fields
            const missingFields: string[] = [];
            if (!manifestContent.name && !manifestContent.short_name) missingFields.push('name/short_name');
            if (!manifestContent.icons || !Array.isArray(manifestContent.icons) || manifestContent.icons.length === 0) missingFields.push('icons');
            if (!manifestContent.start_url) missingFields.push('start_url');
            if (!manifestContent.display) missingFields.push('display');

            if (missingFields.length > 0) {
                issues.push({
                    id: 'pwa-manifest-incomplete',
                    type: 'ux',
                    severity: 'low',
                    impact: 40,
                    title: 'Web App Manifest incomplete',
                    description: `The manifest is missing recommended fields: ${missingFields.join(', ')}.`,
                    affectedPages: [page.url()],
                    fixGuidance: {
                        difficulty: 'easy',
                        estimatedTime: '10m',
                        implementation: 'Add missing fields to manifest.json.',
                        resources: ['https://web.dev/add-manifest/'],
                    },
                });
            } else {
                metrics.installable = 1; // Provisional

                // Check maskable icon
                const hasMaskable = manifestContent.icons.some((icon: any) => icon.purpose && icon.purpose.includes('maskable'));
                if (!hasMaskable) {
                    issues.push({
                        id: 'pwa-maskable-icon',
                        type: 'ux',
                        severity: 'low',
                        impact: 20,
                        title: 'Missing maskable icon',
                        description: 'Maskable icons ensure your PWA icon looks good on all Android devices.',
                        affectedPages: [page.url()],
                        fixGuidance: {
                            difficulty: 'easy',
                            estimatedTime: '15m',
                            implementation: 'Add an icon with purpose: "any maskable" to your manifest.',
                            resources: ['https://web.dev/maskable-icon/'],
                        },
                    });
                } else {
                    metrics.maskableIcon = 1;
                }
            }

        } catch (err) {
            // Ignore fetch errors in test context if needed
        }
    }

    private async checkServiceWorker(page: Page, issues: Issue[], metrics: PWAMetrics): Promise<void> {
        const swRegistrations = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return 0;
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length;
        });

        if (swRegistrations === 0) {
            issues.push({
                id: 'pwa-service-worker-missing',
                type: 'ux',
                severity: 'medium',
                impact: 70,
                title: 'No Service Worker registered',
                description: 'A Service Worker is required for PWA functionality (offline support, caching, installation).',
                affectedPages: [page.url()],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '1h',
                    implementation: 'Register a service worker in your main JavaScript entry point.',
                    codeExample: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}`,
                    resources: ['https://web.dev/service-worker-registration/'],
                },
            });
        } else {
            metrics.hasServiceWorker = 1;
        }
    }
}
