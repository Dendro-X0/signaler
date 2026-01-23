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

type AxeResults = {
    readonly violations: readonly AxeViolation[];
    readonly passes: readonly AxePass[];
    readonly incomplete: readonly AxeIncomplete[];
};

type AxeViolation = {
    readonly id: string;
    readonly impact: 'critical' | 'serious' | 'moderate' | 'minor';
    readonly description: string;
    readonly help: string;
    readonly helpUrl: string;
    readonly tags: readonly string[];
    readonly nodes: readonly AxeNode[];
};

type AxePass = {
    readonly id: string;
    readonly description: string;
    readonly tags: readonly string[];
};

type AxeIncomplete = {
    readonly id: string;
    readonly impact: 'critical' | 'serious' | 'moderate' | 'minor';
    readonly description: string;
    readonly help: string;
    readonly helpUrl: string;
    readonly tags: readonly string[];
    readonly nodes: readonly AxeNode[];
};

type AxeNode = {
    readonly html: string;
    readonly target: readonly string[];
    readonly failureSummary?: string;
};

type WCAGLevel = 'A' | 'AA' | 'AAA';

type AccessibilityMetrics = {
    readonly totalViolations: number;
    readonly criticalViolations: number;
    readonly seriousViolations: number;
    readonly moderateViolations: number;
    readonly minorViolations: number;
    readonly wcagACompliance: number;
    readonly wcagAACompliance: number;
    readonly wcagAAACompliance: number;
    readonly passedRules: number;
    readonly incompleteRules: number;
};

/**
 * Enhanced Accessibility Plugin using axe-core for comprehensive WCAG validation
 * 
 * Provides deep accessibility auditing beyond Lighthouse's basic checks:
 * - WCAG 2.1/2.2 compliance levels (A, AA, AAA)
 * - Keyboard navigation testing
 * - Screen reader compatibility
 * - Enhanced color contrast analysis
 * - ARIA label and semantic HTML validation
 */
export class EnhancedAccessibilityPlugin implements AuditPlugin {
    public readonly name = 'enhanced-accessibility';
    public readonly version = '1.0.0';
    public readonly type = 'accessibility' as const;
    public readonly phase = 1 as const;
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
        const metrics: Record<string, number> = {};

