
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileUXPlugin } from '../../src/plugins/ux/mobile-ux-plugin.js';
import type { Page } from 'playwright';
import type { AuditContext } from '../../src/core/plugin-interface.js';

describe('MobileUXPlugin', () => {
    let plugin: MobileUXPlugin;
    let mockPage: Page;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new MobileUXPlugin();
        mockPage = {
            evaluate: vi.fn(),
        } as unknown as Page;

        mockContext = {
            url: 'https://example.com',
            page: mockPage,
            device: 'mobile',
            pageConfig: { path: '/', label: 'Home' },
            sharedData: new Map(),
            metadata: { startTime: Date.now() },
        };
    });

    it('should have correct metadata', () => {
        expect(plugin.name).toBe('mobile-ux');
        expect(plugin.type).toBe('ux');
        expect(plugin.phase).toBe(4);
    });

    it('should detect missing viewport meta tag', async () => {
        (mockPage.evaluate as any).mockResolvedValue({
            viewport: undefined,
            touchTargets: [],
            mediaQueries: ['(max-width: 600px)'],
            hasMobileNav: true,
            heavyAnimations: false,
        });

        const result = await plugin.audit(mockContext);
        expect(result.issues.find(i => i.id === 'ux-viewport-missing')).toBeDefined();
        expect(result.metrics.hasViewport).toBe(0);
    });

    it('should detect small touch targets', async () => {
        (mockPage.evaluate as any).mockResolvedValue({
            viewport: 'width=device-width, initial-scale=1',
            touchTargets: [
                { tagName: 'button', text: 'Small', width: 20, height: 20, selector: '.btn' },
                { tagName: 'button', text: 'Big', width: 50, height: 50, selector: '.btn-big' },
            ],
            mediaQueries: ['screen and (max-width: 600px)'],
            hasMobileNav: true,
            heavyAnimations: false,
        });

        const result = await plugin.audit(mockContext);
        const issue = result.issues.find(i => i.id === 'ux-touch-targets');
        expect(issue).toBeDefined();
        expect(result.metrics.smallTouchTargets).toBe(1);
        expect(result.metrics.touchTargetScore).toBe(50);
    });

    it('should detect non-responsive design', async () => {
        (mockPage.evaluate as any).mockResolvedValue({
            viewport: 'width=device-width, initial-scale=1',
            touchTargets: [],
            mediaQueries: [], // No media queries!
            hasMobileNav: false,
            heavyAnimations: false,
        });

        const result = await plugin.audit(mockContext);
        expect(result.issues.find(i => i.id === 'ux-not-responsive')).toBeDefined();
        expect(result.metrics.isResponsive).toBe(0);
    });

    it('should handle audit failures gracefully', async () => {
        (mockPage.evaluate as any).mockRejectedValue(new Error('Evaluation failed'));

        const result = await plugin.audit(mockContext);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Evaluation failed');
    });
});
