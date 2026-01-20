/**
 * Signaler - Programmatic API Entry Point
 * 
 * This entry point provides a clean programmatic API for using Signaler
 * without the CLI interface. Ideal for integration into other tools and applications.
 */

// Import types for the API interface
import type { 
  AuditConfig, 
  AuditResult, 
  RunnerConfig,
  ReportGenerator,
  Report,
  ReportMetadata,
  OutputFormat,
  ErrorCategory,
  ErrorSeverity,
  SignalerError
} from './index.js';

// Core functionality for programmatic usage
export * from './core/index.js';

// Audit runners
export * from './runners/index.js';

// Reporting system
export * from './reporting/index.js';

// Infrastructure services (excluding CLI-specific utilities)
export * from './infrastructure/index.js';

// Import additional dependencies for implementation
import { DefaultAuditEngine, DefaultRunnerRegistry } from './core/audit-engine.js';
import { readEngineVersion } from './engine-version.js';

// Main programmatic API interface
/**
 * Primary programmatic interface for Signaler auditing functionality.
 * Provides methods for running audits, creating configurations, and validating settings
 * without requiring the CLI interface.
 * 
 * @example
 * ```typescript
 * import { SignalerAPI, createSignalerAPI } from '@signaler/cli/api';
 * 
 * const api: SignalerAPI = createSignalerAPI();
 * 
 * // Create a configuration
 * const config = api.createConfig({
 *   baseUrl: 'http://localhost:3000',
 *   pages: [
 *     { path: '/', label: 'Home', devices: ['mobile', 'desktop'] }
 *   ]
 * });
 * 
 * // Validate the configuration
 * const validation = api.validateConfig(config);
 * if (!validation.valid) {
 *   console.error('Config errors:', validation.errors);
 *   return;
 * }
 * 
 * // Run the audit
 * const result = await api.audit(config);
 * console.log('Audit completed:', result.meta.completedAt);
 * ```
 */
export interface SignalerAPI {
  /**
   * Run an audit programmatically with the given configuration
   */
  audit(config: AuditConfig): Promise<AuditResult>;
  
  /**
   * Create a default configuration for programmatic usage
   */
  createConfig(options: Partial<AuditConfig>): AuditConfig;
  
  /**
   * Validate a configuration object
   */
  validateConfig(config: AuditConfig): { valid: boolean; errors: string[] };
  
  /**
   * Get the current version of Signaler
   */
  getVersion(): Promise<string>;
}

/**
 * Default implementation of the SignalerAPI interface
 */
class SignalerAPIImpl implements SignalerAPI {
  private auditEngine: DefaultAuditEngine;

  constructor() {
    const runnerRegistry = new DefaultRunnerRegistry();
    this.auditEngine = new DefaultAuditEngine(runnerRegistry);
  }

  async audit(config: AuditConfig): Promise<AuditResult> {
    return await this.auditEngine.runAudit(config);
  }

  createConfig(options: Partial<AuditConfig>): AuditConfig {
    const defaults: AuditConfig = {
      baseUrl: options.baseUrl || 'http://localhost:3000',
      pages: options.pages || [
        { path: '/', label: 'Home', devices: ['mobile', 'desktop'] }
      ],
      runners: options.runners || [
        { name: 'lighthouse' }
      ],
      output: options.output || {
        directory: './signaler-output',
        formats: ['html', 'json'],
        artifacts: true
      },
      parallel: options.parallel || 1,
      timeout: options.timeout || 30000
    };

    return { ...defaults, ...options };
  }

  validateConfig(config: AuditConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      this.auditEngine.validateConfig(config);
      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, errors };
    }
  }

  async getVersion(): Promise<string> {
    try {
      return await readEngineVersion();
    } catch (error) {
      return '2.1.0'; // Fallback version
    }
  }
}

/**
 * Create a new SignalerAPI instance
 */
export function createSignalerAPI(): SignalerAPI {
  return new SignalerAPIImpl();
}

/**
 * Convenience functions for direct usage without creating an API instance
 */

/**
 * Run an audit programmatically with the given configuration
 */
export async function audit(config: AuditConfig): Promise<AuditResult> {
  const api = createSignalerAPI();
  return await api.audit(config);
}

/**
 * Create a default configuration for programmatic usage
 */
export function createConfig(options: Partial<AuditConfig> = {}): AuditConfig {
  const api = createSignalerAPI();
  return api.createConfig(options);
}

/**
 * Validate a configuration object
 */
export function validateConfig(config: AuditConfig): { valid: boolean; errors: string[] } {
  const api = createSignalerAPI();
  return api.validateConfig(config);
}

/**
 * Get the current version of Signaler
 */
export async function getVersion(): Promise<string> {
  const api = createSignalerAPI();
  return await api.getVersion();
}