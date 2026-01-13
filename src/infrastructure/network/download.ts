import { createWriteStream, createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";

export interface DownloadOptions {
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly timeout: number;
  readonly userAgent: string;
  readonly checksumUrl?: string;
  readonly resumeSupport?: boolean;
}

export interface DownloadProgress {
  readonly bytesDownloaded: number;
  readonly totalBytes?: number;
  readonly percentage?: number;
  readonly speed?: number; // bytes per second
  readonly eta?: number; // seconds
}

export interface DownloadResult {
  readonly success: boolean;
  readonly filePath: string;
  readonly checksum?: string;
  readonly error?: string;
  readonly bytesDownloaded: number;
  readonly totalBytes?: number;
  readonly retryCount: number;
}

export interface NetworkError extends Error {
  readonly code?: string;
  readonly statusCode?: number;
  retryable: boolean;
}

export class DownloadManager extends EventEmitter {
  private readonly options: DownloadOptions;

  constructor(options: Partial<DownloadOptions> = {}) {
    super();
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      timeout: options.timeout ?? 30000,
      userAgent: options.userAgent ?? "signaler-download-manager",
      checksumUrl: options.checksumUrl,
      resumeSupport: options.resumeSupport ?? true,
    };
  }

  async downloadWithRetry(url: string, destination: string): Promise<DownloadResult> {
    let lastError: NetworkError | undefined;
    let retryCount = 0;
    let existingBytes = 0;

    // Check if partial file exists for resumption
    if (this.options.resumeSupport) {
      try {
        const stats = await stat(destination);
        existingBytes = stats.size;
      } catch {
        // File doesn't exist, start fresh
        existingBytes = 0;
      }
    }

    while (retryCount <= this.options.maxRetries) {
      try {
        const result = await this.attemptDownload(url, destination, existingBytes);
        return {
          ...result,
          retryCount,
        };
      } catch (error) {
        lastError = this.normalizeError(error);
        
        if (!lastError.retryable || retryCount >= this.options.maxRetries) {
          break;
        }

        retryCount++;
        const delay = this.calculateBackoffDelay(retryCount);
        
        this.emit('retry', {
          attempt: retryCount,
          maxRetries: this.options.maxRetries,
          delay,
          error: lastError.message,
        });

        await this.sleep(delay);

        // For retryable errors, try to resume from where we left off
        if (this.options.resumeSupport) {
          try {
            const stats = await stat(destination);
            existingBytes = stats.size;
          } catch {
            existingBytes = 0;
          }
        }
      }
    }

    return {
      success: false,
      filePath: destination,
      error: lastError?.message ?? 'Unknown download error',
      bytesDownloaded: existingBytes,
      retryCount,
    };
  }

  private async attemptDownload(url: string, destination: string, resumeFromByte: number = 0): Promise<DownloadResult> {
    return new Promise<DownloadResult>((resolve, reject) => {
      const headers: Record<string, string> = {
        'User-Agent': this.options.userAgent,
      };

      // Add range header for resumption
      if (resumeFromByte > 0) {
        headers['Range'] = `bytes=${resumeFromByte}-`;
      }

      const startTime = Date.now();
      let bytesDownloaded = resumeFromByte;
      let totalBytes: number | undefined;
      let lastProgressTime = startTime;
      let lastProgressBytes = resumeFromByte;

      // Choose appropriate request function based on protocol
      const urlObj = new URL(url);
      const requestFn = urlObj.protocol === 'https:' ? httpsRequest : httpRequest;

      const req = requestFn(url, { 
        headers,
        timeout: this.options.timeout,
      }, (res) => {
        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          req.destroy();
          this.attemptDownload(res.headers.location, destination, resumeFromByte)
            .then(resolve)
            .catch(reject);
          return;
        }

        // Check for successful response
        if (!res.statusCode || (res.statusCode < 200 || res.statusCode >= 300)) {
          const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`) as NetworkError;
          (error as any).statusCode = res.statusCode;
          error.retryable = this.isRetryableStatusCode(res.statusCode);
          req.destroy();
          reject(error);
          return;
        }

        // Parse content length
        const contentLength = res.headers['content-length'];
        if (contentLength) {
          const responseBytes = parseInt(contentLength, 10);
          totalBytes = resumeFromByte + responseBytes;
        }

        // Create write stream (append mode for resumption)
        const writeStream = createWriteStream(destination, { 
          flags: resumeFromByte > 0 ? 'a' : 'w' 
        });

        // Track progress
        res.on('data', (chunk: Buffer) => {
          bytesDownloaded += chunk.length;
          
          const now = Date.now();
          const timeDelta = now - lastProgressTime;
          
          // Emit progress every 100ms to avoid overwhelming
          if (timeDelta >= 100) {
            const bytesDelta = bytesDownloaded - lastProgressBytes;
            const speed = bytesDelta / (timeDelta / 1000);
            
            const progress: DownloadProgress = {
              bytesDownloaded,
              totalBytes,
              percentage: totalBytes ? (bytesDownloaded / totalBytes) * 100 : undefined,
              speed,
              eta: totalBytes && speed > 0 ? (totalBytes - bytesDownloaded) / speed : undefined,
            };

            this.emit('progress', progress);
            
            lastProgressTime = now;
            lastProgressBytes = bytesDownloaded;
          }
        });

        // Pipe response to file
        res.pipe(writeStream);

        writeStream.on('finish', () => {
          writeStream.close();
          resolve({
            success: true,
            filePath: destination,
            bytesDownloaded,
            totalBytes,
            retryCount: 0, // Will be set by caller
          });
        });

        writeStream.on('error', (error) => {
          writeStream.close();
          const networkError = this.normalizeError(error);
          reject(networkError);
        });
      });

      req.on('error', (error) => {
        const networkError = this.normalizeError(error);
        reject(networkError);
      });

      req.on('timeout', () => {
        req.destroy();
        const error = new Error('Download timeout') as NetworkError;
        (error as any).code = 'TIMEOUT';
        error.retryable = true;
        reject(error);
      });

      req.end();
    });
  }

  async validateSource(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      
      // Validate GitHub domains
      const trustedDomains = [
        'github.com',
        'api.github.com',
        'objects.githubusercontent.com',
        'github-releases.githubusercontent.com',
        'codeload.github.com'
      ];

      const isGitHubDomain = trustedDomains.includes(urlObj.hostname);
      
      // For production, require HTTPS for GitHub domains
      // For testing, allow HTTP for localhost
      if (isGitHubDomain) {
        return urlObj.protocol === 'https:';
      }
      
      // Allow localhost for testing
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async calculateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash(algorithm);
      const stream = createReadStream(filePath);

      stream.on('data', (data) => {
        hash.update(data);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', reject);
    });
  }

  private normalizeError(error: unknown): NetworkError {
    if (error instanceof Error) {
      const networkError = error as NetworkError;
      
      // Determine if error is retryable
      if (networkError.retryable === undefined) {
        networkError.retryable = this.isRetryableError(error);
      }
      
      return networkError;
    }
    
    const networkError = new Error(String(error)) as NetworkError;
    networkError.retryable = false;
    return networkError;
  }

  private isRetryableError(error: Error): boolean {
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'TIMEOUT'
    ];

    return retryableCodes.some(code => 
      error.message.includes(code) || 
      ('code' in error && error.code === code)
    );
  }

  private isRetryableStatusCode(statusCode?: number): boolean {
    if (!statusCode) return false;
    
    // Retry on server errors and some client errors
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(statusCode);
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.options.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const maxDelay = 30000; // Cap at 30 seconds
    
    // Add jitter (±25%)
    const jitter = 0.25;
    const jitterRange = exponentialDelay * jitter;
    const jitterOffset = (Math.random() - 0.5) * 2 * jitterRange;
    
    return Math.min(exponentialDelay + jitterOffset, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up partial downloads on failure
  async cleanup(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // File might not exist, ignore error
    }
  }
}