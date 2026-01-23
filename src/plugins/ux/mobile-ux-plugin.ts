
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
 * Mobile UX Details collected from the page
 */
interface MobileUXData {
    viewport?: string;
    touchTargets: TouchTargetDetail[];
    mediaQueries: string[];
    hasMobileNav: boolean;
    heavyAnimations: boolean;
}

/**
 * Details about a touch target element
 */
interface TouchTargetDetail {
    tagName: string;
    text: string;
    width: number;
    height: number;
    selector: string;
}

/**
 * Metrics for Mobile UX
 */
interface MobileUXMetrics {
    touchTargetScore: number;
    hasViewport: number;
    isResponsive: number;
    smallTouchTargets: number;
}

/**
 * Mobile UX Plugin
 * 
 * Analyzes pages for Mobile-first user experience and optimization:
 * - Viewport configuration
 * - Touch target sizing (min 48x48px)
 * - Responsiveness and mobile-first CSS
 * - Mobile navigation patterns
 * - Potential battery impact (heavy animations)
 */
export class MobileUXPlugin implements AuditPlugin {
    public readonly name = 'mobile-ux';
    public readonly version = '1.0.0';
    public readonly type = 'ux' as const;
    public readonly phase = 4 as const;
    public readonly dependencies: readonly string[] = ['lighthouse'];

    private config: PluginConfig = {
        enabled: true,
        settings: {
            minTouchTargetSize: 48,
            checkAnimations: true,
        },
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
        return config.enabled !== undefined;
    }

