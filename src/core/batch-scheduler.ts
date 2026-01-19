/**
 * Batch Scheduler - Intelligent execution planning for multi-audit system
 * 
 * This module provides intelligent scheduling and execution optimization for
 * running multiple audit types in parallel while managing dependencies and
 * shared resources efficiently.
 */

import type { 
  AuditPlugin, 
  AuditContext, 
  AuditResult,
  AuditDevice
} from './plugin-interface.js';
import type { PageConfig } from './multi-audit-engine.js';

/**
 * Execution plan for a batch of audits
 */
export interface ExecutionPlan {
  /** Total number of execution steps */
  totalSteps: number;
  
  /** Execution batches organized by dependency levels */
  batches: ExecutionBatch[];
  
  /** Estimated total execution time in milliseconds */
  estimatedTimeMs: number;
  
  /** Resource requirements */
  resourceRequirements: {
    maxConcurrentPages: number;
    maxConcurrentPlugins: number;
    estimatedMemoryMB: number;
  };
}

/**
 * A batch of audits that can be executed in parallel
 */
export interface ExecutionBatch {
  /** Batch identifier */
  id: string;
  
  /** Execution tasks in this batch */
  tasks: ExecutionTask[];
  
  /** Dependencies that must complete before this batch */
  dependencies: string[];
  
  /** Estimated execution time for this batch */
  estimatedTimeMs: number;
}

/**
 * Individual execution task
 */
export interface ExecutionTask {
  /** Task identifier */
  id: string;
  
  /** Plugin to execute */
  plugin: AuditPlugin;
  
  /** Page configuration */
  page: PageConfig;
  
  /** Device type */
  device: AuditDevice;
  
  /** URL to audit */
  url: string;
  
  /** Shared data keys this task will produce */
  produces: string[];
  
  /** Shared data keys this task requires */
  requires: string[];
  
  /** Estimated execution time */
  estimatedTimeMs: number;
}

/**
 * Execution result for a batch
 */
export interface BatchExecutionResult {
  /** Batch identifier */
  batchId: string;
  
  /** Task results */
  taskResults: Map<string, AuditResult>;
  
  /** Execution metadata */
  metadata: {
    startTime: number;
    endTime: number;
    actualTimeMs: number;
    successfulTasks: number;
    failedTasks: number;
  };
  
  /** Shared data produced by this batch */
  sharedData: Map<string, unknown>;
}

/**
 * Scheduling options
 */
export interface SchedulingOptions {
  /** Maximum number of parallel pages */
  maxParallelPages: number;
  
  /** Maximum number of parallel plugins per page */
  maxParallelPlugins: number;
  
  /** Whether to enable data sharing optimizations */
  enableDataSharing: boolean;
  
  /** Resource constraints */
  resourceLimits: {
    maxMemoryMB: number;
    maxConcurrentTasks: number;
  };
  
  /** Timeout settings */
  timeouts: {
    taskTimeoutMs: number;
    batchTimeoutMs: number;
  };
}

/**
 * Data sharing configuration
 */
export interface DataSharingConfig {
  /** Keys that can be shared between plugins */
  shareableKeys: string[];
  
  /** Plugin data dependencies */
  dependencies: Record<string, string[]>;
  
  /** Data expiration times */
  expirationMs: Record<string, number>;
}

/**
 * Intelligent batch scheduler for multi-audit execution
 */
export class BatchScheduler {
  private dataSharingConfig: DataSharingConfig;
  
  constructor(dataSharingConfig?: Partial<DataSharingConfig>) {
    this.dataSharingConfig = {
      shareableKeys: [
        'dom_snapshot',
        'page_metrics',
        'network_requests',
        'security_headers',
        'lighthouse_results',
        'screenshots'
      ],
      dependencies: {
        'security-plugin': ['network_requests', 'security_headers'],
        'accessibility-plugin': ['dom_snapshot', 'lighthouse_results'],
        'code-quality-plugin': ['dom_snapshot', 'network_requests'],
        'ux-plugin': ['screenshots', 'page_metrics']
      },
      expirationMs: {
        'dom_snapshot': 300000, // 5 minutes
        'page_metrics': 600000, // 10 minutes
        'network_requests': 300000, // 5 minutes
        'screenshots': 900000 // 15 minutes
      },
      ...dataSharingConfig
    };
  }

