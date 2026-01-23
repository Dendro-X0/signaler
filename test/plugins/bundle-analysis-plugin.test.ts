
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BundleAnalysisPlugin } from '../../src/plugins/code-quality/bundle-analysis-plugin.js';
import type { Page } from 'playwright';
import type { AuditContext } from '../../src/core/plugin-interface.js';

describe('BundleAnalysisPlugin', () => {
    let plugin: BundleAnalysisPlugin;
    let mockPage: Page;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new BundleAnalysisPlugin();
        mockPage = {
            coverage: {
                startJSCoverage: vi.fn(),
                stopJSCoverage: vi.fn(),
            },
            reload: vi.fn(),
            waitForTimeout: vi.fn(),
            evaluate: vi.fn().mockResolvedValue([]), // for checkDuplicateFrameworks
            url: vi.fn().mockReturnValue('https://example.com'),
        } as unknown as Page;

        mockContext = {
            url: 'https://example.com',
            page: mockPage,
            device: 'desktop',
            pageConfig: {
                path: '/',
                label: 'Home',
            },
            sharedData: new Map(),
            metadata: {
                startTime: Date.now(),
            },
        };
    });

    it('should have correct metadata', () => {
        expect(plugin.name).toBe('bundle-analysis');
        expect(plugin.type).toBe('code-quality');
        expect(plugin.phase).toBe(2);
    });

    it('should identify large unused bundles', async () => {
        // Mock 100KB script with 90KB unused
        const largeUnusedScript = {
            url: 'https://example.com/main.js',
            text: 'x'.repeat(100 * 1024), // 100KB
            ranges: [
                { start: 0, end: 10 * 1024 } // Only 10KB used
            ]
        };

        (mockPage.coverage.stopJSCoverage as any).mockResolvedValue([largeUnusedScript]);

        const result = await plugin.audit(mockContext);

        expect(result.success).toBe(true);
        expect(mockPage.reload).toHaveBeenCalled();

        const issue = result.issues.find(i => i.id === 'unused-javascript-bundle');
        expect(issue).toBeDefined();
        expect(issue?.severity).toBe('high'); // > 70% unused
        expect(issue?.description).toContain('90% is unused');
        expect(result.metrics.largeBundles).toBe(1);
        expect(result.metrics.unusedBytes).toBe(90 * 1024);
    });

    it('should not report small scripts', async () => {
        // Mock 40KB script with 90% unused (below 50KB threshold)
        const smallUnusedScript = {
            url: 'https://example.com/small.js',
            text: 'x'.repeat(40 * 1024), // 40KB
            ranges: [
                { start: 0, end: 4 * 1024 } // Only 4KB used
            ]
        };

        (mockPage.coverage.stopJSCoverage as any).mockResolvedValue([smallUnusedScript]);

        const result = await plugin.audit(mockContext);

        const issue = result.issues.find(i => i.id === 'unused-javascript-bundle');
        expect(issue).toBeUndefined();
        expect(result.metrics.largeBundles).toBe(0); // Not counted as large bundle
    });

    it('should not report large used scripts', async () => {
        // Mock 100KB script with 80KB used (20% unused, below 40% threshold)
        const largeUsedScript = {
            url: 'https://example.com/vendor.js',
            text: 'x'.repeat(100 * 1024), // 100KB
            ranges: [
                { start: 0, end: 80 * 1024 } // 80KB used
            ]
        };

        (mockPage.coverage.stopJSCoverage as any).mockResolvedValue([largeUsedScript]);

        const result = await plugin.audit(mockContext);

        const issue = result.issues.find(i => i.id === 'unused-javascript-bundle');
        expect(issue).toBeUndefined();
        expect(result.metrics.largeBundles).toBe(1); // It is a large bundle, but well utilized
    });

    it('should ignore chrome extensions and node modules', async () => {
        const ignoredScript = {
            url: 'chrome-extension://some-id/script.js',
            text: 'x'.repeat(100 * 1024),
            ranges: []
        };

        (mockPage.coverage.stopJSCoverage as any).mockResolvedValue([ignoredScript]);

        const result = await plugin.audit(mockContext);

        expect(result.metrics.totalScripts).toBe(0);
    });

    it('should handle errors gracefully', async () => {
        (mockPage.reload as any).mockRejectedValue(new Error('Reload failed'));

        const result = await plugin.audit(mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Reload failed');
        // Should attempt to stop coverage even on fail
        expect(mockPage.coverage.stopJSCoverage).toHaveBeenCalled();
    });
});
