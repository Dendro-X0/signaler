/**
 * Basic Memory Optimization Tests
 * 
 * Simple unit tests to verify the core memory optimization functionality
 * works correctly without complex property-based testing edge cases.
 */

import { describe, it, expect } from 'vitest';
import { MemoryOptimizer } from '../src/reporting/processors/memory-optimizer.js';
import { CompactAuditStorage } from '../src/reporting/processors/memory-efficient-structures.js';
import { StreamingJSONProcessor } from '../src/reporting/processors/streaming-json-processor.js';
import { OptimizedFileIO } from '../src/reporting/processors/optimized-file-io.js';
import { ProgressIndicator } from '../src/reporting/processors/progress-indicator.js';

describe('Memory Optimization - Basic Tests', () => {
  it('should create and configure memory optimizer', () => {
    const optimizer = new MemoryOptimizer({
      maxHeapSizeMB: 256,
      enableAutoGC: true
    });

    const metrics = optimizer.getCurrentMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.heapUsedMB).toBeGreaterThan(0);
    expect(metrics.usagePercentage).toBeGreaterThanOrEqual(0);
  });

  it('should create compact audit storage and add page results', () => {
    const storage = new CompactAuditStorage();
    
    const mockPageResult = {
      label: 'Test Page',
      path: '/test',
      device: 'desktop',
      scores: {
        performance: 85,
        accessibility: 90,
        bestPractices: 88,
        seo: 92
      },
      metrics: {
        lcpMs: 1200,
        fcpMs: 800,
        tbtMs: 150,
        cls: 0.05
      },
      issues: [],
      opportunities: []
    };

    storage.addPageResult(mockPageResult);
    
    const stats = storage.getMemoryStats();
    expect(stats.totalPages).toBe(1);
    expect(stats.uniqueIssues).toBe(0);
    expect(stats.compressionRatio).toBeGreaterThan(0);
  });

  it('should handle page results with missing data gracefully', () => {
    const storage = new CompactAuditStorage();
    
    const incompletePageResult = {
      label: 'Incomplete Page',
      path: '/incomplete'
      // Missing scores, metrics, etc.
    };

    expect(() => {
      storage.addPageResult(incompletePageResult);
    }).not.toThrow();
    
    const stats = storage.getMemoryStats();
    expect(stats.totalPages).toBe(1);
  });

  it('should create streaming JSON processor', () => {
    const processor = new StreamingJSONProcessor({
      chunkSize: 10,
      maxMemoryMB: 128
    });

    const metrics = processor.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalItems).toBe(0);
    expect(metrics.processedItems).toBe(0);
  });

  it('should create optimized file I/O manager', () => {
    const fileIO = new OptimizedFileIO({
      batchSize: 5,
      enableCompression: false,
      maxConcurrentWrites: 3
    });

    const metrics = fileIO.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.totalWrites).toBe(0);
    expect(metrics.totalReads).toBe(0);
  });

  it('should create progress indicator', () => {
    const progress = new ProgressIndicator({
      format: 'minimal',
      showETA: false
    });

    expect(progress.isRunning()).toBe(false);
    
    const state = progress.getState();
    expect(state).toBeDefined();
    expect(state.current).toBe(0);
    expect(state.total).toBe(100);
  });

  it('should start and update progress indicator', () => {
    const progress = new ProgressIndicator({
      format: 'minimal',
      showETA: false
    });

    progress.start(50, 'Testing');
    expect(progress.isRunning()).toBe(true);

    progress.update({ current: 25 });
    const state = progress.getState();
    expect(state.current).toBe(25);
    expect(state.total).toBe(50);
    expect(state.percentage).toBe(50);

    progress.complete();
    expect(progress.isRunning()).toBe(false);
  });

  it('should retrieve and expand page results from compact storage', () => {
    const storage = new CompactAuditStorage();
    
    const originalPage = {
      label: 'Test Page',
      path: '/test',
      device: 'mobile',
      scores: {
        performance: 75,
        accessibility: 85,
        bestPractices: 80,
        seo: 90
      },
      metrics: {
        lcpMs: 1500,
        fcpMs: 900,
        tbtMs: 200,
        cls: 0.1
      },
      issues: [{
        id: 'test-issue',
        title: 'Test Issue',
        severity: 'medium',
        category: 'javascript',
        estimatedSavings: { timeMs: 100, bytes: 1000 }
      }],
      opportunities: []
    };

    storage.addPageResult(originalPage);
    
    const retrievedPage = storage.getPageResult(0);
    expect(retrievedPage.label).toBe('Test Page');
    expect(retrievedPage.path).toBe('/test');
    expect(retrievedPage.device).toBe('mobile');
    expect(retrievedPage.scores.performance).toBe(75);
    expect(retrievedPage.metrics.lcpMs).toBe(1500);
    expect(retrievedPage.issues).toHaveLength(1);
    expect(retrievedPage.issues[0].title).toBe('Test Issue');
  });

  it('should calculate memory usage estimates', () => {
    const optimizer = new MemoryOptimizer();
    
    const testObject = {
      name: 'test',
      data: [1, 2, 3, 4, 5],
      nested: {
        value: 'hello world'
      }
    };

    const estimatedSize = optimizer.estimateObjectMemory(testObject);
    expect(estimatedSize).toBeGreaterThan(0);
  });

  it('should handle memory monitoring lifecycle', () => {
    const optimizer = new MemoryOptimizer({
      maxHeapSizeMB: 512,
      monitoringInterval: 100
    });

    // Test that monitoring can be started and stopped
    optimizer.startMonitoring();
    
    // Give it a moment to start
    setTimeout(() => {
      optimizer.stopMonitoring();
    }, 50);
    
    // Verify we can get memory summary
    const summary = optimizer.getMemorySummary();
    expect(summary).toBeDefined();
    expect(summary.current).toBeDefined();
    expect(summary.isHealthy).toBeDefined();
    expect(summary.recommendations).toBeDefined();
  });
});