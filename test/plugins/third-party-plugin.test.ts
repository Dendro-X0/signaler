
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThirdPartyPlugin } from '../../src/plugins/performance/third-party-plugin.js';
import type { Page } from 'playwright';
import type { AuditContext } from '../../src/core/plugin-interface.js';

describe('ThirdPartyPlugin', () => {
    let plugin: ThirdPartyPlugin;
    let mockPage: Page;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new ThirdPartyPlugin();
        mockPage = {
            evaluate: vi.fn(),
        } as unknown as Page;

        mockContext = {
            url: 'https://example.com',
            page: mockPage,
            device: 'desktop',
            pageConfig: { path: '/', label: 'Home' },
            sharedData: new Map(),
            metadata: { startTime: Date.now() },
        };
    });

    it('should have correct metadata', () => {
        expect(plugin.name).toBe('third-party-scripts');
        expect(plugin.type).toBe('performance');
        expect(plugin.phase).toBe(4);
    });

    it('should detect third-party resources', async () => {
        (mockPage.evaluate as any).mockResolvedValue([
            { url: 'https://example.com/main.js', domain: 'example.com', initiatorType: 'script', transferSize: 1000, duration: 10, isThirdParty: false },
            { url: 'https://google-analytics.com/ga.js', domain: 'google-analytics.com', initiatorType: 'script', transferSize: 5000, duration: 50, isThirdParty: true },
            { url: 'https://facebook.net/fbevents.js', domain: 'facebook.net', initiatorType: 'script', transferSize: 2000, duration: 30, isThirdParty: true },
        ]);

        const result = await plugin.audit(mockContext);
        expect(result.metrics.thirdPartyCount).toBe(2);
        expect(result.metrics.thirdPartyRequests).toBe(2);
        expect(result.metrics.thirdPartyBytes).toBe(7000);
        expect(result.metadata.thirdPartyDomains).toContain('google-analytics.com');
    });

    it('should flag blocking third-party scripts', async () => {
        (mockPage.evaluate as any).mockResolvedValue([
            { url: 'https://blocking.com/bad.js', domain: 'blocking.com', initiatorType: 'script', transferSize: 10000, duration: 500, isThirdParty: true },
        ]);

        const result = await plugin.audit(mockContext);
        const issue = result.issues.find(i => i.id === 'performance-blocking-third-parties');
        expect(issue).toBeDefined();
        expect(issue?.severity).toBe('high');
    });

    it('should flag excessive third-party requests', async () => {
        const manyRequests = Array.from({ length: 25 }, (_, i) => ({
            url: `https://tp${i}.com/script.js`,
            domain: `tp${i}.com`,
            initiatorType: 'script',
            transferSize: 100,
            duration: 5,
            isThirdParty: true
        }));

        (mockPage.evaluate as any).mockResolvedValue(manyRequests);

        const result = await plugin.audit(mockContext);
        expect(result.issues.find(i => i.id === 'performance-too-many-third-parties')).toBeDefined();
    });

    it('should handle large payloads', async () => {
        (mockPage.evaluate as any).mockResolvedValue([
            { url: 'https://large-tp.com/script.js', domain: 'large-tp.com', initiatorType: 'script', transferSize: 600000, duration: 100, isThirdParty: true },
        ]);

        const result = await plugin.audit(mockContext);
        expect(result.issues.find(i => i.id === 'performance-large-third-party-payload')).toBeDefined();
    });
});
