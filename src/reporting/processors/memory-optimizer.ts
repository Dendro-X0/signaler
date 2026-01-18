/**
 * Memory Optimizer - Memory usage monitoring and optimization for large datasets
 * 
 * This module provides memory monitoring, garbage collection management,
 * and memory-efficient data structures for report generation.
 */

import { EventEmitter } from 'node:events';

export interface MemoryConfig {
  maxHeapSizeMB: number;
  gcThresholdMB: number;
  monitoringInterval: number; // milliseconds
  enableAutoGC: boolean;
  memoryWarningThreshold: number; // percentage of max heap
  emergencyThreshold: number; // percentage of max heap
}

export interface MemoryMetrics {
  heapUsedMB: number;
  heapTotalMB: number;
  heapLimitMB: number;
  externalMB: number;
  rssMemoryMB: number;
  usagePercentage: number;
  gcCount: number;
  lastGCTime?: number;
  peakUsageMB: number;
}

export interface MemoryAlert {
  level: 'warning' | 'critical' | 'emergency';
  message: string;
  metrics: MemoryMetrics;
  timestamp: number;
  suggestedAction?: string;
}

/**
 * Memory usage monitor and optimizer
 */
export class MemoryOptimizer extends EventEmitter {
  private config: MemoryConfig;
  private metrics: MemoryMetrics;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring: boolean;
  private gcCount: number;
  private peakUsage: number;