    /**
     * Run the audit
     */
    public async audit(context: AuditContext): Promise<AuditResult> {
        const startTime = Date.now();
        const issues: Issue[] = [];
        const { page, url } = context;

        try {
            const data = await this.collectMobileUXData(page);
            const metrics = this.analyzeMobileUX(data, issues, url);

            return {
                pluginName: this.name,
                type: this.type,
                issues,
                metrics: metrics as unknown as Record<string, number>,
                metadata: {
                    viewport: data.viewport,
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
     * Collect mobile-specific data from the page
     */
    private async collectMobileUXData(page: Page): Promise<MobileUXData> {
        return page.evaluate(() => {
            // Check Viewport
            const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || undefined;

            // Check Touch Targets
            const interactiveSelectors = 'button, a, input, select, textarea, [role="button"], [role="link"]';
            const elements = Array.from(document.querySelectorAll(interactiveSelectors));

            const touchTargets = elements.map(el => {
                const rect = el.getBoundingClientRect();
                return {
                    tagName: el.tagName.toLowerCase(),
                    text: (el.textContent || '').trim().substring(0, 30),
                    width: rect.width,
                    height: rect.height,
                    selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase()
                };
            }).filter(t => t.width > 0 && t.height > 0);

            // Check for media queries
            const mediaQueries: string[] = [];
            try {
                for (const sheet of Array.from(document.styleSheets)) {
                    try {
                        for (const rule of Array.from(sheet.cssRules)) {
                            if (rule instanceof CSSMediaRule) {
                                mediaQueries.push(rule.media.mediaText);
                            }
                        }
                    } catch (e) {
                        // Cross-origin stylesheet access restricted
                    }
                }
            } catch (e) {
                // Ignore errors accessing stylesheets
            }

            // Simple check for mobile nav (common patterns)
            const hasMobileNav = !!(
                document.querySelector('.nav-mobile, .mobile-nav, [aria-label*="menu"], .hamburger, #menu-toggle') ||
                document.querySelector('nav button') ||
                document.querySelector('[role="navigation"] button')
            );

            // Simple check for heavy animations (many CSS animations)
            const animationCount = document.querySelectorAll('*').length; // Placeholder
            const hasHeavyAnimations = Array.from(document.styleSheets).some(sheet => {
                try {
                    return Array.from(sheet.cssRules).some(rule => rule instanceof CSSKeyframesRule);
                } catch {
                    return false;
                }
            });

            return {
                viewport,
                touchTargets,
                mediaQueries,
                hasMobileNav,
                heavyAnimations: hasHeavyAnimations,
            };
        });
    }

    /**
     * Analyze collected data and generate issues
     */
    private analyzeMobileUX(data: MobileUXData, issues: Issue[], url: string): MobileUXMetrics {
        const minSize = this.config.settings.minTouchTargetSize as number || 48;
        const smallTargets = data.touchTargets.filter(t => t.width < minSize || t.height < minSize);

        const metrics: MobileUXMetrics = {
            touchTargetScore: data.touchTargets.length > 0
                ? Math.round(((data.touchTargets.length - smallTargets.length) / data.touchTargets.length) * 100)
                : 100,
            hasViewport: data.viewport ? 1 : 0,
            isResponsive: data.mediaQueries.length > 0 ? 1 : 0,
            smallTouchTargets: smallTargets.length,
        };

        // Viewport Issues
        if (!data.viewport) {
            issues.push({
                id: 'ux-viewport-missing',
                type: 'ux',
                severity: 'critical',
                impact: 100,
                title: 'Missing viewport meta tag',
                description: 'A viewport meta tag is required for mobile-friendly pages as it tells browsers how to adjust the page dimension and scaling.',
                affectedPages: [url],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '5m',
                    implementation: 'Add a <meta name="viewport"> tag to the <head> of your HTML.',
                    codeExample: '<meta name="viewport" content="width=device-width, initial-scale=1">',
                    resources: ['https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag'],
                },
            });
        } else if (!data.viewport.includes('width=device-width')) {
            issues.push({
                id: 'ux-viewport-width',
                type: 'ux',
                severity: 'high',
                impact: 80,
                title: 'Viewport not set to device-width',
                description: 'The viewport width should be set to "device-width" to ensure the page renders correctly on all devices.',
                affectedPages: [url],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '5m',
                    implementation: 'Update your viewport meta tag to include width=device-width.',
                    codeExample: '<meta name="viewport" content="width=device-width, initial-scale=1">',
                    resources: ['https://web.dev/responsive-web-design-basics/#set-the-viewport'],
                },
            });
        }

        // Touch Target Issues
        if (smallTargets.length > 0) {
            const count = smallTargets.length;
            const samples = smallTargets.slice(0, 3).map(t => `${t.tagName}${t.selector} ("${t.text}")`).join(', ');

            issues.push({
                id: 'ux-touch-targets',
                type: 'ux',
                severity: count > 10 ? 'high' : 'medium',
                impact: Math.min(count * 5, 80),
                title: 'Small touch targets found',
                description: `Found ${count} touch targets smaller than ${minSize}x${minSize}px. Interactive elements should be large enough for reliable touch input. Samples: ${samples}`,
                affectedPages: [url],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '15m',
                    implementation: `Increase the padding or dimensions of small interactive elements to at least ${minSize}px.`,
                    codeExample: 'button { min-width: 48px; min-height: 48px; padding: 12px; }',
                    resources: ['https://web.dev/accessible-tap-targets/'],
                },
                metadata: {
                    smallTargetsCount: count,
                    minSize,
                },
            });
        }

        // Responsiveness Issues
        if (data.mediaQueries.length === 0) {
            issues.push({
                id: 'ux-not-responsive',
                type: 'ux',
                severity: 'high',
                impact: 75,
                title: 'No media queries detected',
                description: 'No CSS media queries were found. This often indicates a non-responsive design that may not work well on mobile devices.',
                affectedPages: [url],
                fixGuidance: {
                    difficulty: 'hard',
                    estimatedTime: '4h+',
                    implementation: 'Implement a responsive design using CSS media queries and flexible layouts (Flexbox, Grid).',
                    codeExample: '@media (max-width: 768px) { .container { width: 100%; } }',
                    resources: ['https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design'],
                },
            });
        }

        // Navigation Pattern Issues
        if (!data.hasMobileNav && data.touchTargets.length > 10) {
            issues.push({
                id: 'ux-mobile-nav',
                type: 'ux',
                severity: 'low',
                impact: 30,
                title: 'Missing mobile navigation pattern',
                description: 'The page has many interactive elements but no common mobile navigation pattern (like a hamburger menu) was detected.',
                affectedPages: [url],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '2h',
                    implementation: 'Implement a mobile-friendly navigation system for small screens.',
                    resources: ['https://www.nngroup.com/articles/hamburger-menus/'],
                },
            });
        }

        return metrics;
    }
}
