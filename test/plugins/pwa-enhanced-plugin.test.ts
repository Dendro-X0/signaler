
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PWAEnhancedPlugin } from '../../src/plugins/pwa/pwa-enhanced-plugin.js';
import type { Page } from 'playwright';
import type { AuditContext } from '../../src/core/plugin-interface.js';

describe('PWAEnhancedPlugin', () => {
    let plugin: PWAEnhancedPlugin;
    let mockPage: Page;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new PWAEnhancedPlugin();
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
        expect(plugin.name).toBe('pwa-enhanced');
        expect(plugin.type).toBe('ux'); // checking 'ux' type
        expect(plugin.phase).toBe(3);
    });

    it('should detect missing manifest link', async () => {
        (mockPage.evaluate as any).mockResolvedValue(null); // First evaluate returns null (no manifest link)

        const result = await plugin.audit(mockContext);

        expect(result.success).toBe(true);
        const issue = result.issues.find(i => i.id === 'pwa-manifest-missing');
        expect(issue).toBeDefined();
        expect(result.metrics.hasManifest).toBe(0);
    });

    it('should validate manifest content', async () => {
        // Mock manifest link present
        (mockPage.evaluate as any)
            .mockResolvedValueOnce('/manifest.json')
            // Mock manifest fetch success but invalid content (missing icons)
            .mockResolvedValueOnce({
                name: 'My App',
                short_name: 'App',
                start_url: '/',
                display: 'standalone',
                icons: [], // Empty icons
            })
            // Mock SW check
            .mockResolvedValueOnce(1);

        const result = await plugin.audit(mockContext);

        const issue = result.issues.find(i => i.id === 'pwa-manifest-incomplete');
        expect(issue).toBeDefined();
        expect(issue?.description).toContain('icons');
    });

    it('should detect missing service worker', async () => {
        (mockPage.evaluate as any)
            .mockResolvedValueOnce('/manifest.json')
            .mockResolvedValueOnce({
                name: 'App',
                short_name: 'App',
                icons: [{ src: 'icon.png', sizes: '192x192', type: 'image/png' }],
                start_url: '/',
                display: 'standalone'
            })
            .mockResolvedValueOnce(0); // 0 registrations

        const result = await plugin.audit(mockContext);

        const issue = result.issues.find(i => i.id === 'pwa-service-worker-missing');
        expect(issue).toBeDefined();
    });

    it('should pass if fully compliant', async () => {
        (mockPage.evaluate as any)
            .mockResolvedValueOnce('/manifest.json')
            .mockResolvedValueOnce({
                name: 'App',
                short_name: 'App',
                icons: [
                    { src: 'icon.png', sizes: '192x192', type: 'image/png' },
                    { src: 'maskable.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }
                ],
                start_url: '/',
                display: 'standalone'
            })
            .mockResolvedValueOnce(1); // SW present

        const result = await plugin.audit(mockContext);

        expect(result.issues.length).toBe(0);
        expect(result.metrics.hasManifest).toBe(1);
        expect(result.metrics.hasServiceWorker).toBe(1);
        expect(result.metrics.maskableIcon).toBe(1);
    });
});
