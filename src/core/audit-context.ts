/**
 * Audit Context - Shared execution context for audit plugins
 * 
 * This module provides the audit context implementation that enables
 * data sharing and coordination between different audit plugins.
 */

import type { Page } from 'playwright';
import type { AuditContext, AuditDevice } from './plugin-interface.js';

/**
 * Implementation of the audit context for plugin execution
 */
export class DefaultAuditContext implements AuditContext {
  public readonly url: string;
  public readonly page: Page;
  public readonly device: AuditDevice;
  public readonly pageConfig: {
    path: string;
    label: string;
    scope?: 'public' | 'requires-auth';
  };
  public readonly sharedData: Map<string, unknown>;
  public readonly metadata: {
    startTime: number;
    buildId?: string;
    environment?: string;
  };

  constructor(options: {
    url: string;
    page: Page;
    device: AuditDevice;
    pageConfig: {
      path: string;
      label: string;
      scope?: 'public' | 'requires-auth';
    };
    buildId?: string;
    environment?: string;
  }) {
    this.url = options.url;
    this.page = options.page;
    this.device = options.device;
    this.pageConfig = options.pageConfig;
    this.sharedData = new Map();
    this.metadata = {
      startTime: Date.now(),
      buildId: options.buildId,
      environment: options.environment
    };
  }

  /**
   * Store data that can be shared between plugins
   */
  setSharedData<T>(key: string, value: T): void {
    this.sharedData.set(key, value);
  }

  /**
   * Retrieve shared data by key
   */
  getSharedData<T>(key: string): T | undefined {
    return this.sharedData.get(key) as T | undefined;
  }

  /**
   * Check if shared data exists for a key
   */
  hasSharedData(key: string): boolean {
    return this.sharedData.has(key);
  }

  /**
   * Remove shared data by key
   */
  removeSharedData(key: string): boolean {
    return this.sharedData.delete(key);
  }

  /**
   * Clear all shared data
   */
  clearSharedData(): void {
    this.sharedData.clear();
  }

  /**
   * Get all shared data keys
   */
  getSharedDataKeys(): string[] {
    return Array.from(this.sharedData.keys());
  }

  /**
   * Get execution time since context creation
   */
  getExecutionTime(): number {
    return Date.now() - this.metadata.startTime;
  }

  /**
   * Create a snapshot of the current context state for debugging
   */
  createSnapshot(): {
    url: string;
    device: AuditDevice;
    pageConfig: {
      path: string;
      label: string;
      scope?: 'public' | 'requires-auth';
    };
    sharedDataKeys: string[];
    executionTime: number;
    metadata: {
      startTime: number;
      buildId?: string;
      environment?: string;
    };
  } {
    return {
      url: this.url,
      device: this.device,
      pageConfig: { ...this.pageConfig },
      sharedDataKeys: this.getSharedDataKeys(),
      executionTime: this.getExecutionTime(),
      metadata: { ...this.metadata }
    };
  }
}

/**
 * Shared data keys used by core plugins to avoid conflicts
 */
export const SharedDataKeys = {
  // DOM and page analysis
  DOM_SNAPSHOT: 'dom_snapshot',
  PAGE_METRICS: 'page_metrics',
  NETWORK_REQUESTS: 'network_requests',
  
  // Security analysis
  SECURITY_HEADERS: 'security_headers',
  TLS_INFO: 'tls_info',
  CSP_POLICY: 'csp_policy',
  
  // Accessibility analysis
  AXE_RESULTS: 'axe_results',
  COLOR_ANALYSIS: 'color_analysis',
  ARIA_TREE: 'aria_tree',
  
  // Performance data
  LIGHTHOUSE_RESULTS: 'lighthouse_results',
  CORE_WEB_VITALS: 'core_web_vitals',
  RESOURCE_TIMING: 'resource_timing',
  
  // Code quality
  HTML_VALIDATION: 'html_validation',
  BUNDLE_ANALYSIS: 'bundle_analysis',
  PWA_MANIFEST: 'pwa_manifest',
  
  // UX evaluation
  SCREENSHOTS: 'screenshots',
  LAYOUT_METRICS: 'layout_metrics',
  FORM_ANALYSIS: 'form_analysis'
} as const;

/**
 * Type-safe shared data access helpers
 */
export class SharedDataHelper {
  constructor(private context: AuditContext) {}

  /**
   * Store DOM snapshot for reuse across plugins
   */
  setDOMSnapshot(snapshot: string): void {
    this.context.sharedData.set(SharedDataKeys.DOM_SNAPSHOT, snapshot);
  }

  /**
   * Get DOM snapshot if available
   */
  getDOMSnapshot(): string | undefined {
    return this.context.sharedData.get(SharedDataKeys.DOM_SNAPSHOT) as string | undefined;
  }

  /**
   * Store page metrics for reuse
   */
  setPageMetrics(metrics: Record<string, number>): void {
    this.context.sharedData.set(SharedDataKeys.PAGE_METRICS, metrics);
  }

  /**
   * Get page metrics if available
   */
  getPageMetrics(): Record<string, number> | undefined {
    return this.context.sharedData.get(SharedDataKeys.PAGE_METRICS) as Record<string, number> | undefined;
  }

  /**
   * Store network requests for analysis
   */
  setNetworkRequests(requests: unknown[]): void {
    this.context.sharedData.set(SharedDataKeys.NETWORK_REQUESTS, requests);
  }

  /**
   * Get network requests if available
   */
  getNetworkRequests(): unknown[] | undefined {
    return this.context.sharedData.get(SharedDataKeys.NETWORK_REQUESTS) as unknown[] | undefined;
  }

  /**
   * Store security headers for reuse
   */
  setSecurityHeaders(headers: Record<string, string>): void {
    this.context.sharedData.set(SharedDataKeys.SECURITY_HEADERS, headers);
  }

  /**
   * Get security headers if available
   */
  getSecurityHeaders(): Record<string, string> | undefined {
    return this.context.sharedData.get(SharedDataKeys.SECURITY_HEADERS) as Record<string, string> | undefined;
  }

  /**
   * Store Lighthouse results for cross-plugin access
   */
  setLighthouseResults(results: unknown): void {
    this.context.sharedData.set(SharedDataKeys.LIGHTHOUSE_RESULTS, results);
  }

  /**
   * Get Lighthouse results if available
   */
  getLighthouseResults(): unknown | undefined {
    return this.context.sharedData.get(SharedDataKeys.LIGHTHOUSE_RESULTS);
  }
}