
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SEODeepPlugin } from '../../src/plugins/seo/seo-deep-plugin.js';
import type { Page } from 'playwright';
import type { AuditContext } from '../../src/core/plugin-interface.js';

describe('SEODeepPlugin', () => {
    let plugin: SEODeepPlugin;
    let mockPage: Page;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new SEODeepPlugin();
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
        expect(plugin.name).toBe('seo-deep');
        expect(plugin.type).toBe('seo');
        expect(plugin.phase).toBe(3);
    });

    it('should detect missing title', async () => {
        const mockSEOData = {
            title: '',
            description: 'A description',
            canonical: 'https://example.com',
            structuredData: [{}],
            h1Count: 1,
            // others unused in this check
            ogTitle: 'OG Title',
            ogImage: 'image.jpg',
        };

        (mockPage.evaluate as any).mockResolvedValue(mockSEOData);

        const result = await plugin.audit(mockContext);

        expect(result.success).toBe(true);
        const issue = result.issues.find(i => i.id === 'seo-title');
        expect(issue).toBeDefined();
        expect(issue?.severity).toBe('critical');
    });

    it('should detect missing description', async () => {
        const mockSEOData = {
            title: 'Valid Title',
            description: '',
            canonical: 'https://example.com',
            structuredData: [{}],
            h1Count: 1,
        };

        (mockPage.evaluate as any).mockResolvedValue(mockSEOData);

        const result = await plugin.audit(mockContext);

        const issue = result.issues.find(i => i.id === 'seo-description');
        expect(issue).toBeDefined();
        expect(issue?.severity).toBe('high');
    });

    it('should detect missing H1', async () => {
        const mockSEOData = {
            title: 'Valid Title',
            description: 'Description',
            canonical: 'https://example.com',
            structuredData: [{}],
            h1Count: 0,
        };

        (mockPage.evaluate as any).mockResolvedValue(mockSEOData);

        const result = await plugin.audit(mockContext);

        const issue = result.issues.find(i => i.id === 'seo-h1-missing');
        expect(issue).toBeDefined();
    });

    it('should detect multiple H1s', async () => {
        const mockSEOData = {
            title: 'Valid Title',
            description: 'Description',
            canonical: 'https://example.com',
            structuredData: [{}],
            h1Count: 2,
        };

        (mockPage.evaluate as any).mockResolvedValue(mockSEOData);

        const result = await plugin.audit(mockContext);

        const issue = result.issues.find(i => i.id === 'seo-h1-multiple');
        expect(issue).toBeDefined();
    });

    it('should detect missing structured data', async () => {
        const mockSEOData = {
            title: 'Valid Title',
            description: 'Description',
            canonical: 'https://example.com',
            structuredData: [],
            h1Count: 1,
        };

        (mockPage.evaluate as any).mockResolvedValue(mockSEOData);

        const result = await plugin.audit(mockContext);

        const issue = result.issues.find(i => i.id === 'seo-structured-data');
        expect(issue).toBeDefined();
    });
});