  /**
   * Create an execution plan for the given pages and plugins
   */
  async createExecutionPlan(
    pages: readonly PageConfig[],
    plugins: readonly AuditPlugin[],
    options: SchedulingOptions
  ): Promise<ExecutionPlan> {
    // Generate all execution tasks
    const tasks = this.generateExecutionTasks(pages, plugins);
    
    // Resolve plugin dependencies
    const dependencyOrder = this.resolvePluginDependencies(plugins);
    
    // Optimize task scheduling with data sharing
    const optimizedTasks = this.optimizeDataSharing(tasks, dependencyOrder);
    
    // Create execution batches
    const batches = this.createExecutionBatches(optimizedTasks, options);
    
    // Calculate resource requirements
    const resourceRequirements = this.calculateResourceRequirements(batches, options);
    
    // Estimate total execution time
    const estimatedTimeMs = this.estimateExecutionTime(batches);
    
    return {
      totalSteps: tasks.length,
      batches,
      estimatedTimeMs,
      resourceRequirements
    };
  }

  /**
   * Execute a batch of tasks in parallel
   */
  async executeBatch(
    batch: ExecutionBatch,
    contexts: Map<string, AuditContext>,
    options: SchedulingOptions
  ): Promise<BatchExecutionResult> {
    const startTime = Date.now();
    const taskResults = new Map<string, AuditResult>();
    const sharedData = new Map<string, unknown>();
    let successfulTasks = 0;
    let failedTasks = 0;

    // Execute tasks in parallel with concurrency limits
    const semaphore = new Semaphore(options.resourceLimits.maxConcurrentTasks);
    
    const taskPromises = batch.tasks.map(async (task) => {
      await semaphore.acquire();
      
      try {
        const context = contexts.get(`${task.page.path}-${task.device}`);
        if (!context) {
          throw new Error(`No context found for ${task.page.path}-${task.device}`);
        }

        // Wait for required shared data
        await this.waitForRequiredData(context, task.requires);
        
        // Execute the plugin
        const result = await this.executeTaskWithTimeout(
          task,
          context,
          options.timeouts.taskTimeoutMs
        );
        
        taskResults.set(task.id, result);
        
        // Store produced shared data
        this.storeProducedData(context, task.produces, result, sharedData);
        
        successfulTasks++;
        return result;
        
      } catch (error) {
        failedTasks++;
        
        // Create error result
        const errorResult: AuditResult = {
          pluginName: task.plugin.name,
          type: task.plugin.type,
          issues: [],
          metrics: {},
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          executionTimeMs: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        taskResults.set(task.id, errorResult);
        return errorResult;
        
      } finally {
        semaphore.release();
      }
    });

    // Wait for all tasks to complete
    await Promise.allSettled(taskPromises);
    
    const endTime = Date.now();

    return {
      batchId: batch.id,
      taskResults,
      metadata: {
        startTime,
        endTime,
        actualTimeMs: endTime - startTime,
        successfulTasks,
        failedTasks
      },
      sharedData
    };
  }

  /**
   * Generate execution tasks for all page/plugin combinations
   */
  private generateExecutionTasks(
    pages: readonly PageConfig[],
    plugins: readonly AuditPlugin[]
  ): ExecutionTask[] {
    const tasks: ExecutionTask[] = [];
    
    for (const page of pages) {
      for (const device of page.devices) {
        for (const plugin of plugins) {
          const taskId = `${plugin.name}-${page.path}-${device}`;
          const url = page.path; // Will be combined with baseUrl later
          
          // Determine data dependencies
          const requires = this.dataSharingConfig.dependencies[plugin.name] || [];
          const produces = this.getProducedDataKeys(plugin);
          
          tasks.push({
            id: taskId,
            plugin,
            page,
            device,
            url,
            produces,
            requires,
            estimatedTimeMs: this.estimatePluginExecutionTime(plugin, page, device)
          });
        }
      }
    }
    
    return tasks;
  }

  /**
   * Resolve plugin execution order based on dependencies
   */
  private resolvePluginDependencies(plugins: readonly AuditPlugin[]): AuditPlugin[] {
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
   * Optimize task scheduling based on data sharing opportunities
   */
  private optimizeDataSharing(
    tasks: ExecutionTask[],
    dependencyOrder: readonly AuditPlugin[]
  ): ExecutionTask[] {
    // Group tasks by page and device for data sharing optimization
    const taskGroups = new Map<string, ExecutionTask[]>();
    
    for (const task of tasks) {
      const groupKey = `${task.page.path}-${task.device}`;
      if (!taskGroups.has(groupKey)) {
        taskGroups.set(groupKey, []);
      }
      taskGroups.get(groupKey)!.push(task);
    }

    // Optimize each group
    const optimizedTasks: ExecutionTask[] = [];
    
    for (const [groupKey, groupTasks] of taskGroups) {
      // Sort tasks by plugin dependency order
      const sortedTasks = groupTasks.sort((a, b) => {
        const aIndex = dependencyOrder.findIndex(p => p.name === a.plugin.name);
        const bIndex = dependencyOrder.findIndex(p => p.name === b.plugin.name);
        return aIndex - bIndex;
      });

      // Update data requirements based on what previous tasks produce
      const availableData = new Set<string>();
      
      for (const task of sortedTasks) {
        // Filter requirements to only include data not yet available
        task.requires = task.requires.filter(key => !availableData.has(key));
        
        // Add produced data to available set
        for (const key of task.produces) {
          availableData.add(key);
        }
      }

      optimizedTasks.push(...sortedTasks);
    }

    return optimizedTasks;
  }

  /**
   * Create execution batches based on dependencies and parallelization opportunities
   */
  private createExecutionBatches(
    tasks: ExecutionTask[],
    options: SchedulingOptions
  ): ExecutionBatch[] {
    const batches: ExecutionBatch[] = [];
    const remainingTasks = [...tasks];
    let batchIndex = 0;

    while (remainingTasks.length > 0) {
      const batchId = `batch-${batchIndex++}`;
      const batchTasks: ExecutionTask[] = [];
      const batchDependencies: string[] = [];

      // Find tasks that can be executed in this batch
      for (let i = remainingTasks.length - 1; i >= 0; i--) {
        const task = remainingTasks[i];
        
        // Check if all required data will be available
        const canExecute = task.requires.every(key => 
          this.isDataAvailableInPreviousBatches(key, batches) ||
          batchTasks.some(t => t.produces.includes(key))
        );

        if (canExecute && batchTasks.length < options.maxParallelPlugins) {
          batchTasks.push(task);
          remainingTasks.splice(i, 1);
          
          // Add dependencies
          for (const dep of task.plugin.dependencies) {
            if (!batchDependencies.includes(dep)) {
              batchDependencies.push(dep);
            }
          }
        }
      }

      if (batchTasks.length === 0) {
        // Deadlock detection - force execution of at least one task
        const forcedTask = remainingTasks.shift();
        if (forcedTask) {
          batchTasks.push(forcedTask);
        }
      }

      const estimatedTimeMs = Math.max(...batchTasks.map(t => t.estimatedTimeMs));

      batches.push({
        id: batchId,
        tasks: batchTasks,
        dependencies: batchDependencies,
        estimatedTimeMs
      });
    }

    return batches;
  }

  /**
   * Calculate resource requirements for the execution plan
   */
  private calculateResourceRequirements(
    batches: ExecutionBatch[],
    options: SchedulingOptions
  ): ExecutionPlan['resourceRequirements'] {
    const maxConcurrentPages = Math.min(
      Math.max(...batches.map(b => new Set(b.tasks.map(t => t.page.path)).size)),
      options.maxParallelPages
    );

    const maxConcurrentPlugins = Math.min(
      Math.max(...batches.map(b => b.tasks.length)),
      options.maxParallelPlugins
    );

    // Estimate memory usage (simplified calculation)
    const estimatedMemoryMB = Math.min(
      maxConcurrentPages * 100 + maxConcurrentPlugins * 50, // Base memory per page/plugin
      options.resourceLimits.maxMemoryMB
    );

    return {
      maxConcurrentPages,
      maxConcurrentPlugins,
      estimatedMemoryMB
    };
  }

  /**
   * Estimate total execution time for all batches
   */
  private estimateExecutionTime(batches: ExecutionBatch[]): number {
    // Batches execute sequentially, tasks within batches execute in parallel
    return batches.reduce((total, batch) => total + batch.estimatedTimeMs, 0);
  }

  /**
   * Execute a single task with timeout
   */
  private async executeTaskWithTimeout(
    task: ExecutionTask,
    context: AuditContext,
    timeoutMs: number
  ): Promise<AuditResult> {
    return Promise.race([
      task.plugin.audit(context),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Task ${task.id} timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Wait for required shared data to become available
   */
  private async waitForRequiredData(
    context: AuditContext,
    requiredKeys: string[],
    maxWaitMs: number = 30000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const allAvailable = requiredKeys.every(key => context.sharedData.has(key));
      if (allAvailable) {
        return;
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const missingKeys = requiredKeys.filter(key => !context.sharedData.has(key));
    throw new Error(`Timeout waiting for required data: ${missingKeys.join(', ')}`);
  }

  /**
   * Store produced data in shared context
   */
  private storeProducedData(
    context: AuditContext,
    producedKeys: string[],
    result: AuditResult,
    sharedData: Map<string, unknown>
  ): void {
    for (const key of producedKeys) {
      if (this.dataSharingConfig.shareableKeys.includes(key)) {
        const data = this.extractDataForKey(key, result);
        if (data !== undefined) {
          context.sharedData.set(key, data);
          sharedData.set(key, data);
        }
      }
    }
  }

  /**
   * Get data keys that a plugin produces
   */
  private getProducedDataKeys(plugin: AuditPlugin): string[] {
    // Map plugin types to data they typically produce
    const dataMapping: Record<string, string[]> = {
      'performance': ['lighthouse_results', 'page_metrics', 'core_web_vitals'],
      'security': ['security_headers', 'tls_info', 'csp_policy'],
      'accessibility': ['axe_results', 'color_analysis', 'aria_tree'],
      'code-quality': ['html_validation', 'bundle_analysis', 'pwa_manifest'],
      'ux': ['screenshots', 'layout_metrics', 'form_analysis']
    };

    return dataMapping[plugin.type] || [];
  }

  /**
   * Estimate execution time for a plugin on a specific page/device
   */
  private estimatePluginExecutionTime(
    plugin: AuditPlugin,
    page: PageConfig,
    device: AuditDevice
  ): number {
    // Base execution times by plugin type (in milliseconds)
    const baseTimes: Record<string, number> = {
      'performance': 15000, // Lighthouse is typically the slowest
      'security': 5000,
      'accessibility': 8000,
      'code-quality': 6000,
      'ux': 10000
    };

    let baseTime = baseTimes[plugin.type] || 5000;

    // Adjust for device (mobile typically takes longer)
    if (device === 'mobile') {
      baseTime *= 1.3;
    }

    // Adjust for page complexity (simplified heuristic)
    if (page.scope === 'requires-auth') {
      baseTime *= 1.2; // Auth pages might be more complex
    }

    return Math.round(baseTime);
  }

  /**
   * Check if data is available in previous batches
   */
  private isDataAvailableInPreviousBatches(key: string, batches: ExecutionBatch[]): boolean {
    return batches.some(batch => 
      batch.tasks.some(task => task.produces.includes(key))
    );
  }

  /**
   * Extract specific data from audit result
   */
  private extractDataForKey(key: string, result: AuditResult): unknown {
    // Extract relevant data based on the key
    switch (key) {
      case 'lighthouse_results':
        return result.type === 'performance' ? result : undefined;
      case 'security_headers':
        return result.type === 'security' ? result.metadata.headers : undefined;
      case 'axe_results':
        return result.type === 'accessibility' ? result.metadata.axeResults : undefined;
      default:
        return result.metadata[key];
    }
  }
}

/**
 * Simple semaphore implementation for concurrency control
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}