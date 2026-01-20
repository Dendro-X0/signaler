/**
 * Optimized File I/O - High-performance file operations for report generation
 * 
 * This module provides optimized file I/O operations with batching,
 * compression, and memory-efficient processing for large report datasets.
 */

import { createWriteStream, createReadStream, promises as fs } from 'node:fs';
import { createGzip, createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { join, dirname } from 'node:path';
import { Transform, Writable } from 'node:stream';

/**
 * Configuration for optimized batched file writing.
 */
export interface FileIOConfig {
  batchSize: number;
  compressionLevel: number;
  enableCompression: boolean;
  bufferSize: number;
  maxConcurrentWrites: number;
  tempDirectory?: string;
}

/**
 * Single write operation description.
 */
export interface WriteOperation {
  path: string;
  content: string | Buffer;
  encoding?: BufferEncoding;
  compress?: boolean;
}

/**
 * Result summary for a batched write.
 */
export interface BatchWriteResult {
  successCount: number;
  errorCount: number;
  totalBytes: number;
  compressionRatio?: number;
  elapsedMs: number;
  errors: Array<{ path: string; error: string }>;
}

/**
 * Metrics captured by the optimized file I/O manager.
 */
export interface FileIOMetrics {
  totalWrites: number;
  totalReads: number;
  totalBytes: number;
  compressionSavings: number;
  averageWriteTimeMs: number;
  averageReadTimeMs: number;
}

/**
 * Optimized file I/O manager for report generation
 */
export class OptimizedFileIO {
  private config: FileIOConfig;
  private metrics: FileIOMetrics;
  private writeQueue: WriteOperation[];
  private activeWrites: Set<Promise<void>>;

  constructor(config: Partial<FileIOConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 10,
      compressionLevel: config.compressionLevel || 6,
      enableCompression: config.enableCompression || false,
      bufferSize: config.bufferSize || 64 * 1024, // 64KB
      maxConcurrentWrites: config.maxConcurrentWrites || 5,
      tempDirectory: config.tempDirectory
    };

    this.metrics = {
      totalWrites: 0,
      totalReads: 0,
      totalBytes: 0,
      compressionSavings: 0,
      averageWriteTimeMs: 0,
      averageReadTimeMs: 0
    };

    this.writeQueue = [];
    this.activeWrites = new Set();
  }

  /**
   * Write multiple files in batches with optimization
   */
  async batchWrite(operations: WriteOperation[]): Promise<BatchWriteResult> {
    const startTime = Date.now();
    const result: BatchWriteResult = {
      successCount: 0,
      errorCount: 0,
      totalBytes: 0,
      elapsedMs: 0,
      errors: []
    };

    // Process operations in batches
    for (let i = 0; i < operations.length; i += this.config.batchSize) {
      const batch = operations.slice(i, i + this.config.batchSize);
      
      // Wait if we have too many concurrent writes
      while (this.activeWrites.size >= this.config.maxConcurrentWrites) {
        await Promise.race(this.activeWrites);
      }

      // Process batch concurrently
      const batchPromises = batch.map(op => this.writeSingleFile(op, result));
      const batchPromise = Promise.allSettled(batchPromises);
      
      this.activeWrites.add(batchPromise.then(() => {}));
      
      try {
        await batchPromise;
      } finally {
        this.activeWrites.delete(batchPromise.then(() => {}));
      }
    }

    // Wait for all writes to complete
    await Promise.allSettled(this.activeWrites);

    result.elapsedMs = Date.now() - startTime;
    
    // Calculate compression ratio if compression was used
    if (this.config.enableCompression && result.totalBytes > 0) {
      result.compressionRatio = this.metrics.compressionSavings / result.totalBytes;
    }

    return result;
  }

  /**
   * Write a single file with optimization
   */
  async writeOptimized(
    filePath: string,
    content: string | Buffer,
    options: {
      encoding?: BufferEncoding;
      compress?: boolean;
      createDirectories?: boolean;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Create directories if needed
      if (options.createDirectories !== false) {
        await this.ensureDirectory(dirname(filePath));
      }

      const shouldCompress = options.compress ?? this.config.enableCompression;
      const encoding = options.encoding || 'utf8';
      
      let finalContent: Buffer;
      if (typeof content === 'string') {
        finalContent = Buffer.from(content, encoding);
      } else {
        finalContent = content;
      }

      const originalSize = finalContent.length;

      if (shouldCompress) {
        finalContent = await this.compressContent(finalContent);
        this.metrics.compressionSavings += originalSize - finalContent.length;
      }

      // Use streaming write for large files
      if (finalContent.length > this.config.bufferSize * 2) {
        await this.streamWrite(filePath, finalContent);
      } else {
        await fs.writeFile(filePath, finalContent);
      }

      this.metrics.totalWrites++;
      this.metrics.totalBytes += originalSize;
      
      const writeTime = Date.now() - startTime;
      this.updateAverageWriteTime(writeTime);

    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read file with optimization and decompression
   */
  async readOptimized(
    filePath: string,
    options: {
      encoding?: BufferEncoding;
      decompress?: boolean;
    } = {}
  ): Promise<string | Buffer> {
    const startTime = Date.now();
    
    try {
      const stats = await fs.stat(filePath);
      const shouldDecompress = options.decompress ?? this.config.enableCompression;
      
      let content: Buffer;
      
      // Use streaming read for large files
      if (stats.size > this.config.bufferSize * 2) {
        content = await this.streamRead(filePath);
      } else {
        content = await fs.readFile(filePath);
      }

      if (shouldDecompress) {
        content = await this.decompressContent(content);
      }

      this.metrics.totalReads++;
      
      const readTime = Date.now() - startTime;
      this.updateAverageReadTime(readTime);

      if (options.encoding) {
        return content.toString(options.encoding);
      }
      
      return content;

    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream large content to file
   */
  async streamWrite(filePath: string, content: Buffer): Promise<void> {
    const writeStream = createWriteStream(filePath, {
      highWaterMark: this.config.bufferSize
    });

    // Create a readable stream from buffer
    const readableStream = new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk);
      }
    });

    // Write content in chunks
    let offset = 0;
    const chunkSize = this.config.bufferSize;

    const writeChunks = async () => {
      while (offset < content.length) {
        const chunk = content.subarray(offset, offset + chunkSize);
        readableStream.push(chunk);
        offset += chunkSize;
      }
      readableStream.push(null); // End stream
    };

    // Start writing chunks
    writeChunks();

    // Pipeline the streams
    await pipeline(readableStream, writeStream);
  }

  /**
   * Stream large file content
   */
  async streamRead(filePath: string): Promise<Buffer> {
    const readStream = createReadStream(filePath, {
      highWaterMark: this.config.bufferSize
    });

    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      readStream.on('data', (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      readStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      readStream.on('error', reject);
    });
  }

  /**
   * Compress content using gzip
   */
  private async compressContent(content: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gzip = createGzip({ level: this.config.compressionLevel });
      
      gzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks)));
      gzip.on('error', reject);
      
      gzip.end(content);
    });
  }

  /**
   * Decompress content using gunzip
   */
  private async decompressContent(content: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gunzip = createGunzip();
      
      gunzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gunzip.on('end', () => resolve(Buffer.concat(chunks)));
      gunzip.on('error', reject);
      
      gunzip.end(content);
    });
  }

  /**
   * Write single file operation
   */
  private async writeSingleFile(
    operation: WriteOperation,
    result: BatchWriteResult
  ): Promise<void> {
    try {
      await this.writeOptimized(operation.path, operation.content, {
        encoding: operation.encoding,
        compress: operation.compress
      });
      
      result.successCount++;
      
      const contentSize = typeof operation.content === 'string' 
        ? Buffer.byteLength(operation.content, operation.encoding || 'utf8')
        : operation.content.length;
      
      result.totalBytes += contentSize;
      
    } catch (error) {
      result.errorCount++;
      result.errors.push({
        path: operation.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Update average write time
   */
  private updateAverageWriteTime(newTime: number): void {
    const totalTime = this.metrics.averageWriteTimeMs * (this.metrics.totalWrites - 1);
    this.metrics.averageWriteTimeMs = (totalTime + newTime) / this.metrics.totalWrites;
  }

  /**
   * Update average read time
   */
  private updateAverageReadTime(newTime: number): void {
    const totalTime = this.metrics.averageReadTimeMs * (this.metrics.totalReads - 1);
    this.metrics.averageReadTimeMs = (totalTime + newTime) / this.metrics.totalReads;
  }

  /**
   * Get current I/O metrics
   */
  getMetrics(): FileIOMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalWrites: 0,
      totalReads: 0,
      totalBytes: 0,
      compressionSavings: 0,
      averageWriteTimeMs: 0,
      averageReadTimeMs: 0
    };
  }

  /**
   * Flush any pending write operations
   */
  async flush(): Promise<void> {
    await Promise.allSettled(this.activeWrites);
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    if (this.config.tempDirectory) {
      try {
        await fs.rm(this.config.tempDirectory, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Utility class for managing temporary files
 */
export class TempFileManager {
  private tempDir: string;
  private tempFiles: Set<string>;

  constructor(tempDir?: string) {
    this.tempDir = tempDir || join(process.cwd(), '.tmp');
    this.tempFiles = new Set();
  }

  /**
   * Create a temporary file
   */
  async createTempFile(prefix: string = 'temp', extension: string = '.tmp'): Promise<string> {
    await fs.mkdir(this.tempDir, { recursive: true });
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const filename = `${prefix}-${timestamp}-${random}${extension}`;
    const filePath = join(this.tempDir, filename);
    
    this.tempFiles.add(filePath);
    return filePath;
  }

  /**
   * Write content to a temporary file
   */
  async writeTempFile(
    content: string | Buffer,
    prefix?: string,
    extension?: string
  ): Promise<string> {
    const filePath = await this.createTempFile(prefix, extension);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  /**
   * Clean up all temporary files
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.tempFiles).map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore errors for files that don't exist
      }
    });

    await Promise.allSettled(cleanupPromises);
    this.tempFiles.clear();

    // Try to remove temp directory if empty
    try {
      await fs.rmdir(this.tempDir);
    } catch {
      // Ignore if directory is not empty or doesn't exist
    }
  }

  /**
   * Get list of temporary files
   */
  getTempFiles(): string[] {
    return Array.from(this.tempFiles);
  }
}

/**
 * Utility function to estimate optimal buffer size based on system memory
 */
export function calculateOptimalBufferSize(): number {
  const totalMemory = require('os').totalmem();
  const freeMemory = require('os').freemem();
  
  // Use 1% of free memory or 1MB, whichever is smaller
  const optimalSize = Math.min(
    Math.floor(freeMemory * 0.01),
    1024 * 1024 // 1MB
  );
  
  // Ensure minimum of 64KB
  return Math.max(optimalSize, 64 * 1024);
}

/**
 * Utility function to check if compression would be beneficial
 */
export function shouldCompress(content: string | Buffer, threshold: number = 1024): boolean {
  const size = typeof content === 'string' 
    ? Buffer.byteLength(content, 'utf8')
    : content.length;
  
  // Only compress if content is larger than threshold
  // and likely to benefit from compression (text content)
  return size > threshold;
}