  constructor(config: Partial<MemoryConfig> = {}) {
    super();
    
    this.config = {
      maxHeapSizeMB: config.maxHeapSizeMB || 512,
      gcThresholdMB: config.gcThresholdMB || 256,
      monitoringInterval: config.monitoringInterval || 1000,
      enableAutoGC: config.enableAutoGC ?? true,
      memoryWarningThreshold: config.memoryWarningThreshold || 70,
      emergencyThreshold: config.emergencyThreshold || 90
    };

    this.metrics = this.getCurrentMetrics();
    this.isMonitoring = false;
    this.gcCount = 0;
    this.peakUsage = 0;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.checkMemoryThresholds();
    }, this.config.monitoringInterval);

    this.emit('monitoring-started', this.metrics);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoring-stopped', this.metrics);
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (typeof global.gc === 'function') {
      const beforeGC = this.getCurrentMetrics();
      global.gc();
      this.gcCount++;
      
      const afterGC = this.getCurrentMetrics();
      const freedMB = beforeGC.heapUsedMB - afterGC.heapUsedMB;
      
      this.emit('gc-performed', {
        beforeGC,
        afterGC,
        freedMB,
        gcCount: this.gcCount
      });

      return true;
    }
    
    return false;
  }

  /**
   * Get current memory metrics
   */
  getCurrentMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;
    const rssMemoryMB = memUsage.rss / 1024 / 1024;
    
    // Update peak usage
    if (heapUsedMB > this.peakUsage) {
      this.peakUsage = heapUsedMB;
    }

    return {
      heapUsedMB,
      heapTotalMB,
      heapLimitMB: this.config.maxHeapSizeMB,
      externalMB,
      rssMemoryMB,
      usagePercentage: (heapUsedMB / this.config.maxHeapSizeMB) * 100,
      gcCount: this.gcCount,
      lastGCTime: this.metrics?.lastGCTime,
      peakUsageMB: this.peakUsage
    };
  }

  /**
   * Update internal metrics
   */
  private updateMetrics(): void {
    this.metrics = this.getCurrentMetrics();
    this.emit('metrics-updated', this.metrics);
  }

  /**
   * Check memory thresholds and trigger actions
   */
  private checkMemoryThresholds(): void {
    const { usagePercentage } = this.metrics;

    if (usagePercentage >= this.config.emergencyThreshold) {
      this.handleEmergencyThreshold();
    } else if (usagePercentage >= this.config.memoryWarningThreshold) {
      this.handleWarningThreshold();
    }

    // Auto GC if enabled and threshold reached
    if (this.config.enableAutoGC && this.metrics.heapUsedMB >= this.config.gcThresholdMB) {
      this.forceGarbageCollection();
    }
  }

  /**
   * Handle warning threshold breach
   */
  private handleWarningThreshold(): void {
    const alert: MemoryAlert = {
      level: 'warning',
      message: `Memory usage at ${this.metrics.usagePercentage.toFixed(1)}% of limit`,
      metrics: { ...this.metrics },
      timestamp: Date.now(),
      suggestedAction: 'Consider reducing data processing batch size or enabling streaming'
    };

    this.emit('memory-warning', alert);
  }

  /**
   * Handle emergency threshold breach
   */
  private handleEmergencyThreshold(): void {
    const alert: MemoryAlert = {
      level: 'emergency',
      message: `Critical memory usage at ${this.metrics.usagePercentage.toFixed(1)}% of limit`,
      metrics: { ...this.metrics },
      timestamp: Date.now(),
      suggestedAction: 'Immediate garbage collection and data streaming required'
    };

    // Force GC immediately
    this.forceGarbageCollection();

    this.emit('memory-emergency', alert);
  }

  /**
   * Estimate memory usage of an object
   */
  estimateObjectMemory(obj: any): number {
    try {
      const jsonString = JSON.stringify(obj);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch {
      // Fallback estimation for circular references
      return this.roughSizeEstimate(obj);
    }
  }

  /**
   * Rough size estimation for objects with potential circular references
   */
  private roughSizeEstimate(obj: any, visited = new WeakSet()): number {
    if (obj === null || obj === undefined) return 0;
    if (visited.has(obj)) return 0;

    let size = 0;
    
    switch (typeof obj) {
      case 'string':
        size = obj.length * 2; // UTF-16 encoding
        break;
      case 'number':
        size = 8; // 64-bit number
        break;
      case 'boolean':
        size = 1;
        break;
      case 'object':
        visited.add(obj);
        
        if (Array.isArray(obj)) {
          size = obj.reduce((acc, item) => acc + this.roughSizeEstimate(item, visited), 0);
        } else {
          size = Object.keys(obj).reduce((acc, key) => {
            return acc + key.length * 2 + this.roughSizeEstimate(obj[key], visited);
          }, 0);
        }
        break;
    }

    return size;
  }

  /**
   * Get memory usage summary
   */
  getMemorySummary(): {
    current: MemoryMetrics;
    peak: number;
    gcPerformed: number;
    isHealthy: boolean;
    recommendations: string[];
  } {
    const current = this.getCurrentMetrics();
    const isHealthy = current.usagePercentage < this.config.memoryWarningThreshold;
    
    const recommendations: string[] = [];
    
    if (current.usagePercentage > this.config.memoryWarningThreshold) {
      recommendations.push('Enable streaming processing for large datasets');
      recommendations.push('Reduce batch sizes in data processing');
    }
    
    if (this.gcCount === 0 && current.heapUsedMB > this.config.gcThresholdMB) {
      recommendations.push('Consider enabling automatic garbage collection');
    }
    
    if (current.heapUsedMB > this.config.maxHeapSizeMB * 0.8) {
      recommendations.push('Increase memory limit or optimize data structures');
    }

    return {
      current,
      peak: this.peakUsage,
      gcPerformed: this.gcCount,
      isHealthy,
      recommendations
    };
  }

  /**
   * Reset monitoring statistics
   */
  resetStats(): void {
    this.gcCount = 0;
    this.peakUsage = 0;
    this.metrics = this.getCurrentMetrics();
  }
}

/**
 * Memory-efficient data structures and utilities
 */
export class MemoryEfficientDataStructures {
  /**
   * Create a memory-efficient array processor
   */
  static createChunkedProcessor<T, R>(
    chunkSize: number = 100,
    memoryLimit: number = 256
  ): {
    process: (data: T[], processor: (chunk: T[]) => Promise<R[]>) => AsyncGenerator<R[], void, unknown>;
    getMetrics: () => { processedItems: number; memoryUsageMB: number };
  } {
    let processedItems = 0;
    
    return {
      async* process(data: T[], processor: (chunk: T[]) => Promise<R[]>) {
        for (let i = 0; i < data.length; i += chunkSize) {
          // Check memory before processing chunk
          const memUsage = process.memoryUsage();
          const memoryUsageMB = memUsage.heapUsed / 1024 / 1024;
          
          if (memoryUsageMB > memoryLimit) {
            if (global.gc) {
              global.gc();
            }
            
            // Recheck after GC
            const postGCMemory = process.memoryUsage();
            const postGCMemoryMB = postGCMemory.heapUsed / 1024 / 1024;
            
            if (postGCMemoryMB > memoryLimit) {
              throw new Error(`Memory limit exceeded: ${postGCMemoryMB}MB > ${memoryLimit}MB`);
            }
          }
          
          const chunk = data.slice(i, i + chunkSize);
          const result = await processor(chunk);
          processedItems += chunk.length;
          
          yield result;
        }
      },
      
      getMetrics: () => ({
        processedItems,
        memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024
      })
    };
  }

