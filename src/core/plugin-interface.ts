/**
 * Core Plugin Interface - Standardized plugin architecture for multi-audit system
 * 
 * This module defines the core interfaces and types for the pluggable audit system,
 * enabling different audit types (security, accessibility, code quality, UX) to be
 * integrated seamlessly into the Signaler platform.
 */

import type { Page } from 'playwright';

/**
 * Supported audit types in the comprehensive audit system
 */
export type AuditType = 'performance' | 'security' | 'accessibility' | 'code-quality' | 'ux';

/**
 * Issue severity levels used across all audit types
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Device types for audit execution
 */
export type AuditDevice = 'mobile' | 'desktop';

/**
 * Core audit plugin interface that all audit plugins must implement
 */
export interface AuditPlugin {
  /** Unique plugin identifier */
  readonly name: string;
  
  /** Plugin version for compatibility tracking */
  readonly version: string;
  
  /** Audit type this plugin handles */
  readonly type: AuditType;
  
  /** Implementation phase (1, 2, or 3) */
  readonly phase: 1 | 2 | 3;
  
  /** Plugin dependencies (other plugin names that must run first) */
  readonly dependencies: readonly string[];
  
  /**
   * Configure the plugin with provided settings
   * @param config Plugin-specific configuration
   */
  configure(config: PluginConfig): Promise<void>;
  
  /**
   * Execute the audit for a given context
   * @param context Audit execution context with page and shared data
   * @returns Audit results with issues and metrics
   */
  audit(context: AuditContext): Promise<AuditResult>;
  
  /**
   * Cleanup resources after audit completion
   */
  cleanup(): Promise<void>;
  
  /**
   * Validate if the plugin can run with the given configuration
   * @param config Plugin configuration to validate
   * @returns true if configuration is valid
   */
  validate(config: PluginConfig): boolean;
}

/**
 * Plugin-specific configuration interface
 */
export interface PluginConfig {
  /** Whether this plugin is enabled */
  enabled: boolean;
  
  /** Plugin-specific settings */
  settings: Record<string, unknown>;
  
  /** Severity thresholds for different issue types */
  severityThresholds?: Record<string, IssueSeverity>;
  
  /** Timeout for plugin execution in milliseconds */
  timeoutMs?: number;
}

/**
 * Audit execution context shared between plugins
 */
export interface AuditContext {
  /** URL being audited */
  readonly url: string;
  
  /** Playwright page instance for browser interaction */
  readonly page: Page;
  
  /** Device type for this audit */
  readonly device: AuditDevice;
  
  /** Page configuration details */
  readonly pageConfig: {
    path: string;
    label: string;
    scope?: 'public' | 'requires-auth';
  };
  
  /** Shared data between plugins to avoid redundant operations */
  readonly sharedData: Map<string, unknown>;
  
  /** Audit execution metadata */
  readonly metadata: {
    startTime: number;
    buildId?: string;
    environment?: string;
  };
}

/**
 * Individual issue found during audit
 */
export interface Issue {
  /** Unique issue identifier */
  readonly id: string;
  
  /** Audit type that found this issue */
  readonly type: AuditType;
  
  /** Issue severity level */
  readonly severity: IssueSeverity;
  
  /** Impact score (1-100) for prioritization */
  readonly impact: number;
  
  /** Human-readable issue title */
  readonly title: string;
  
  /** Detailed issue description */
  readonly description: string;
  
  /** Pages affected by this issue */
  readonly affectedPages: readonly string[];
  
  /** Guidance for fixing this issue */
  readonly fixGuidance: FixGuidance;
  
  /** WCAG guidelines for accessibility issues */
  readonly wcagGuidelines?: readonly string[];
  
  /** OWASP category for security issues */
  readonly owaspCategory?: string;
  
  /** Additional metadata specific to the issue type */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Fix guidance for resolving issues
 */
export interface FixGuidance {
  /** Estimated difficulty to fix */
  readonly difficulty: 'easy' | 'medium' | 'hard';
  
  /** Estimated time to implement fix */
  readonly estimatedTime: string;
  
  /** Step-by-step implementation instructions */
  readonly implementation: string;
  
  /** Code example demonstrating the fix */
  readonly codeExample?: string;
  
  /** Links to relevant documentation and resources */
  readonly resources: readonly string[];
}

/**
 * Result from a single audit plugin execution
 */
export interface AuditResult {
  /** Plugin that generated this result */
  readonly pluginName: string;
  
  /** Audit type */
  readonly type: AuditType;
  
  /** Issues found during the audit */
  readonly issues: readonly Issue[];
  
  /** Numeric metrics collected */
  readonly metrics: Record<string, number>;
  
  /** Additional metadata from the audit */
  readonly metadata: Record<string, unknown>;
  
  /** Execution time in milliseconds */
  readonly executionTimeMs: number;
  
  /** Whether the audit completed successfully */
  readonly success: boolean;
  
  /** Error message if audit failed */
  readonly error?: string;
}

/**
 * Plugin registration and lifecycle management
 */
export interface PluginRegistry {
  /**
   * Register a new audit plugin
   * @param plugin Plugin instance to register
   */
  register(plugin: AuditPlugin): void;
  
  /**
   * Get a registered plugin by name
   * @param name Plugin name
   * @returns Plugin instance or undefined if not found
   */
  get(name: string): AuditPlugin | undefined;
  
  /**
   * Get all registered plugins
   * @returns Array of all registered plugins
   */
  list(): readonly AuditPlugin[];
  
  /**
   * Get plugins by audit type
   * @param type Audit type to filter by
   * @returns Array of plugins for the specified type
   */
  getByType(type: AuditType): readonly AuditPlugin[];
  
  /**
   * Get plugins by implementation phase
   * @param phase Phase number to filter by
   * @returns Array of plugins for the specified phase
   */
  getByPhase(phase: 1 | 2 | 3): readonly AuditPlugin[];
  
  /**
   * Unregister a plugin
   * @param name Plugin name to unregister
   * @returns true if plugin was found and removed
   */
  unregister(name: string): boolean;
  
  /**
   * Clear all registered plugins
   */
  clear(): void;
}

/**
 * Plugin information for discovery and management
 */
export interface PluginInfo {
  /** Plugin name */
  readonly name: string;
  
  /** Plugin version */
  readonly version: string;
  
  /** Audit type */
  readonly type: AuditType;
  
  /** Implementation phase */
  readonly phase: 1 | 2 | 3;
  
  /** Plugin description */
  readonly description: string;
  
  /** Plugin dependencies */
  readonly dependencies: readonly string[];
  
  /** Whether plugin is currently enabled */
  readonly enabled: boolean;
}