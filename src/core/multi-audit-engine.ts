/**
 * Multi-Audit Engine - Central orchestrator for comprehensive audit system
 * 
 * This module provides the enhanced audit engine that coordinates multiple
 * audit types through the plugin architecture while maintaining backward
 * compatibility with existing Lighthouse-only workflows.
 */

import type { Page } from 'playwright';
import type { 
  AuditPlugin, 
  PluginRegistry, 
  AuditContext, 
  AuditResult, 
  PluginConfig,
  AuditDevice,
  Issue
} from './plugin-interface.js';
import { DefaultPluginRegistry } from './plugin-registry.js';
import { DefaultAuditContext } from './audit-context.js';

/**
 * Configuration for the multi-audit engine
 */
export interface MultiAuditConfig {
  /** Base URL for auditing */
  baseUrl: string;
  
  /** Pages to audit */
  pages: PageConfig[];
  
  /** Plugin configurations */
  plugins: Record<string, PluginConfig>;
  
  /** Execution settings */
  execution: {
    /** Number of parallel audits */
    parallel: number;
    /** Timeout per audit in milliseconds */
    timeout: number;
    /** Number of retries on failure */
    retries: number;
    /** Whether to share data between plugins */
    shareData: boolean;
  };
  
  /** Build and environment metadata */
  metadata?: {
    buildId?: string;
    environment?: string;
    branch?: string;
  };
}

/**
 * Page configuration for auditing
 */
export interface PageConfig {
  path: string;
  label: string;
  devices: readonly AuditDevice[];
  scope?: 'public' | 'requires-auth';
}

/**
 * Result from multi-audit execution
 */
export interface MultiAuditResult {
  /** Execution metadata */
  meta: {
    configPath?: string;
    startedAt: string;
    completedAt: string;
    elapsedMs: number;
    totalPages: number;
    totalPlugins: number;
    enabledPlugins: string[];
  };
  
  /** Results for each page */
  results: PageAuditResult[];
  
  /** Overall execution summary */
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    pluginResults: Record<string, { success: boolean; executionTimeMs: number }>;
  };
}

/**
 * Result for a single page audit
 */
export interface PageAuditResult {
  /** Page configuration */
  page: PageConfig;
  
  /** Device used for audit */
  device: AuditDevice;
  
  /** URL that was audited */
  url: string;
  
  /** Results from each plugin */
  pluginResults: Record<string, AuditResult>;
  
  /** Aggregated issues from all plugins */
  allIssues: AuditResult['issues'];
  
  /** Combined metrics from all plugins */
  combinedMetrics: Record<string, number>;
  
  /** Execution metadata */
  executionMeta: {
    startTime: number;
    endTime: number;
    totalExecutionMs: number;
  };
}

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryOptions {
  /** Maximum retry attempts */
  maxRetries: number;
  
  /** Delay between retries in milliseconds */
  retryDelayMs: number;
  
  /** Whether to continue with other plugins if one fails */
  continueOnPluginFailure: boolean;
  
  /** Whether to continue with other pages if one fails */
  continueOnPageFailure: boolean;
}

/**
 * Enhanced audit engine for multi-audit orchestration
 */
export class MultiAuditEngine {
  private pluginRegistry: PluginRegistry;
  private errorRecoveryOptions: ErrorRecoveryOptions;

  constructor(
    pluginRegistry?: PluginRegistry,
    errorRecoveryOptions?: Partial<ErrorRecoveryOptions>
  ) {
    this.pluginRegistry = pluginRegistry || new DefaultPluginRegistry();
    this.errorRecoveryOptions = {
      maxRetries: 3,
      retryDelayMs: 1000,
      continueOnPluginFailure: true,
      continueOnPageFailure: true,
      ...errorRecoveryOptions
    };
  }

  /**
   * Register a plugin with the engine
   */
  registerPlugin(plugin: AuditPlugin): void {
    this.pluginRegistry.register(plugin);
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): readonly AuditPlugin[] {
    return this.pluginRegistry.list();
  }

  /**
   * Get enabled plugins only
   */
  getEnabledPlugins(): readonly AuditPlugin[] {
    if ('getEnabled' in this.pluginRegistry) {
      return (this.pluginRegistry as DefaultPluginRegistry).getEnabled();
    }
    return this.pluginRegistry.list();
  }

