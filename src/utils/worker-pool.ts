/**
 * Worker pool management for parallel execution
 */

import { cpus, freemem } from "node:os";
import { getMemoryStatus } from "./memory-monitor.js";

export interface WorkerPoolConfig {
  readonly requestedParallel?: number;
  readonly taskCount: number;
  readonly chromePort?: number;
  readonly minWorkers?: number;
  readonly maxWorkers?: number;
}

export interface ParallelRecommendation {
  readonly parallel: number;
  readonly reason: string;
  readonly cpuBased: number;
  readonly memoryBased: number;
  readonly suggested: number;
  readonly warnings: string[];
}

/**
 * Calculate optimal parallel worker count based on system resources
 */
export function calculateOptimalParallel(config: WorkerPoolConfig): ParallelRecommendation {
  const warnings: string[] = [];
  
  // If using external Chrome, force single worker
  if (config.chromePort !== undefined) {
    return {
      parallel: 1,
      reason: "External Chrome instance (chromePort specified)",
      cpuBased: 1,
      memoryBased: 1,
      suggested: 1,
      warnings,
    };
  }
  
  // If explicitly requested, use that (with bounds checking)
  if (config.requestedParallel !== undefined) {
    const bounded = Math.max(1, Math.min(10, config.requestedParallel));
    if (bounded !== config.requestedParallel) {
      warnings.push(`Requested parallel ${config.requestedParallel} clamped to ${bounded} (valid range: 1-10)`);
    }
    return {
      parallel: bounded,
      reason: "Explicitly requested",
      cpuBased: bounded,
      memoryBased: bounded,
      suggested: bounded,
      warnings,
    };
  }
  
  // Calculate based on CPU
  const logicalCpus = cpus().length;
  const cpuBased = Math.max(1, Math.min(10, Math.floor(logicalCpus * 0.75)));
  
  // Calculate based on memory (each worker needs ~1.5GB)
  const freeMemoryBytes = freemem();
  const memoryBased = Math.max(1, Math.min(10, Math.floor(freeMemoryBytes / 1_500_000_000)));
  
  // Get memory status for warnings
  const memoryStatus = getMemoryStatus();
  if (memoryStatus.isCritical) {
    warnings.push(`Critical memory shortage: ${memoryStatus.freeMemoryMB}MB free. Forcing single worker.`);
    return {
      parallel: 1,
      reason: "Critical memory shortage",
      cpuBased,
      memoryBased,
      suggested: 1,
      warnings,
    };
  }
  
  if (memoryStatus.isLow) {
    warnings.push(`Low memory: ${memoryStatus.freeMemoryMB}MB free. Limiting parallelism.`);
  }
  
  // Take the minimum of CPU and memory based calculations
  const suggested = Math.max(1, Math.min(cpuBased, memoryBased));
  
  // Cap at 4 by default for stability
  const cappedSuggested = Math.min(config.maxWorkers ?? 4, suggested || 1);
  
  // Don't use more workers than tasks
  const final = Math.max(
    config.minWorkers ?? 1,
    Math.min(config.maxWorkers ?? 10, Math.min(config.taskCount, cappedSuggested))
  );
  
  // Add warnings for resource constraints
  if (final < suggested) {
    if (final === config.taskCount) {
      warnings.push(`Limited to ${final} workers (only ${config.taskCount} tasks)`);
    } else if (memoryBased < cpuBased) {
      warnings.push(`Limited to ${final} workers due to available memory`);
    }
  }
  
  return {
    parallel: final,
    reason: "Auto-tuned from CPU and memory",
    cpuBased,
    memoryBased,
    suggested,
    warnings,
  };
}

/**
 * Check if we should reduce parallelism due to failures
 */
export function shouldReduceParallelism(params: {
  readonly consecutiveFailures: number;
  readonly currentParallel: number;
  readonly failureRate: number;
}): { readonly shouldReduce: boolean; readonly newParallel?: number; readonly reason?: string } {
  // If we're already at 1, can't reduce further
  if (params.currentParallel <= 1) {
    return { shouldReduce: false };
  }
  
  // Reduce if we have many consecutive failures
  if (params.consecutiveFailures >= 3) {
    const newParallel = Math.max(1, Math.floor(params.currentParallel / 2));
    return {
      shouldReduce: true,
      newParallel,
      reason: `${params.consecutiveFailures} consecutive failures detected`,
    };
  }
  
  // Reduce if failure rate is high (>30%)
  if (params.failureRate > 0.3 && params.currentParallel > 2) {
    const newParallel = Math.max(1, params.currentParallel - 1);
    return {
      shouldReduce: true,
      newParallel,
      reason: `High failure rate (${Math.round(params.failureRate * 100)}%)`,
    };
  }
  
  return { shouldReduce: false };
}

/**
 * Adaptive parallel manager that adjusts based on failures
 */
export class AdaptiveParallelManager {
  private currentParallel: number;
  private consecutiveFailures = 0;
  private totalAttempts = 0;
  private totalFailures = 0;
  private readonly initialParallel: number;
  private readonly minParallel: number;
  
  constructor(initialParallel: number, minParallel: number = 1) {
    this.currentParallel = initialParallel;
    this.initialParallel = initialParallel;
    this.minParallel = minParallel;
  }
  
  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.totalAttempts++;
  }
  
  /**
   * Record a failed operation and potentially adjust parallelism
   */
  recordFailure(): { readonly reduced: boolean; readonly newParallel?: number; readonly reason?: string } {
    this.consecutiveFailures++;
    this.totalFailures++;
    this.totalAttempts++;
    
    const failureRate = this.totalFailures / this.totalAttempts;
    const result = shouldReduceParallelism({
      consecutiveFailures: this.consecutiveFailures,
      currentParallel: this.currentParallel,
      failureRate,
    });
    
    if (result.shouldReduce && result.newParallel) {
      this.currentParallel = Math.max(this.minParallel, result.newParallel);
      return {
        reduced: true,
        newParallel: this.currentParallel,
        reason: result.reason,
      };
    }
    
    return { reduced: false };
  }
  
  /**
   * Get current parallel count
   */
  getCurrentParallel(): number {
    return this.currentParallel;
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    readonly currentParallel: number;
    readonly initialParallel: number;
    readonly consecutiveFailures: number;
    readonly totalAttempts: number;
    readonly totalFailures: number;
    readonly failureRate: number;
  } {
    return {
      currentParallel: this.currentParallel,
      initialParallel: this.initialParallel,
      consecutiveFailures: this.consecutiveFailures,
      totalAttempts: this.totalAttempts,
      totalFailures: this.totalFailures,
      failureRate: this.totalAttempts > 0 ? this.totalFailures / this.totalAttempts : 0,
    };
  }
  
  /**
   * Reset to initial parallelism
   */
  reset(): void {
    this.currentParallel = this.initialParallel;
    this.consecutiveFailures = 0;
  }
}
