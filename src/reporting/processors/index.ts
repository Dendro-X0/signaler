/**
 * Reporting Processors - Performance optimization and memory management
 * 
 * This module exports all performance optimization and memory management
 * components for the reporting system.
 */

// Streaming JSON processing
export {
  StreamingJSONProcessor,
  shouldUseStreaming,
  estimateObjectSize,
  createChunkedAsyncIterator
} from './streaming-json-processor.js';

// Progress indicators
export {
  ProgressIndicator,
  MultiStageProgress,
  createProgressCallback,
  withProgress
} from './progress-indicator.js';

// Optimized file I/O
export {
  OptimizedFileIO,
  TempFileManager,
  calculateOptimalBufferSize,
  shouldCompress
} from './optimized-file-io.js';

// Memory optimization
export {
  MemoryOptimizer,
  MemoryEfficientDataStructures,
  withMemoryMonitoring,
  checkMemoryAvailability
} from './memory-optimizer.js';

// Memory-efficient data structures
export {
  CompactAuditStorage,
  StreamingAuditProcessor,
  MemoryEfficientAggregator,
  createMemoryEfficientProcessor
} from './memory-efficient-structures.js';

// Type definitions
export type {
  StreamingConfig,
  StreamingMetrics
} from './streaming-json-processor.js';

export type {
  ProgressConfig,
  ProgressState,
  ProgressUpdate
} from './progress-indicator.js';

export type {
  FileIOConfig,
  WriteOperation,
  BatchWriteResult,
  FileIOMetrics
} from './optimized-file-io.js';

export type {
  MemoryConfig,
  MemoryMetrics,
  MemoryAlert
} from './memory-optimizer.js';

export type {
  CompactPageResult,
  CompactIssue,
  CompactOpportunity
} from './memory-efficient-structures.js';