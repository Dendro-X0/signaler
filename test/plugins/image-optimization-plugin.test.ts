
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageOptimizationPlugin } from '../../src/plugins/performance/image-optimization-plugin.js';
import type { Page } from 'playwright';
import type { AuditContext } from '../../src/core/plugin-interface.js';

describe('ImageOptimizationPlugin', () => {
    let plugin: ImageOptimizationPlugin;
    let mockPage: Page;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new ImageOptimizationPlugin();
        mockPage = {
            evaluate: vi.fn(),
            viewportSize: vi.fn().mockReturnValue({ width: 1920, height: 1080 }),
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
        expect(plugin.name).toBe('image-optimization');
        expect(plugin.type).toBe('performance');
        expect(plugin.phase).toBe(2);
    });

    it('should detect unoptimized image formats', async () => {
        const mockImages = [
            {
                src: 'https://example.com/image.jpg',
                loading: 'eager',
                width: '800',
                height: '600',
                srcset: 'image.jpg 800w',
                sizes: '100vw',
                alt: 'Legacy format',
                naturalWidth: 800,
                naturalHeight: 600,
                isVisible: true,
                rect: { top: 100, left: 10, width: 800, height: 600 },
            },
        ];

        (mockPage.evaluate as any).mockResolvedValue(mockImages);

        const result = await plugin.audit(mockContext);

        expect(result.success).toBe(true);
        const formatIssue = result.issues.find(i => i.id === 'use-modern-image-formats');
        expect(formatIssue).toBeDefined();
        expect(formatIssue?.severity).toBe('medium');
        expect(formatIssue?.description).toContain('Found 1 images');
    });

    it('should pass for optimized image formats', async () => {
        const mockImages = [
            {
                src: 'https://example.com/image.webp',
                loading: 'eager',
                width: '800',
                height: '600',
                srcset: 'image.webp 800w',
                sizes: '100vw',
                alt: 'Modern format',
                naturalWidth: 800,
                naturalHeight: 600,
                isVisible: true,
                rect: { top: 100, left: 10, width: 800, height: 600 },
            },
        ];

        (mockPage.evaluate as any).mockResolvedValue(mockImages);

        const result = await plugin.audit(mockContext);

        expect(result.issues.find(i => i.id === 'use-modern-image-formats')).toBeUndefined();
    });

    it('should detect missing size attributes', async () => {
        const mockImages = [
            {
                src: 'https://example.com/unsized.webp',
                loading: 'eager',
                width: undefined,
                height: undefined,
                srcset: '',
                sizes: '',
                alt: 'Unsized',
                naturalWidth: 800,
                naturalHeight: 600,
                isVisible: true,
                rect: { top: 100, left: 10, width: 800, height: 600 },
            },
        ];

        (mockPage.evaluate as any).mockResolvedValue(mockImages);

        const result = await plugin.audit(mockContext);

        const sizeIssue = result.issues.find(i => i.id === 'image-size-attributes');
        expect(sizeIssue).toBeDefined();
        expect(sizeIssue?.severity).toBe('high');
    });

    it('should detect oversized images', async () => {
        const mockImages = [
            {
                src: 'https://example.com/huge.webp',
                loading: 'eager',
                width: '100',
                height: '100',
                srcset: '',
                sizes: '',
                alt: 'Huge',
                naturalWidth: 2000,
                naturalHeight: 2000,
                isVisible: true,
                rect: { top: 100, left: 10, width: 100, height: 100 }, // Displayed at 100x100, but is 2000x2000
            },
        ];

        (mockPage.evaluate as any).mockResolvedValue(mockImages);

        const result = await plugin.audit(mockContext);

        const oversizedIssue = result.issues.find(i => i.id === 'oversized-images');
        expect(oversizedIssue).toBeDefined();
        expect(oversizedIssue?.metadata?.imageCount).toBe(1);
    });

    it('should detect offscreen images not lazy loaded', async () => {
        const mockImages = [
            {
                src: 'https://example.com/offscreen.webp',
                loading: 'eager', // Should be lazy
                width: '800',
                height: '600',
                srcset: '',
                sizes: '',
                alt: 'Offscreen',
                naturalWidth: 800,
                naturalHeight: 600,
                isVisible: true,
                rect: { top: 2000, left: 10, width: 800, height: 600 }, // Well below fold (1080 * 1.5 = 1620)
            },
        ];

        (mockPage.evaluate as any).mockResolvedValue(mockImages);

        const result = await plugin.audit(mockContext);

        const lazyIssue = result.issues.find(i => i.id === 'defer-offscreen-images');
        expect(lazyIssue).toBeDefined();
    });

    it('should detect missing responsive attributes for large images', async () => {
        const mockImages = [
            {
                src: 'https://example.com/hero.webp',
                loading: 'eager',
                width: '1200',
                height: '800',
                srcset: undefined, // Missing srcset
                sizes: undefined,
                alt: 'Hero',
                naturalWidth: 1200,
                naturalHeight: 800,
                isVisible: true,
                rect: { top: 0, left: 0, width: 1200, height: 800 },
            },
        ];

        (mockPage.evaluate as any).mockResolvedValue(mockImages);

        const result = await plugin.audit(mockContext);

        const responsiveIssue = result.issues.find(i => i.id === 'responsive-images');
        expect(responsiveIssue).toBeDefined();
    });

    it('should verify metrics calculation', async () => {
        const mockImages = [
            {
                src: 'https://example.com/bad.jpg', // Unoptimized format
                loading: 'eager', // Offscreen but eager
                width: undefined, // Missing size
                height: undefined,
                srcset: undefined, // Missing responsive
                sizes: undefined,
                alt: 'Bad',
                naturalWidth: 2000, // Oversized (displayed at 100)
                naturalHeight: 2000,
                isVisible: true,
                rect: { top: 2000, left: 0, width: 100, height: 100 },
            },
        ];

        (mockPage.evaluate as any).mockResolvedValue(mockImages);

        const result = await plugin.audit(mockContext);

        expect(result.metrics.totalImages).toBe(1);
        expect(result.metrics.unoptimizedFormats).toBe(1);
        expect(result.metrics.missingWidthHeight).toBe(1);
        expect(result.metrics.missingLazyLoading).toBe(1);
        expect(result.metrics.missingResponsive).toBe(0); // Not detected as responsive issue because rect width (100) is < 300
        expect(result.metrics.largeImages).toBe(1);
    });
});
