/**
 * Streaming JSON Processor - Memory-efficient JSON processing for large datasets
 * 
 * This module provides streaming JSON processing capabilities to handle
 * large audit datasets without loading everything into memory at once.
 */

import { Transform, Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface StreamingConfig {
  chunkSize: number;
  maxMemoryMB: number;
  enableCompression: boolean;
  progressCallback?: (processed: number, total: number) => void;
}

export interface StreamingMetrics {
  totalItems: number;
  processedItems: number;
  memoryUsageMB: number;
  processingTimeMs: number;
  compressionRatio?: number;
}

/**
 * Streaming JSON processor for large audit datasets
 */
export class StreamingJSONProcessor {
  private config: StreamingConfig;
  private metrics: StreamingMetrics;

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      chunkSize: config.chunkSize || 100,
      maxMemoryMB: config.maxMemoryMB || 512,
      enableCompression: config.enableCompression || false,
      progressCallback: config.progressCallback
    };

    this.metrics = {
      totalItems: 0,
      processedItems: 0,
      memoryUsageMB: 0,
      processingTimeMs: 0
    };
  }

  /**
   * Process large JSON data using streaming
   */
  async processLargeDataset<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    outputStream: Writable
  ): Promise<StreamingMetrics> {
    const startTime = Date.now();
    this.metrics.totalItems = data.length;
    this.metrics.processedItems = 0;

    try {
      // Create readable stream from data chunks
      const sourceStream = this.createChunkedReadableStream(data);
      
      // Create transform stream for processing
      const processingStream = this.createProcessingTransform(processor);
      
      // Create JSON formatting stream
      const jsonStream = this.createJSONFormattingStream();
      
      // Set up pipeline
      await pipeline(
        sourceStream,
        processingStream,
        jsonStream,
        outputStream
      );

      this.metrics.processingTimeMs = Date.now() - startTime;
      return { ...this.metrics };

    } catch (error) {
      throw new Error(`Streaming processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process JSON with memory monitoring
   */
  async processWithMemoryMonitoring<T>(
    data: T[],
    processor: (item: T) => Promise<any>
  ): Promise<{ results: any[], metrics: StreamingMetrics }> {
    const startTime = Date.now();
    const results: any[] = [];
    
    this.metrics.totalItems = data.length;
    this.metrics.processedItems = 0;

    for (let i = 0; i < data.length; i += this.config.chunkSize) {
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      this.metrics.memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

      if (this.metrics.memoryUsageMB > this.config.maxMemoryMB) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Recheck memory after GC
        const postGCMemory = process.memoryUsage();
        this.metrics.memoryUsageMB = postGCMemory.heapUsed / 1024 / 1024;
        
        if (this.metrics.memoryUsageMB > this.config.maxMemoryMB) {
          throw new Error(`Memory usage exceeded limit: ${this.metrics.memoryUsageMB}MB > ${this.config.maxMemoryMB}MB`);
        }
      }

      // Process chunk
      const chunk = data.slice(i, i + this.config.chunkSize);
      const chunkResults = await Promise.all(chunk.map(processor));
      results.push(...chunkResults);

      this.metrics.processedItems += chunk.length;

      // Report progress
      if (this.config.progressCallback) {
        this.config.progressCallback(this.metrics.processedItems, this.metrics.totalItems);
      }
    }

    this.metrics.processingTimeMs = Date.now() - startTime;
    return { results, metrics: { ...this.metrics } };
  }

  /**
   * Stream JSON array to output with proper formatting
   */
  async streamJSONArray<T>(
    items: AsyncIterable<T>,
    outputStream: Writable,
    formatter?: (item: T) => any
  ): Promise<void> {
    let isFirst = true;
    
    // Write array opening
    outputStream.write('[\n');

    for await (const item of items) {
      if (!isFirst) {
        outputStream.write(',\n');
      }
      
      const formattedItem = formatter ? formatter(item) : item;
      const jsonString = JSON.stringify(formattedItem, null, 2);
      
      // Indent the JSON string
      const indentedJson = jsonString
        .split('\n')
        .map(line => '  ' + line)
        .join('\n');
      
      outputStream.write(indentedJson);
      isFirst = false;

      this.metrics.processedItems++;
      
      // Report progress
      if (this.config.progressCallback) {
        this.config.progressCallback(this.metrics.processedItems, this.metrics.totalItems);
      }
    }

    // Write array closing
    outputStream.write('\n]\n');
  }

  /**
   * Create chunked readable stream from array
   */
  private createChunkedReadableStream<T>(data: T[]): Readable {
    let index = 0;
    const config = this.config;
    
    return new Readable({
      objectMode: true,
      read() {
        if (index >= data.length) {
          this.push(null); // End of stream
          return;
        }

        const chunk = data.slice(index, index + config.chunkSize);
        index += config.chunkSize;
        this.push(chunk);
      }
    });
  }

  /**
   * Create processing transform stream
   */
  private createProcessingTransform<T, R>(
    processor: (chunk: T[]) => Promise<R[]>
  ): Transform {
    const metrics = this.metrics;
    const config = this.config;
    
    return new Transform({
      objectMode: true,
      async transform(chunk: T[], encoding, callback) {
        try {
          const processed = await processor(chunk);
          metrics.processedItems += chunk.length;
          
          // Report progress
          if (config.progressCallback) {
            config.progressCallback(metrics.processedItems, metrics.totalItems);
          }
          
          callback(null, processed);
        } catch (error) {
          callback(error as Error);
        }
      }
    });
  }

  /**
   * Create JSON formatting stream
   */
  private createJSONFormattingStream(): Transform {
    let isFirst = true;
    let hasStarted = false;

    return new Transform({
      objectMode: true,
      transform(chunk: any[], encoding, callback) {
        if (!hasStarted) {
          this.push('[\n');
          hasStarted = true;
        }

        for (const item of chunk) {
          if (!isFirst) {
            this.push(',\n');
          }
          
          const jsonString = JSON.stringify(item, null, 2);
          const indentedJson = jsonString
            .split('\n')
            .map(line => '  ' + line)
            .join('\n');
          
          this.push(indentedJson);
          isFirst = false;
        }
        
        callback();
      },
      flush(callback) {
        if (hasStarted) {
          this.push('\n]\n');
        } else {
          this.push('[]\n');
        }
        callback();
      }
    });
  }

  /**
   * Get current processing metrics
   */
  getMetrics(): StreamingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics for new processing session
   */
  resetMetrics(): void {
    this.metrics = {
      totalItems: 0,
      processedItems: 0,
      memoryUsageMB: 0,
      processingTimeMs: 0
    };
  }
}

/**
 * Utility function to create async iterator from array chunks
 */
export async function* createChunkedAsyncIterator<T>(
  data: T[],
  chunkSize: number
): AsyncGenerator<T[], void, unknown> {
  for (let i = 0; i < data.length; i += chunkSize) {
    yield data.slice(i, i + chunkSize);
  }
}

/**
 * Utility function to estimate memory usage of an object
 */
export function estimateObjectSize(obj: any): number {
  const jsonString = JSON.stringify(obj);
  return Buffer.byteLength(jsonString, 'utf8');
}

/**
 * Utility function to check if streaming should be used based on data size
 */
export function shouldUseStreaming(
  dataSize: number,
  itemCount: number,
  memoryLimitMB: number = 256
): boolean {
  const estimatedMemoryMB = dataSize / 1024 / 1024;
  const itemsPerMB = itemCount / Math.max(estimatedMemoryMB, 1);
  
  // Use streaming if:
  // 1. Data size exceeds memory limit
  // 2. Large number of items (>1000)
  // 3. Low item density (large individual items)
  return (
    estimatedMemoryMB > memoryLimitMB ||
    itemCount > 1000 ||
    itemsPerMB < 100
  );
}