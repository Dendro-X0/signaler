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

type ImageDetails = {
    src: string;
    loading?: string;
    width?: string | number;
    height?: string | number;
    srcset?: string;
    sizes?: string;
    alt?: string;
    naturalWidth: number;
    naturalHeight: number;
    isVisible: boolean;
    rect: { top: number; left: number; width: number; height: number };
};

type ImageMetrics = {
    totalImages: number;
    unoptimizedFormats: number;
    missingWidthHeight: number;
    missingLazyLoading: number;
    missingResponsive: number;
    largeImages: number;
};

/**
 * Image Optimization Plugin
 * 
 * Analyzes images for performance optimization opportunities:
 * - Modern format usage (WebP/AVIF)
 * - Explicit width/height to prevent CLS
 * - Lazy loading for off-screen images
 * - Responsive image sizing (srcset/sizes)
 * - Image dimensions vs display size
 */
export class ImageOptimizationPlugin implements AuditPlugin {
    public readonly name = 'image-optimization';
    public readonly version = '1.0.0';
    public readonly type = 'performance' as const;
    public readonly phase = 2 as const;
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
        const { page } = context;

        try {
            // Collect image details from the page
            const images = await this.collectImageDetails(page);

            // Analyze images for issues
            this.analyzeFormats(images, issues);
            this.analyzeSizing(images, issues);
            this.analyzeLazyLoading(images, issues, page.viewportSize()?.height || 1080);
            this.analyzeResponsive(images, issues);

            // Calculate metrics
            const metrics = this.calculateMetrics(images, issues);

            return {
                pluginName: this.name,
                type: this.type,
                issues,
                metrics: metrics as unknown as Record<string, number>,
                metadata: {
                    totalImages: images.length,
                },
                executionTimeMs: Date.now() - startTime,
                success: true,
            };
        } catch (error) {
            console.error('Image optimization audit failed:', error);
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

    public async cleanup(): Promise<void> {
        // No lookup to cleanup
    }

    private async collectImageDetails(page: Page): Promise<ImageDetails[]> {
        return page.evaluate(() => {
            const imgElements = Array.from(document.querySelectorAll('img'));
            return imgElements.map((img) => {
                const rect = img.getBoundingClientRect();
                return {
                    src: img.src,
                    loading: img.getAttribute('loading') || undefined,
                    width: img.getAttribute('width') || undefined,
                    height: img.getAttribute('height') || undefined,
                    srcset: img.getAttribute('srcset') || undefined,
                    sizes: img.getAttribute('sizes') || undefined,
                    alt: img.getAttribute('alt') || undefined,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    isVisible: rect.width > 0 && rect.height > 0 && window.getComputedStyle(img).display !== 'none' && window.getComputedStyle(img).visibility !== 'hidden',
                    rect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                    },
                };
            });
        });
    }

