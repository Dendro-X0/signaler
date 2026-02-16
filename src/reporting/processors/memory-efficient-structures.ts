/**
 * Memory-Efficient Data Structures - Optimized data structures for large audit datasets
 * 
 * This module provides memory-efficient data structures specifically designed
 * for handling large audit datasets with minimal memory footprint.
 */

import { MemoryOptimizer } from './memory-optimizer.js';

/**
 * Compact representation of a page result using typed arrays.
 */
export interface CompactPageResult {
  label: string;
  path: string;
  device: 'desktop' | 'mobile';
  scores: Uint8Array; // [performance, accessibility, bestPractices, seo]
  metrics: Float32Array; // [lcpMs, fcpMs, tbtMs, cls]
  issueIds: Uint16Array; // References to shared issue pool
  opportunityIds: Uint16Array; // References to shared opportunity pool
}

/**
 * Compact issue representation stored in a shared pool.
 */
export interface CompactIssue {
  id: number;
  titleHash: number; // Hash of title for deduplication
  severity: 0 | 1 | 2 | 3; // critical=0, high=1, medium=2, low=3
  category: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // javascript=0, css=1, images=2, caching=3, network=4, accessibility=5, seo=6, best-practices=7
  estimatedSavingsMs: number;
  estimatedSavingsBytes: number;
}

/**
 * Compact opportunity representation stored in a shared pool.
 */
export interface CompactOpportunity {
  id: number;
  titleHash: number;
  estimatedSavingsMs: number;
  estimatedSavingsBytes: number;
}

/**
 * Memory-efficient storage for audit results using typed arrays and compression
 */
export class CompactAuditStorage {
  private pages: CompactPageResult[];
  private issues: Map<number, CompactIssue>;
  private opportunities: Map<number, CompactOpportunity>;
  private stringPool: Map<number, string>; // Hash -> String mapping
  private nextIssueId: number;
  private nextOpportunityId: number;
  private memoryOptimizer: MemoryOptimizer;

  constructor() {
    this.pages = [];
    this.issues = new Map();
    this.opportunities = new Map();
    this.stringPool = new Map();
    this.nextIssueId = 1;
    this.nextOpportunityId = 1;
    this.memoryOptimizer = new MemoryOptimizer({
      maxHeapSizeMB: 512,
      enableAutoGC: true
    });
  }