  /**
   * Create a memory-efficient map with automatic cleanup
   */
  static createLRUMap<K, V>(maxSize: number = 1000): Map<K, V> & {
    cleanup: () => void;
    getStats: () => { size: number; maxSize: number };
  } {
    const map = new Map<K, V>();
    const accessOrder = new Map<K, number>();
    let accessCounter = 0;

    const cleanup = () => {
      if (map.size <= maxSize) return;

      // Sort by access time and remove oldest entries
      const sortedEntries = Array.from(accessOrder.entries())
        .sort((a, b) => a[1] - b[1]);
      
      const toRemove = sortedEntries.slice(0, map.size - maxSize);
      
      for (const [key] of toRemove) {
        map.delete(key);
        accessOrder.delete(key);
      }
    };

    const originalSet = map.set.bind(map);
    const originalGet = map.get.bind(map);

    map.set = (key: K, value: V) => {
      accessOrder.set(key, ++accessCounter);
      const result = originalSet(key, value);
      cleanup();
      return result;
    };

    map.get = (key: K) => {
      const value = originalGet(key);
      if (value !== undefined) {
        accessOrder.set(key, ++accessCounter);
      }
      return value;
    };

    return Object.assign(map, {
      cleanup,
      getStats: () => ({ size: map.size, maxSize })
    });
  }

  /**
   * Create a streaming JSON writer for large objects
   */
  static createStreamingJSONWriter(): {
    writeArray: <T>(items: AsyncIterable<T>, writer: (item: T) => string) => AsyncGenerator<string, void, unknown>;
    writeObject: (obj: Record<string, any>) => AsyncGenerator<string, void, unknown>;
  } {
    return {
      async* writeArray<T>(items: AsyncIterable<T>, writer: (item: T) => string) {
        yield '[\n';
        let isFirst = true;
        
        for await (const item of items) {
          if (!isFirst) {
            yield ',\n';
          }
          yield '  ' + writer(item);
          isFirst = false;
        }
        
        yield '\n]';
      },

      async* writeObject(obj: Record<string, any>) {
        yield '{\n';
        const keys = Object.keys(obj);
        
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = obj[key];
          
          yield `  "${key}": ${JSON.stringify(value)}`;
          
          if (i < keys.length - 1) {
            yield ',';
          }
          yield '\n';
        }
        
        yield '}';
      }
    };
  }
}

/**
 * Utility function to monitor memory during async operations
 */
export async function withMemoryMonitoring<T>(
  operation: (monitor: MemoryOptimizer) => Promise<T>,
  config?: Partial<MemoryConfig>
): Promise<{ result: T; summary: any }> {
  const monitor = new MemoryOptimizer(config);
  
  monitor.startMonitoring();
  
  try {
    const result = await operation(monitor);
    const summary = monitor.getMemorySummary();
    
    return { result, summary };
  } finally {
    monitor.stopMonitoring();
  }
}

/**
 * Utility function to check if system has enough memory for operation
 */
export function checkMemoryAvailability(requiredMB: number): {
  available: boolean;
  currentUsageMB: number;
  availableMB: number;
  recommendation?: string;
} {
  const memUsage = process.memoryUsage();
  const currentUsageMB = memUsage.heapUsed / 1024 / 1024;
  const totalMemoryMB = require('os').totalmem() / 1024 / 1024;
  const freeMemoryMB = require('os').freemem() / 1024 / 1024;
  
  const available = freeMemoryMB >= requiredMB;
  
  let recommendation: string | undefined;
  if (!available) {
    if (currentUsageMB > totalMemoryMB * 0.7) {
      recommendation = 'Consider using streaming processing or reducing batch sizes';
    } else {
      recommendation = 'System memory is low, consider closing other applications';
    }
  }

  return {
    available,
    currentUsageMB,
    availableMB: freeMemoryMB,
    recommendation
  };
}