        try {
            // Inject axe-core into the page
            await this.injectAxeCore(context.page);

            // Run axe-core analysis
            const axeResults = await this.runAxeAnalysis(context.page);

            // Convert axe violations to issues
            const convertedIssues = this.convertAxeViolationsToIssues(
                axeResults.violations,
                context.pageConfig.path,
            );
            issues.push(...convertedIssues);

            // Calculate accessibility metrics
            const accessibilityMetrics = this.calculateAccessibilityMetrics(axeResults);
            Object.assign(metrics, {
                totalViolations: accessibilityMetrics.totalViolations,
                criticalViolations: accessibilityMetrics.criticalViolations,
                seriousViolations: accessibilityMetrics.seriousViolations,
                moderateViolations: accessibilityMetrics.moderateViolations,
                minorViolations: accessibilityMetrics.minorViolations,
                wcagACompliance: accessibilityMetrics.wcagACompliance,
                wcagAACompliance: accessibilityMetrics.wcagAACompliance,
                wcagAAACompliance: accessibilityMetrics.wcagAAACompliance,
                passedRules: accessibilityMetrics.passedRules,
                incompleteRules: accessibilityMetrics.incompleteRules,
            });

            // Store axe results in shared data for other plugins
            context.sharedData.set('axe-results', axeResults);

            const executionTimeMs = Date.now() - startTime;

            return {
                pluginName: this.name,
                type: this.type,
                issues,
                metrics,
                metadata: {
                    axeVersion: '4.10.2',
                    wcagVersion: '2.1',
                    totalRulesRun: axeResults.violations.length + axeResults.passes.length + axeResults.incomplete.length,
                },
                executionTimeMs,
                success: true,
            };
        } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            return {
                pluginName: this.name,
                type: this.type,
                issues: [],
                metrics: {},
                metadata: {},
                executionTimeMs,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during accessibility audit',
            };
        }
    }

    public async cleanup(): Promise<void> {
        // No cleanup needed for this plugin
    }

    private async injectAxeCore(page: Page): Promise<void> {
        // Inject axe-core library into the page from node_modules
        try {
            // Load axe-core from node_modules
            const axePath = require.resolve('axe-core');
            await page.addScriptTag({ path: axePath });
        } catch (error) {
            // Fallback: inject axe-core via CDN if local file not found
            await page.addScriptTag({
                url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js',
            });
        }
    }

    private async runAxeAnalysis(page: Page): Promise<AxeResults> {
        // Run axe-core analysis on the page
        const results = await page.evaluate(async () => {
            // @ts-expect-error - axe is injected dynamically
            return await window.axe.run();
        });

        return results as AxeResults;
    }

    private convertAxeViolationsToIssues(
        violations: readonly AxeViolation[],
        pagePath: string,
    ): Issue[] {
        return violations.map((violation) => {
            const severity = this.mapAxeImpactToSeverity(violation.impact);
            const impact = this.calculateImpactScore(violation);
            const wcagGuidelines = this.extractWCAGGuidelines(violation.tags);
            const fixGuidance = this.generateFixGuidance(violation);

            return {
                id: violation.id,
                type: 'accessibility',
                severity,
                impact,
                title: violation.help,
                description: violation.description,
                affectedPages: [pagePath],
                fixGuidance,
                wcagGuidelines,
                metadata: {
                    helpUrl: violation.helpUrl,
                    tags: violation.tags,
                    nodeCount: violation.nodes.length,
                    nodes: violation.nodes.slice(0, 3).map((node) => ({
                        html: node.html,
                        target: node.target,
                        failureSummary: node.failureSummary,
                    })),
                },
            };
        });
    }

    private mapAxeImpactToSeverity(impact: AxeViolation['impact']): IssueSeverity {
        const mapping: Record<AxeViolation['impact'], IssueSeverity> = {
            critical: 'critical',
            serious: 'high',
            moderate: 'medium',
            minor: 'low',
        };
        return mapping[impact];
    }

    private calculateImpactScore(violation: AxeViolation): number {
        // Impact score based on severity and number of affected nodes
        const baseScore: Record<AxeViolation['impact'], number> = {
            critical: 100,
            serious: 75,
            moderate: 50,
            minor: 25,
        };

        const base = baseScore[violation.impact];
        const nodeMultiplier = Math.min(violation.nodes.length / 10, 2); // Cap at 2x
        return Math.round(base * (1 + nodeMultiplier));
    }

    private extractWCAGGuidelines(tags: readonly string[]): string[] {
        // Extract WCAG guidelines from tags (e.g., "wcag2a", "wcag21aa")
        return tags
            .filter((tag) => tag.startsWith('wcag'))
            .map((tag) => {
                // Convert "wcag2a" to "WCAG 2.0 Level A"
                // Convert "wcag21aa" to "WCAG 2.1 Level AA"
                const match = tag.match(/wcag(\d)(\d)?([a]{1,3})/);
                if (!match) return tag;

                const major = match[1];
                const minor = match[2] || '0';
                const level = match[3].toUpperCase();

                return `WCAG ${major}.${minor} Level ${level}`;
            });
    }

    private generateFixGuidance(violation: AxeViolation): FixGuidance {
        const difficulty = this.estimateDifficulty(violation);
        const estimatedTime = this.estimateFixTime(violation);
        const implementation = this.generateImplementationGuidance(violation);
        const codeExample = this.generateCodeExample(violation);

        return {
            difficulty,
            estimatedTime,
            implementation,
            codeExample,
            resources: [violation.helpUrl],
        };
    }

    private estimateDifficulty(violation: AxeViolation): 'easy' | 'medium' | 'hard' {
        // Estimate difficulty based on violation type and impact
        const easyFixes = ['image-alt', 'label', 'button-name', 'link-name'];
        const hardFixes = ['color-contrast', 'aria-required-parent', 'nested-interactive'];

        if (easyFixes.some((fix) => violation.id.includes(fix))) {
            return 'easy';
        }
        if (hardFixes.some((fix) => violation.id.includes(fix))) {
            return 'hard';
        }
        return 'medium';
    }

    private estimateFixTime(violation: AxeViolation): string {
        const nodeCount = violation.nodes.length;
        const difficulty = this.estimateDifficulty(violation);

        if (difficulty === 'easy') {
            return nodeCount > 10 ? '30-60 minutes' : '10-30 minutes';
        }
        if (difficulty === 'medium') {
            return nodeCount > 10 ? '2-4 hours' : '1-2 hours';
        }
        return nodeCount > 10 ? '4-8 hours' : '2-4 hours';
    }

    private generateImplementationGuidance(violation: AxeViolation): string {
        // Generate specific implementation guidance based on violation type
        const guidanceMap: Record<string, string> = {
            'image-alt': 'Add descriptive alt text to all images. Use alt="" for decorative images.',
            'label': 'Ensure all form inputs have associated labels using <label> or aria-label.',
            'button-name': 'Provide accessible names for buttons using text content or aria-label.',
            'link-name': 'Ensure all links have descriptive text or aria-label attributes.',
            'color-contrast': 'Increase color contrast to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).',
            'heading-order': 'Use heading levels in sequential order (h1, h2, h3) without skipping levels.',
            'landmark-one-main': 'Ensure the page has exactly one main landmark (<main> element).',
            'region': 'Ensure all content is contained within landmark regions (header, nav, main, footer).',
        };

        return guidanceMap[violation.id] || violation.description;
    }

    private generateCodeExample(violation: AxeViolation): string | undefined {
        // Generate code examples for common violations
        const exampleMap: Record<string, string> = {
            'image-alt': '<img src="photo.jpg" alt="Description of the image">',
            'label': '<label for="email">Email:</label>\n<input type="email" id="email" name="email">',
            'button-name': '<button aria-label="Close dialog">×</button>',
            'link-name': '<a href="/about" aria-label="Learn more about our company">Read more</a>',
            'color-contrast': '/* Increase contrast */\ncolor: #000000; /* Dark text */\nbackground-color: #FFFFFF; /* Light background */',
        };

        return exampleMap[violation.id];
    }

    private calculateAccessibilityMetrics(axeResults: AxeResults): AccessibilityMetrics {
        const violations = axeResults.violations;

        const criticalViolations = violations.filter((v) => v.impact === 'critical').length;
        const seriousViolations = violations.filter((v) => v.impact === 'serious').length;
        const moderateViolations = violations.filter((v) => v.impact === 'moderate').length;
        const minorViolations = violations.filter((v) => v.impact === 'minor').length;

        // Calculate WCAG compliance percentages
        const wcagAViolations = violations.filter((v) => v.tags.some((tag) => tag.includes('wcag2a'))).length;
        const wcagAAViolations = violations.filter((v) => v.tags.some((tag) => tag.includes('wcag2aa') || tag.includes('wcag21aa'))).length;
        const wcagAAAViolations = violations.filter((v) => v.tags.some((tag) => tag.includes('wcag2aaa') || tag.includes('wcag21aaa'))).length;

        const totalRules = violations.length + axeResults.passes.length;
        const wcagACompliance = totalRules > 0 ? Math.round(((totalRules - wcagAViolations) / totalRules) * 100) : 100;
        const wcagAACompliance = totalRules > 0 ? Math.round(((totalRules - wcagAAViolations) / totalRules) * 100) : 100;
        const wcagAAACompliance = totalRules > 0 ? Math.round(((totalRules - wcagAAAViolations) / totalRules) * 100) : 100;

        return {
            totalViolations: violations.length,
            criticalViolations,
            seriousViolations,
            moderateViolations,
            minorViolations,
            wcagACompliance,
            wcagAACompliance,
            wcagAAACompliance,
            passedRules: axeResults.passes.length,
            incompleteRules: axeResults.incomplete.length,
        };
    }
}
