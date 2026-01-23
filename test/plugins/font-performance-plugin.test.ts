
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FontPerformancePlugin } from '../../src/plugins/performance/font-performance-plugin.js';
import type { Page } from 'playwright';
import type { AuditContext } from '../../src/core/plugin-interface.js';

describe('FontPerformancePlugin', () => {
    let plugin: FontPerformancePlugin;
    let mockPage: Page;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new FontPerformancePlugin();
        mockPage = {
            evaluate: vi.fn(),
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
        expect(plugin.name).toBe('font-performance');
        expect(plugin.type).toBe('performance');
        expect(plugin.phase).toBe(2);
    });

    it('should detect Google Fonts missing display=swap', async () => {
        // Mock evaluate calls in order:
        // 1. checkGoogleFonts -> returns links
        // 2. checkPreconnect -> hasExternalFonts (true/false)
        // 3. checkPreconnect -> hasPreconnect (if hasExternalFonts is true)
        // 4. metrics -> font count

        const googleLinks = ['https://fonts.googleapis.com/css?family=Roboto'];

        (mockPage.evaluate as any)
            .mockResolvedValueOnce(googleLinks) // checkGoogleFonts
            .mockResolvedValueOnce(true) // checkPreconnect: hasExternalFonts
            .mockResolvedValueOnce(true) // checkPreconnect: hasPreconnect (assume yes for this test)
            .mockResolvedValueOnce(1); // metrics: totalFonts

        const result = await plugin.audit(mockContext);

        expect(result.success).toBe(true);
        const swapIssue = result.issues.find(i => i.id === 'font-display-swap');
        expect(swapIssue).toBeDefined();
        expect(swapIssue?.severity).toBe('medium');
        expect(result.metrics.googleFontsWithoutDisplay).toBe(1);
    });

    it('should pass if display=swap is present', async () => {
        const googleLinks = ['https://fonts.googleapis.com/css?family=Roboto&display=swap'];

        (mockPage.evaluate as any)
            .mockResolvedValueOnce(googleLinks)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(1);

        const result = await plugin.audit(mockContext);

        const swapIssue = result.issues.find(i => i.id === 'font-display-swap');
        expect(swapIssue).toBeUndefined();
    });

    it('should detect missing preconnect for Google Fonts', async () => {
        const googleLinks = ['https://fonts.googleapis.com/css?family=Roboto&display=swap'];

        (mockPage.evaluate as any)
            .mockResolvedValueOnce(googleLinks) // checkGoogleFonts
            .mockResolvedValueOnce(true) // checkPreconnect: hasExternalFonts
            .mockResolvedValueOnce(false) // checkPreconnect: hasPreconnect -> FALSE
            .mockResolvedValueOnce(1); // metrics: totalFonts

        const result = await plugin.audit(mockContext);

        const preconnectIssue = result.issues.find(i => i.id === 'preconnect-to-font-origin');
        expect(preconnectIssue).toBeDefined();
        expect(preconnectIssue?.severity).toBe('medium');
        expect(result.metrics.missingPreconnect).toBe(1);
    });

    it('should handle no external fonts gracefully', async () => {
        (mockPage.evaluate as any)
            .mockResolvedValueOnce([]) // checkGoogleFonts
            .mockResolvedValueOnce(false) // checkPreconnect: hasExternalFonts
            // third mocked call skipped because hasExternalFonts is false
            .mockResolvedValueOnce(0); // metrics: totalFonts

        const result = await plugin.audit(mockContext);

        expect(result.issues.length).toBe(0);
        expect(result.metrics.totalFonts).toBe(0);
    });
});