  /**
   * Add a page result to compact storage
   */
  addPageResult(pageResult: any): void {
    // Ensure we have valid scores object
    const scores = pageResult.scores || {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0
    };

    // Convert scores to Uint8Array (0-100 range fits in uint8)
    const scoresArray = new Uint8Array([
      Math.round(scores.performance || 0),
      Math.round(scores.accessibility || 0),
      Math.round(scores.bestPractices || 0),
      Math.round(scores.seo || 0)
    ]);

    // Ensure we have valid metrics object
    const metrics = pageResult.metrics || {
      lcpMs: 0,
      fcpMs: 0,
      tbtMs: 0,
      cls: 0
    };

    // Convert metrics to Float32Array for precision
    const metricsArray = new Float32Array([
      metrics.lcpMs || 0,
      metrics.fcpMs || 0,
      metrics.tbtMs || 0,
      metrics.cls || 0
    ]);

    // Process issues and get compact IDs
    const issueIds = this.processIssues(pageResult.issues || []);
    const opportunityIds = this.processOpportunities(pageResult.opportunities || []);

    const compactPage: CompactPageResult = {
      label: pageResult.label || '',
      path: pageResult.path || '',
      device: pageResult.device || 'desktop',
      scores: scoresArray,
      metrics: metricsArray,
      issueIds,
      opportunityIds
    };

    this.pages.push(compactPage);

    // Trigger GC if memory usage is high
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 256 * 1024 * 1024) { // 256MB
      this.memoryOptimizer.forceGarbageCollection();
    }
  }

  /**
   * Process issues and return compact ID array
   */
  private processIssues(issues: any[]): Uint16Array {
    const issueIds: number[] = [];

    for (const issue of issues) {
      const titleHash = this.hashString(issue.title || '');

      // Check if we already have this issue type
      let existingIssueId: number | undefined;
      for (const [id, compactIssue] of this.issues) {
        if (compactIssue.titleHash === titleHash) {
          existingIssueId = id;
          break;
        }
      }

      if (existingIssueId) {
        issueIds.push(existingIssueId);
      } else {
        // Create new compact issue
        const compactIssue: CompactIssue = {
          id: this.nextIssueId,
          titleHash,
          severity: this.mapSeverity(issue.severity),
          category: this.mapCategory(issue.category),
          estimatedSavingsMs: issue.estimatedSavings?.timeMs || 0,
          estimatedSavingsBytes: issue.estimatedSavings?.bytes || 0
        };

        this.issues.set(this.nextIssueId, compactIssue);
        this.stringPool.set(titleHash, issue.title || '');
        issueIds.push(this.nextIssueId);
        this.nextIssueId++;
      }
    }

    return new Uint16Array(issueIds);
  }

  /**
   * Process opportunities and return compact ID array
   */
  private processOpportunities(opportunities: any[]): Uint16Array {
    const opportunityIds: number[] = [];

    for (const opportunity of opportunities) {
      const titleHash = this.hashString(opportunity.title || '');

      // Check if we already have this opportunity type
      let existingOpportunityId: number | undefined;
      for (const [id, compactOpportunity] of this.opportunities) {
        if (compactOpportunity.titleHash === titleHash) {
          existingOpportunityId = id;
          break;
        }
      }

      if (existingOpportunityId) {
        opportunityIds.push(existingOpportunityId);
      } else {
        // Create new compact opportunity
        const compactOpportunity: CompactOpportunity = {
          id: this.nextOpportunityId,
          titleHash,
          estimatedSavingsMs: opportunity.estimatedSavings?.timeMs || 0,
          estimatedSavingsBytes: opportunity.estimatedSavings?.bytes || 0
        };

        this.opportunities.set(this.nextOpportunityId, compactOpportunity);
        this.stringPool.set(titleHash, opportunity.title || '');
        opportunityIds.push(this.nextOpportunityId);
        this.nextOpportunityId++;
      }
    }

    return new Uint16Array(opportunityIds);
  }

  /**
   * Get expanded page result from compact storage
   */
  getPageResult(index: number): any {
    if (index >= this.pages.length) {
      throw new Error(`Page index ${index} out of bounds`);
    }

    const compactPage = this.pages[index];

    return {
      label: compactPage.label,
      path: compactPage.path,
      device: compactPage.device,
      scores: {
        performance: compactPage.scores[0],
        accessibility: compactPage.scores[1],
        bestPractices: compactPage.scores[2],
        seo: compactPage.scores[3]
      },
      metrics: {
        lcpMs: compactPage.metrics[0],
        fcpMs: compactPage.metrics[1],
        tbtMs: compactPage.metrics[2],
        cls: compactPage.metrics[3]
      },
      issues: this.expandIssues(compactPage.issueIds),
      opportunities: this.expandOpportunities(compactPage.opportunityIds)
    };
  }

  /**
   * Expand issues from compact IDs
   */
  private expandIssues(issueIds: Uint16Array): any[] {
    const issues: any[] = [];

    for (const id of issueIds) {
      const compactIssue = this.issues.get(id);
      if (compactIssue) {
        const title = this.stringPool.get(compactIssue.titleHash) || '';

        issues.push({
          id: `issue-${id}`,
          title,
          severity: this.unmapSeverity(compactIssue.severity),
          category: this.unmapCategory(compactIssue.category),
          estimatedSavings: {
            timeMs: compactIssue.estimatedSavingsMs,
            bytes: compactIssue.estimatedSavingsBytes
          }
        });
      }
    }

    return issues;
  }

  /**
   * Expand opportunities from compact IDs
   */
  private expandOpportunities(opportunityIds: Uint16Array): any[] {
    const opportunities: any[] = [];

    for (const id of opportunityIds) {
      const compactOpportunity = this.opportunities.get(id);
      if (compactOpportunity) {
        const title = this.stringPool.get(compactOpportunity.titleHash) || '';

        opportunities.push({
          id: `opportunity-${id}`,
          title,
          estimatedSavings: {
            timeMs: compactOpportunity.estimatedSavingsMs,
            bytes: compactOpportunity.estimatedSavingsBytes
          }
        });
      }
    }

    return opportunities;
  }

  /**
   * Get all pages as an iterator to save memory
   */
  *getAllPages(): Generator<any, void, unknown> {
    for (let i = 0; i < this.pages.length; i++) {
      yield this.getPageResult(i);
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalPages: number;
    uniqueIssues: number;
    uniqueOpportunities: number;
    stringPoolSize: number;
    estimatedMemoryMB: number;
    compressionRatio: number;
  } {
    const memUsage = process.memoryUsage();
    const estimatedMemoryMB = memUsage.heapUsed / 1024 / 1024;

    // Estimate uncompressed size
    const avgPageSize = 2000; // Estimated bytes per page in normal storage
    const uncompressedSize = this.pages.length * avgPageSize;
    const compressedSize = this.pages.length * 100; // Estimated compact size
    const compressionRatio = uncompressedSize / Math.max(compressedSize, 1);

    return {
      totalPages: this.pages.length,
      uniqueIssues: this.issues.size,
      uniqueOpportunities: this.opportunities.size,
      stringPoolSize: this.stringPool.size,
      estimatedMemoryMB,
      compressionRatio
    };
  }

  /**
   * Clear all data and free memory
   */
  clear(): void {
    this.pages.length = 0;
    this.issues.clear();
    this.opportunities.clear();
    this.stringPool.clear();
    this.nextIssueId = 1;
    this.nextOpportunityId = 1;

    // Force garbage collection
    this.memoryOptimizer.forceGarbageCollection();
  }

  /**
   * Simple string hashing function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Map severity string to number
   */
  private mapSeverity(severity: string): 0 | 1 | 2 | 3 {
    switch (severity) {
      case 'critical': return 0;
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 3;
    }
  }

  /**
   * Unmap severity number to string
   */
  private unmapSeverity(severity: 0 | 1 | 2 | 3): string {
    switch (severity) {
      case 0: return 'critical';
      case 1: return 'high';
      case 2: return 'medium';
      case 3: return 'low';
    }
  }

  /**
   * Map category string to number
   */
  private mapCategory(category: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 {
    switch (category) {
      case 'javascript': return 0;
      case 'css': return 1;
      case 'images': return 2;
      case 'caching': return 3;
      case 'network': return 4;
      case 'accessibility': return 5;
      case 'seo': return 6;
      case 'best-practices': return 7;
      default: return 4;
    }
  }

  /**
   * Unmap category number to string
   */
  private unmapCategory(category: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7): string {
    switch (category) {
      case 0: return 'javascript';
      case 1: return 'css';
      case 2: return 'images';
      case 3: return 'caching';
      case 4: return 'network';
      case 5: return 'accessibility';
      case 6: return 'seo';
      case 7: return 'best-practices';
    }
  }
}

/**
 * Streaming data processor for large audit datasets
 */
export class StreamingAuditProcessor {
  private compactStorage: CompactAuditStorage;
  private memoryOptimizer: MemoryOptimizer;
  private batchSize: number;

  constructor(batchSize: number = 100) {
    this.compactStorage = new CompactAuditStorage();
    this.memoryOptimizer = new MemoryOptimizer({
      maxHeapSizeMB: 512,
      enableAutoGC: true,
      memoryWarningThreshold: 70
    });
    this.batchSize = batchSize;
  }

  /**
   * Process audit data in streaming fashion
   */
  async *processAuditStream(
    auditData: AsyncIterable<any>
  ): AsyncGenerator<any, void, unknown> {
    this.memoryOptimizer.startMonitoring();

    try {
      let batch: any[] = [];

      for await (const pageResult of auditData) {
        batch.push(pageResult);

        if (batch.length >= this.batchSize) {
          yield* this.processBatch(batch);
          batch = [];

          // Check memory and force GC if needed
          const metrics = this.memoryOptimizer.getCurrentMetrics();
          if (metrics.usagePercentage > 70) {
            this.memoryOptimizer.forceGarbageCollection();
          }
        }
      }

      // Process remaining items
      if (batch.length > 0) {
        yield* this.processBatch(batch);
      }
    } finally {
      this.memoryOptimizer.stopMonitoring();
    }
  }

  /**
   * Process a batch of audit results
   */
  private *processBatch(batch: any[]): Generator<any, void, unknown> {
    // Add to compact storage
    for (const pageResult of batch) {
      this.compactStorage.addPageResult(pageResult);
    }

    // Yield processed results
    const startIndex = this.compactStorage.getMemoryStats().totalPages - batch.length;
    for (let i = 0; i < batch.length; i++) {
      yield this.compactStorage.getPageResult(startIndex + i);
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): any {
    return {
      storage: this.compactStorage.getMemoryStats(),
      optimizer: this.memoryOptimizer.getCurrentMetrics()
    };
  }

  /**
   * Clear all processed data
   */
  clear(): void {
    this.compactStorage.clear();
  }
}

/**
 * Memory-efficient aggregation utilities
 */
export class MemoryEfficientAggregator {
  /**
   * Aggregate issues across pages with memory optimization
   */
  static aggregateIssues(
    pages: Iterable<any>,
    memoryLimitMB: number = 256
  ): Map<string, { count: number; totalSavings: number; affectedPages: string[] }> {
    const aggregation = new Map<string, { count: number; totalSavings: number; affectedPages: string[] }>();
    const memoryOptimizer = new MemoryOptimizer({ maxHeapSizeMB: memoryLimitMB });

    memoryOptimizer.startMonitoring();

    try {
      for (const page of pages) {
        for (const issue of page.issues || []) {
          const key = `${issue.id}-${issue.severity}`;
          const existing = aggregation.get(key);

          if (existing) {
            existing.count++;
            existing.totalSavings += issue.estimatedSavings?.timeMs || 0;
            existing.affectedPages.push(page.path);
          } else {
            aggregation.set(key, {
              count: 1,
              totalSavings: issue.estimatedSavings?.timeMs || 0,
              affectedPages: [page.path]
            });
          }
        }

        // Check memory periodically
        const metrics = memoryOptimizer.getCurrentMetrics();
        if (metrics.usagePercentage > 80) {
          memoryOptimizer.forceGarbageCollection();
        }
      }
    } finally {
      memoryOptimizer.stopMonitoring();
    }

    return aggregation;
  }

  /**
   * Calculate performance metrics with streaming
   */
  static async calculateMetrics(
    pages: AsyncIterable<any>
  ): Promise<{
    averagePerformanceScore: number;
    totalPages: number;
    criticalIssuesCount: number;
    estimatedTotalSavings: number;
    averageScores: {
      performance?: number;
      accessibility?: number;
      bestPractices?: number;
      seo?: number;
    };
    auditDuration: number;
    disclaimer: string;
  }> {
    let totalScore = 0;
    let totalA11y = 0;
    let totalBP = 0;
    let totalSEO = 0;
    let totalPages = 0;
    let criticalIssuesCount = 0;
    let estimatedTotalSavings = 0;

    for await (const page of pages) {
      totalScore += page.scores?.performance || 0;
      totalA11y += page.scores?.accessibility || 0;
      totalBP += page.scores?.bestPractices || 0;
      totalSEO += page.scores?.seo || 0;
      totalPages++;

      for (const issue of page.issues || []) {
        if (issue.severity === 'critical') {
          criticalIssuesCount++;
        }
        estimatedTotalSavings += issue.estimatedSavings?.timeMs || 0;
      }
    }

    return {
      averagePerformanceScore: totalPages > 0 ? Math.round(totalScore / totalPages) : 0,
      totalPages,
      criticalIssuesCount,
      estimatedTotalSavings: Math.round(estimatedTotalSavings),
      averageScores: {
        performance: totalPages > 0 ? Math.round(totalScore / totalPages) : 0,
        accessibility: totalPages > 0 ? Math.round(totalA11y / totalPages) : 0,
        bestPractices: totalPages > 0 ? Math.round(totalBP / totalPages) : 0,
        seo: totalPages > 0 ? Math.round(totalSEO / totalPages) : 0
      },
      auditDuration: 0,
      disclaimer: 'Calculated from compact audit storage.'
    };
  }
}

/**
 * Utility function to create memory-efficient audit data processor
 */
export function createMemoryEfficientProcessor(config: {
  maxMemoryMB?: number;
  batchSize?: number;
  enableCompression?: boolean;
}): {
  processor: StreamingAuditProcessor;
  storage: CompactAuditStorage;
  monitor: MemoryOptimizer;
} {
  const processor = new StreamingAuditProcessor(config.batchSize);
  const storage = new CompactAuditStorage();
  const monitor = new MemoryOptimizer({
    maxHeapSizeMB: config.maxMemoryMB || 512,
    enableAutoGC: true
  });

  return { processor, storage, monitor };
}