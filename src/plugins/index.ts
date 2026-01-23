import { EnhancedAccessibilityPlugin } from './accessibility/enhanced-accessibility-plugin.js';
import { SecurityHeadersPlugin } from './security/security-headers-plugin.js';
import { ImageOptimizationPlugin } from './performance/image-optimization-plugin.js';
import { BundleAnalysisPlugin } from './code-quality/bundle-analysis-plugin.js';
import { FontPerformancePlugin } from './performance/font-performance-plugin.js';
import { SEODeepPlugin } from './seo/seo-deep-plugin.js';
import { PWAEnhancedPlugin } from './pwa/pwa-enhanced-plugin.js';
import type { AuditPlugin } from '../core/plugin-interface.js';

/**
 * Plugin registry for all available audit plugins
 * 
 * This module exports all plugins and provides a factory function
 * to create plugin instances for the multi-audit engine.
 */

/**
 * Get all available plugins for Phase 1
 * @returns Array of plugin instances
 */
export function getPhase1Plugins(): AuditPlugin[] {
    return [
        new EnhancedAccessibilityPlugin(),
        new SecurityHeadersPlugin(),
    ];
}

/**
 * Get all available plugins (all phases)
 * @returns Array of plugin instances
 */
export function getAllPlugins(): AuditPlugin[] {
    return [
        ...getPhase1Plugins(),
        ...getPhase2Plugins(),
        ...getPhase3Plugins(),
    ];
}

/**
 * Get plugin by name
 * @param name Plugin name
 * @returns Plugin instance or undefined
 */
export function getPluginByName(name: string): AuditPlugin | undefined {
    const allPlugins = getAllPlugins();
    return allPlugins.find((plugin) => plugin.name === name);
}

// ...
export { EnhancedAccessibilityPlugin, SecurityHeadersPlugin, ImageOptimizationPlugin, BundleAnalysisPlugin, FontPerformancePlugin, SEODeepPlugin, PWAEnhancedPlugin };

/**
 * Get all available plugins for Phase 2
 * @returns Array of plugin instances
 */
export function getPhase2Plugins(): AuditPlugin[] {
    return [
        new ImageOptimizationPlugin(),
        new BundleAnalysisPlugin(),
        new FontPerformancePlugin(),
    ];
}

/**
 * Get all available plugins for Phase 3
 * @returns Array of plugin instances
 */
export function getPhase3Plugins(): AuditPlugin[] {
    return [
        new SEODeepPlugin(),
        new PWAEnhancedPlugin(),
    ];
}