    private analyzeFormats(images: ImageDetails[], issues: Issue[]): void {
        const modernFormats = ['.webp', '.avif', '.svg'];
        const legacyImages = images.filter(img => {
            if (!img.src) return false;
            // Skip data URIs and blobs for format check
            if (img.src.startsWith('data:') || img.src.startsWith('blob:')) return false;
            const lowerSrc = img.src.toLowerCase();
            // Check if it does NOT end with modern extensions
            return !modernFormats.some(ext => lowerSrc.includes(ext));
        });

        if (legacyImages.length > 0) {
            issues.push({
                id: 'use-modern-image-formats',
                type: 'performance',
                severity: 'medium',
                impact: 60,
                title: 'Serve images in modern formats',
                description: `Found ${legacyImages.length} images not using WebP or AVIF formats. Modern formats provide better compression.`,
                affectedPages: [legacyImages[0].src], // Just listing the first one as example/context
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '30m',
                    implementation: 'Convert images to WebP or AVIF. Use the <picture> element or modern image CDN features to serve them.',
                    codeExample: `
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description">
</picture>
                    `,
                    resources: ['https://web.dev/serve-images-in-next-gen-formats/'],
                },
                metadata: {
                    imageCount: legacyImages.length,
                    examples: legacyImages.slice(0, 5).map(i => i.src),
                },
            });
        }
    }

    private analyzeSizing(images: ImageDetails[], issues: Issue[]): void {
        const unsizedImages = images.filter(img =>
            img.isVisible && (!img.width || !img.height)
        );

        if (unsizedImages.length > 0) {
            issues.push({
                id: 'image-size-attributes',
                type: 'performance',
                severity: 'high',
                impact: 80,
                title: 'Image elements missing width and height attributes',
                description: `Found ${unsizedImages.length} visible images without explicit width and height attributes, which can cause Cumulative Layout Shift (CLS).`,
                affectedPages: [unsizedImages[0].src],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '15m',
                    implementation: 'Add width and height attributes to all <img> tags to reserve space before the image loads.',
                    codeExample: '<img src="example.jpg" width="800" height="600" alt="...">',
                    resources: ['https://web.dev/optimize-cls/#images-without-dimensions'],
                },
                metadata: {
                    imageCount: unsizedImages.length,
                    examples: unsizedImages.slice(0, 5).map(i => i.src),
                },
            });
        }

        // Check for oversized images (display size significantly smaller than natural size)
        const oversizedImages = images.filter(img => {
            if (!img.isVisible || img.naturalWidth === 0) return false;
            // Allow 1.5x buffer for retina/high-DPI screens
            const widthRatio = img.naturalWidth / img.rect.width;
            const heightRatio = img.naturalHeight / img.rect.height;
            return widthRatio > 2 || heightRatio > 2; // Strict check for > 2x sizing
        });

        if (oversizedImages.length > 0) {
            issues.push({
                id: 'oversized-images',
                type: 'performance',
                severity: 'medium',
                impact: 50,
                title: 'Properly size images',
                description: `Found ${oversizedImages.length} images that are significantly larger than their display size.`,
                affectedPages: [oversizedImages[0].src],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '20m',
                    implementation: 'Resize images to match their display dimensions or use responsive images (srcset) to serve appropriate sizes.',
                    resources: ['https://web.dev/serve-images-with-correct-dimensions/'],
                },
                metadata: {
                    imageCount: oversizedImages.length,
                    examples: oversizedImages.slice(0, 5).map(i => i.src),
                },
            });
        }
    }

    private analyzeLazyLoading(images: ImageDetails[], issues: Issue[], viewportHeight: number): void {
        const nonLazyOffscreenImages = images.filter(img => {
            // Check if image is well below the fold (e.g., 2 viewports down) and not using lazy loading
            const isBelowFold = img.rect.top > viewportHeight * 1.5;
            const isLazy = img.loading === 'lazy';
            return isBelowFold && !isLazy;
        });

        if (nonLazyOffscreenImages.length > 0) {
            issues.push({
                id: 'defer-offscreen-images',
                type: 'performance',
                severity: 'medium',
                impact: 40,
                title: 'Defer offscreen images',
                description: `Found ${nonLazyOffscreenImages.length} offscreen images that are not lazily loaded.`,
                affectedPages: [nonLazyOffscreenImages[0].src],
                fixGuidance: {
                    difficulty: 'easy',
                    estimatedTime: '5m',
                    implementation: 'Add loading="lazy" attribute to images that are below the fold.',
                    codeExample: '<img src="..." loading="lazy" alt="...">',
                    resources: ['https://web.dev/browser-level-image-lazy-loading/'],
                },
                metadata: {
                    imageCount: nonLazyOffscreenImages.length,
                    examples: nonLazyOffscreenImages.slice(0, 5).map(i => i.src),
                },
            });
        }
    }

    private analyzeResponsive(images: ImageDetails[], issues: Issue[]): void {
        // Only check large images or images that change size significantly
        const potentialResponsiveImages = images.filter(img =>
            img.isVisible && img.rect.width > 300 // Arbitrary threshold for images that likely need responsiveness
        );

        const missingResponsive = potentialResponsiveImages.filter(img => !img.srcset);

        if (missingResponsive.length > 0) {
            issues.push({
                id: 'responsive-images',
                type: 'performance',
                severity: 'low',
                impact: 30,
                title: 'Serve responsive images',
                description: `Found ${missingResponsive.length} large images missing srcset attributes.`,
                affectedPages: [missingResponsive[0].src],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '45m',
                    implementation: 'Use srcset and sizes attributes to serve appropriate image sizes for different viewports.',
                    codeExample: '<img srcset="small.jpg 500w, large.jpg 1000w" sizes="(max-width: 600px) 480px, 800px" src="large.jpg" alt="...">',
                    resources: ['https://web.dev/responsive-images/'],
                },
                metadata: {
                    imageCount: missingResponsive.length,
                    examples: missingResponsive.slice(0, 5).map(i => i.src),
                },
            });
        }
    }

    private calculateMetrics(images: ImageDetails[], issues: Issue[]): ImageMetrics {
        return {
            totalImages: images.length,
            unoptimizedFormats: issues.find(i => i.id === 'use-modern-image-formats')?.metadata?.imageCount as number || 0,
            missingWidthHeight: issues.find(i => i.id === 'image-size-attributes')?.metadata?.imageCount as number || 0,
            missingLazyLoading: issues.find(i => i.id === 'defer-offscreen-images')?.metadata?.imageCount as number || 0,
            missingResponsive: issues.find(i => i.id === 'responsive-images')?.metadata?.imageCount as number || 0,
            largeImages: issues.find(i => i.id === 'oversized-images')?.metadata?.imageCount as number || 0,
        };
    }
}