  /**
   * Configure plugins with provided settings
   */
  async configurePlugins(pluginConfigs: Record<string, PluginConfig>): Promise<void> {
    const plugins = this.pluginRegistry.list();
    
    for (const plugin of plugins) {
      const config = pluginConfigs[plugin.name];
      if (config) {
        try {
          if (config.enabled) {
            await plugin.configure(config);
          }
          
          // Set enabled state if registry supports it
          if ('setEnabled' in this.pluginRegistry) {
            (this.pluginRegistry as DefaultPluginRegistry).setEnabled(plugin.name, config.enabled);
          }
        } catch (error) {
          throw new Error(`Failed to configure plugin '${plugin.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  /**
   * Execute comprehensive audit across all enabled plugins
   */
  async executeAudit(config: MultiAuditConfig): Promise<MultiAuditResult> {
    const startTime = Date.now();
    
    // Configure plugins
    await this.configurePlugins(config.plugins);
    
    // Get enabled plugins and resolve execution order
    const enabledPlugins = this.getEnabledPlugins();
    if (enabledPlugins.length === 0) {
      throw new Error('No plugins are enabled for audit execution');
    }

    const orderedPlugins = this.resolvePluginExecutionOrder(enabledPlugins);
    
    // Execute audits for each page
    const results: PageAuditResult[] = [];
    
    for (const page of config.pages) {
      for (const device of page.devices) {
        try {
          const pageResult = await this.auditPage(
            config.baseUrl,
            page,
            device,
            orderedPlugins,
            config.execution,
            config.metadata
          );
          results.push(pageResult);
        } catch (error) {
          if (!this.errorRecoveryOptions.continueOnPageFailure) {
            throw error;
          }
          
          // Create error result for failed page
          const errorResult: PageAuditResult = {
            page,
            device,
            url: `${config.baseUrl}${page.path}`,
            pluginResults: {},
            allIssues: [],
            combinedMetrics: {},
            executionMeta: {
              startTime: Date.now(),
              endTime: Date.now(),
              totalExecutionMs: 0
            }
          };
          results.push(errorResult);
        }
      }
    }

    const endTime = Date.now();
    
    // Generate summary
    const summary = this.generateSummary(results, orderedPlugins);
    
    return {
      meta: {
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        elapsedMs: endTime - startTime,
        totalPages: config.pages.length,
        totalPlugins: orderedPlugins.length,
        enabledPlugins: orderedPlugins.map(p => p.name)
      },
      results,
      summary
    };
  }

  /**
   * Audit a single page with all enabled plugins
   */
  private async auditPage(
    baseUrl: string,
    page: PageConfig,
    device: AuditDevice,
    plugins: readonly AuditPlugin[],
    executionConfig: MultiAuditConfig['execution'],
    metadata?: MultiAuditConfig['metadata']
  ): Promise<PageAuditResult> {
    const startTime = Date.now();
    const url = `${baseUrl}${page.path}`;
    
    // Create audit context (mock page for now - in real implementation would use Playwright)
    const context = new DefaultAuditContext({
      url,
      page: {} as Page, // Mock page object
      device,
      pageConfig: page,
      buildId: metadata?.buildId,
      environment: metadata?.environment
    });

    const pluginResults: Record<string, AuditResult> = {};
    const allIssues: Issue[] = [];
    const combinedMetrics: Record<string, number> = {};

    // Execute plugins in order
    for (const plugin of plugins) {
      try {
        const result = await this.executePluginWithRetry(plugin, context, executionConfig.timeout);
        pluginResults[plugin.name] = result;
        
        // Aggregate issues and metrics
        allIssues.push(...result.issues);
        Object.assign(combinedMetrics, result.metrics);
        
        // Store plugin results in shared data for other plugins
        if (executionConfig.shareData) {
          context.setSharedData(`plugin_result_${plugin.name}`, result);
        }
        
      } catch (error) {
        if (!this.errorRecoveryOptions.continueOnPluginFailure) {
          throw error;
        }
        
        // Create error result for failed plugin
        pluginResults[plugin.name] = {
          pluginName: plugin.name,
          type: plugin.type,
          issues: [],
          metrics: {},
          metadata: {},
          executionTimeMs: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    const endTime = Date.now();

    return {
      page,
      device,
      url,
      pluginResults,
      allIssues,
      combinedMetrics,
      executionMeta: {
        startTime,
        endTime,
        totalExecutionMs: endTime - startTime
      }
    };
  }

  /**
   * Execute a plugin with retry logic
   */
  private async executePluginWithRetry(
    plugin: AuditPlugin,
    context: AuditContext,
    timeoutMs: number
  ): Promise<AuditResult> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.errorRecoveryOptions.maxRetries; attempt++) {
      try {
        // Add timeout wrapper
        const result = await Promise.race([
          plugin.audit(context),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Plugin '${plugin.name}' timed out after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.errorRecoveryOptions.maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.errorRecoveryOptions.retryDelayMs));
        }
      }
    }
    
    throw lastError || new Error(`Plugin '${plugin.name}' failed after ${this.errorRecoveryOptions.maxRetries + 1} attempts`);
  }

  /**
   * Resolve plugin execution order based on dependencies
   */
  private resolvePluginExecutionOrder(plugins: readonly AuditPlugin[]): AuditPlugin[] {
    if ('resolveExecutionOrder' in this.pluginRegistry) {
      return (this.pluginRegistry as DefaultPluginRegistry).resolveExecutionOrder(plugins);
    }
    
    // Fallback: simple topological sort
    const resolved: AuditPlugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (plugin: AuditPlugin): void => {
      if (visited.has(plugin.name)) return;
      if (visiting.has(plugin.name)) {
        throw new Error(`Circular dependency detected involving plugin '${plugin.name}'`);
      }
      
      visiting.add(plugin.name);
      
      // Visit dependencies first
      for (const depName of plugin.dependencies) {
        const dependency = plugins.find(p => p.name === depName);
        if (dependency) {
          visit(dependency);
        }
      }
      
      visiting.delete(plugin.name);
      visited.add(plugin.name);
      resolved.push(plugin);
    };
    
    for (const plugin of plugins) {
      visit(plugin);
    }
    
    return resolved;
  }

  /**
   * Generate execution summary
   */
  private generateSummary(
    results: readonly PageAuditResult[],
    plugins: readonly AuditPlugin[]
  ): MultiAuditResult['summary'] {
    let totalIssues = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;
    
    const pluginResults: Record<string, { success: boolean; executionTimeMs: number }> = {};
    
    // Initialize plugin results
    for (const plugin of plugins) {
      pluginResults[plugin.name] = { success: true, executionTimeMs: 0 };
    }
    
    // Aggregate results
    for (const result of results) {
      totalIssues += result.allIssues.length;
      
      for (const issue of result.allIssues) {
        switch (issue.severity) {
          case 'critical': criticalIssues++; break;
          case 'high': highIssues++; break;
          case 'medium': mediumIssues++; break;
          case 'low': lowIssues++; break;
        }
      }
      
      // Update plugin execution stats
      for (const [pluginName, pluginResult] of Object.entries(result.pluginResults)) {
        if (pluginResults[pluginName]) {
          pluginResults[pluginName].success = pluginResults[pluginName].success && pluginResult.success;
          pluginResults[pluginName].executionTimeMs += pluginResult.executionTimeMs;
        }
      }
    }
    
    return {
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      pluginResults
    };
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    const plugins = this.pluginRegistry.list();
    
    await Promise.allSettled(
      plugins.map(plugin => plugin.cleanup())
    );
  }

  /**
   * Validate configuration
   */
  validateConfig(config: MultiAuditConfig): void {
    if (!config.baseUrl || typeof config.baseUrl !== 'string') {
      throw new Error('Invalid configuration: baseUrl must be a non-empty string');
    }
    
    if (!Array.isArray(config.pages) || config.pages.length === 0) {
      throw new Error('Invalid configuration: pages must be a non-empty array');
    }
    
    if (!config.plugins || typeof config.plugins !== 'object') {
      throw new Error('Invalid configuration: plugins must be an object');
    }
    
    if (!config.execution || typeof config.execution !== 'object') {
      throw new Error('Invalid configuration: execution must be an object');
    }
    
    // Validate pages
    for (const page of config.pages) {
      if (!page.path || typeof page.path !== 'string') {
        throw new Error('Invalid page configuration: path must be a non-empty string');
      }
      
      if (!page.label || typeof page.label !== 'string') {
        throw new Error('Invalid page configuration: label must be a non-empty string');
      }
      
      if (!Array.isArray(page.devices) || page.devices.length === 0) {
        throw new Error('Invalid page configuration: devices must be a non-empty array');
      }
    }
    
    // Validate execution config
    const exec = config.execution;
    if (typeof exec.parallel !== 'number' || exec.parallel < 1) {
      throw new Error('Invalid execution configuration: parallel must be a positive number');
    }
    
    if (typeof exec.timeout !== 'number' || exec.timeout < 1000) {
      throw new Error('Invalid execution configuration: timeout must be at least 1000ms');
    }
    
    if (typeof exec.retries !== 'number' || exec.retries < 0) {
      throw new Error('Invalid execution configuration: retries must be a non-negative number');
    }
  }
}