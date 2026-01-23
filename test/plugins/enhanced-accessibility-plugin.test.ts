import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedAccessibilityPlugin } from '../../src/plugins/accessibility/enhanced-accessibility-plugin.js';
import type { AuditContext, PluginConfig } from '../../src/core/plugin-interface.js';

describe('EnhancedAccessibilityPlugin', () => {
    let plugin: EnhancedAccessibilityPlugin;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new EnhancedAccessibilityPlugin();

        mockContext = {
            url: 'http://localhost:3000/test',
            page: {
                evaluate: vi.fn(),
                addScriptTag: vi.fn().mockResolvedValue({}),
            } as any, // Mock Playwright page
            device: 'desktop',
            pageConfig: {
                path: '/test',
                label: 'Test Page',
                scope: 'public',
            },
            sharedData: new Map(),
            metadata: {
                startTime: Date.now(),
                buildId: 'test-build',
                environment: 'test',
            },
        };
    });

    describe('Plugin Metadata', () => {
        it('should have correct plugin metadata', () => {
            expect(plugin.name).toBe('enhanced-accessibility');
            expect(plugin.version).toBe('1.0.0');
            expect(plugin.type).toBe('accessibility');
            expect(plugin.phase).toBe(1);
            expect(plugin.dependencies).toEqual(['lighthouse']);
        });
    });

    describe('Configuration', () => {
        it('should accept valid configuration', async () => {
            const config: PluginConfig = {
                enabled: true,
                settings: {
                    wcagLevel: 'AA',
                },
            };

            await expect(plugin.configure(config)).resolves.toBeUndefined();
        });

        it('should validate enabled configuration', () => {
            const validConfig: PluginConfig = {
                enabled: true,
                settings: {},
            };

            expect(plugin.validate(validConfig)).toBe(true);
        });

        it('should reject disabled configuration', () => {
            const invalidConfig: PluginConfig = {
                enabled: false,
                settings: {},
            };

            expect(plugin.validate(invalidConfig)).toBe(false);
        });
    });

    describe('Audit Execution', () => {
        it('should return success result structure', async () => {
            // Mock page methods
            (mockContext.page.evaluate as any).mockResolvedValue({
                violations: [],
                passes: [],
                incomplete: [],
            });

            const result = await plugin.audit(mockContext);

            expect(result.pluginName).toBe('enhanced-accessibility');
            expect(result.type).toBe('accessibility');
            expect(result.success).toBe(true);
            expect(result.issues).toBeInstanceOf(Array);
            expect(result.metrics).toHaveProperty('totalViolations');
            expect(result.executionTimeMs).toBeGreaterThan(0);
        });

        it('should handle audit errors gracefully', async () => {
            // Mock page that throws error
            (mockContext.page.evaluate as any).mockRejectedValue(new Error('Page evaluation failed'));

            const result = await plugin.audit(mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Page evaluation failed');
            expect(result.issues).toEqual([]);
        });

        it('should store axe results in shared data', async () => {
            const mockAxeResults = {
                violations: [],
                passes: [{ id: 'test-pass', description: 'Test passed', tags: [] }],
                incomplete: [],
            };

            (mockContext.page.evaluate as any).mockResolvedValue(mockAxeResults);

            await plugin.audit(mockContext);

            expect(mockContext.sharedData.get('axe-results')).toEqual(mockAxeResults);
        });
    });

    describe('Issue Conversion', () => {
        it('should convert critical violations to critical severity', async () => {
            const mockAxeResults = {
                violations: [
                    {
                        id: 'color-contrast',
                        impact: 'critical' as const,
                        description: 'Elements must have sufficient color contrast',
                        help: 'Color contrast must meet WCAG AA standards',
                        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast',
                        tags: ['wcag2aa', 'wcag143'],
                        nodes: [
                            {
                                html: '<p style="color: #777; background: #fff;">Low contrast text</p>',
                                target: ['p'],
                                failureSummary: 'Fix any of the following:\n  Element has insufficient color contrast',
                            },
                        ],
                    },
                ],
                passes: [],
                incomplete: [],
            };

            (mockContext.page.evaluate as any).mockResolvedValue(mockAxeResults);

            const result = await plugin.audit(mockContext);

            expect(result.issues).toHaveLength(1);
            expect(result.issues[0].severity).toBe('critical');
            expect(result.issues[0].type).toBe('accessibility');
            expect(result.issues[0].wcagGuidelines).toBeDefined();
        });

        it('should calculate impact scores based on severity and node count', async () => {
            const mockAxeResults = {
                violations: [
                    {
                        id: 'image-alt',
                        impact: 'serious' as const,
                        description: 'Images must have alternate text',
                        help: 'Images must have alternate text',
                        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/image-alt',
                        tags: ['wcag2a', 'wcag111'],
                        nodes: Array(10).fill({
                            html: '<img src="test.jpg">',
                            target: ['img'],
                        }),
                    },
                ],
                passes: [],
                incomplete: [],
            };

            (mockContext.page.evaluate as any).mockResolvedValue(mockAxeResults);

            const result = await plugin.audit(mockContext);

            expect(result.issues[0].impact).toBeGreaterThan(75); // Base 75 + node multiplier
        });
    });

    describe('WCAG Compliance Metrics', () => {
        it('should calculate WCAG compliance percentages', async () => {
            const mockAxeResults = {
                violations: [
                    {
                        id: 'wcag2a-violation',
                        impact: 'serious' as const,
                        description: 'WCAG 2.0 Level A violation',
                        help: 'Fix this',
                        helpUrl: 'https://example.com',
                        tags: ['wcag2a'],
                        nodes: [{ html: '<div></div>', target: ['div'] }],
                    },
                ],
                passes: Array(9).fill({
                    id: 'pass',
                    description: 'Passed',
                    tags: ['wcag2a'],
                }),
                incomplete: [],
            };

            (mockContext.page.evaluate as any).mockResolvedValue(mockAxeResults);

            const result = await plugin.audit(mockContext);

            expect(result.metrics.wcagACompliance).toBe(90); // 9 passes out of 10 total
            expect(result.metrics.totalViolations).toBe(1);
            expect(result.metrics.passedRules).toBe(9);
        });
    });

    describe('Fix Guidance', () => {
        it('should provide difficulty estimates', async () => {
            const mockAxeResults = {
                violations: [
                    {
                        id: 'image-alt',
                        impact: 'serious' as const,
                        description: 'Images must have alternate text',
                        help: 'Images must have alternate text',
                        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/image-alt',
                        tags: ['wcag2a'],
                        nodes: [{ html: '<img src="test.jpg">', target: ['img'] }],
                    },
                ],
                passes: [],
                incomplete: [],
            };

            (mockContext.page.evaluate as any).mockResolvedValue(mockAxeResults);

            const result = await plugin.audit(mockContext);

            expect(result.issues[0].fixGuidance.difficulty).toBe('easy');
            expect(result.issues[0].fixGuidance.estimatedTime).toBeDefined();
            expect(result.issues[0].fixGuidance.implementation).toBeDefined();
        });

        it('should provide code examples for common violations', async () => {
            const mockAxeResults = {
                violations: [
                    {
                        id: 'label',
                        impact: 'serious' as const,
                        description: 'Form elements must have labels',
                        help: 'Form elements must have labels',
                        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/label',
                        tags: ['wcag2a'],
                        nodes: [{ html: '<input type="text">', target: ['input'] }],
                    },
                ],
                passes: [],
                incomplete: [],
            };

            (mockContext.page.evaluate as any).mockResolvedValue(mockAxeResults);

            const result = await plugin.audit(mockContext);

            expect(result.issues[0].fixGuidance.codeExample).toContain('<label');
            expect(result.issues[0].fixGuidance.codeExample).toContain('for=');
        });
    });

    describe('Cleanup', () => {
        it('should cleanup without errors', async () => {
            await expect(plugin.cleanup()).resolves.toBeUndefined();
        });
    });
});
