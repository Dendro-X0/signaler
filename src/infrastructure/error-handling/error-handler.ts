/**
 * Error Handler - Main error handling orchestrator
 * 
 * This module provides the main error handling interface that integrates
 * error classification, recovery strategies, and logging.
 */

import { 
  SignalerError, 
  ErrorCategory, 
  ErrorSeverity,
  FileSystemError,
  DirectoryCreationError,
  FileWriteError,
  FileReadError,
  DataProcessingError,
  JSONSerializationError,
  PatternAnalysisError,
  PerformanceError,
  ReportGenerationTimeoutError,
  MemoryExhaustionError,
  IntegrationError,
  WebhookDeliveryError,
  CICDIntegrationError,
  NetworkError,
  ValidationError
} from './error-types.js';
import { 
  ErrorRecoveryManager, 
  DefaultErrorLogger, 
  RecoveryContext, 
  RecoveryResult,
  ErrorLogger
} from './error-recovery.js';
import { retryAsync, isTransientError } from '../../utils/retry.js';
import { getMemoryStatus, checkMemoryAvailability } from '../../utils/memory-monitor.js';

/**
 * Configuration options for {@link ErrorHandler}.
 */
export interface ErrorHandlerConfig {
  readonly enableConsoleLogging: boolean;
  readonly enableFileLogging: boolean;
  readonly logFilePath?: string;
  readonly tempDirectory?: string;
  readonly maxRetryAttempts: number;
  readonly memoryThresholdMB: number;
  readonly timeoutMs: number;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableConsoleLogging: true,
  enableFileLogging: false,
  maxRetryAttempts: 3,
  memoryThresholdMB: 1024,
  timeoutMs: 10000
};

/**
 * Main error handling orchestrator that classifies errors and applies recovery strategies.
 */
export class ErrorHandler {
  /**
   * Configuration for the error handler.
   */
  private readonly config: ErrorHandlerConfig;

  /**
   * Manager for error recovery strategies.
   */
  private readonly recoveryManager: ErrorRecoveryManager;

  /**
   * Logger for error logging.
   */
  private readonly logger: ErrorLogger;

  /**
   * Creates a new instance of the error handler with the given configuration.
   * 
   * @param config - Configuration options for the error handler.
   */
  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.logger = new DefaultErrorLogger({
      console: this.config.enableConsoleLogging,
      file: this.config.enableFileLogging,
      filePath: this.config.logFilePath
    });

    this.recoveryManager = new ErrorRecoveryManager(this.logger, this.config.tempDirectory);
  }

  /**
   * Handle any error with automatic classification and recovery
   */
  public async handleError(
    error: unknown,
    operation: string,
    component: string,
    metadata?: Record<string, unknown>
  ): Promise<RecoveryResult> {
    const signalerError = this.classifyError(error, operation, component, metadata);
    
    const context: Partial<RecoveryContext> = {
      operation,
      component,
      metadata
    };

    return this.recoveryManager.handleError(signalerError, context);
  }

  /**
   * Execute operation with comprehensive error handling
   */
  public async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    // Check memory availability before starting
    const memoryCheck = checkMemoryAvailability(this.config.memoryThresholdMB);
    if (!memoryCheck.available) {
      throw new MemoryExhaustionError(
        this.config.memoryThresholdMB,
        getMemoryStatus().freeMemoryMB
      );
    }

    try {
      // Execute with timeout
      return await this.executeWithTimeout(operation, this.config.timeoutMs);
    } catch (error) {
      const recoveryResult = await this.handleError(error, operationName, component, metadata);
      
      if (recoveryResult.success && recoveryResult.partialResult !== undefined) {
        return recoveryResult.partialResult as T;
      }
      
      if (recoveryResult.shouldRetry) {
        // Retry the operation
        return this.retryOperation(operation, operationName, component, metadata);
      }
      
      // Re-throw the original error with enhanced context
      if (error instanceof SignalerError) {
        throw error;
      }
      
      throw this.classifyError(error, operationName, component, metadata);
    }
  }

  /**
   * Execute operation with retry logic
   */
  public async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return retryAsync(operation, {
      maxAttempts: this.config.maxRetryAttempts,
      shouldRetry: (error) => {
        const signalerError = this.classifyError(error, operationName, component, metadata);
        return isTransientError(signalerError.originalError || signalerError);
      },
      onRetry: async (attempt, error) => {
        await this.handleError(error, operationName, component, {
          ...metadata,
          retryAttempt: attempt
        });
      }
    });
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new ReportGenerationTimeoutError(timeoutMs, timeoutMs));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Classify unknown error into appropriate SignalerError type
   */
  private classifyError(
    error: unknown,
    operation: string,
    component: string,
    metadata?: Record<string, unknown>
  ): SignalerError {
    if (error instanceof SignalerError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const originalError = error instanceof Error ? error : undefined;

    // File system errors
    if (this.isFileSystemError(errorMessage)) {
      const filePath = metadata?.filePath as string || 'unknown';
      
      if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
        return new FileReadError(filePath, originalError);
      }
      
      if (errorMessage.includes('EACCES') || errorMessage.includes('permission denied')) {
        return new FileWriteError(filePath, originalError);
      }
      
      if (errorMessage.includes('EEXIST') || errorMessage.includes('already exists')) {
        return new DirectoryCreationError(filePath, originalError);
      }
      
      return new FileSystemError(errorMessage, operation, filePath, originalError);
    }

    // Memory errors
    if (this.isMemoryError(errorMessage)) {
      const memoryStatus = getMemoryStatus();
      return new MemoryExhaustionError(
        this.config.memoryThresholdMB,
        memoryStatus.freeMemoryMB
      );
    }

    // Network errors
    if (this.isNetworkError(errorMessage)) {
      const endpoint = metadata?.endpoint as string;
      return new NetworkError(errorMessage, operation, endpoint, originalError);
    }

    // Performance/timeout errors
    if (this.isTimeoutError(errorMessage)) {
      return new ReportGenerationTimeoutError(this.config.timeoutMs, this.config.timeoutMs);
    }

    // JSON/serialization errors
    if (this.isSerializationError(errorMessage)) {
      const dataType = metadata?.dataType as string || 'unknown';
      return new JSONSerializationError(dataType, originalError);
    }

    // Validation errors
    if (this.isValidationError(errorMessage)) {
      const field = metadata?.field as string || 'unknown';
      const value = metadata?.value;
      return new ValidationError(errorMessage, field, value);
    }

    // Integration errors
    if (this.isIntegrationError(errorMessage, metadata)) {
      const integration = metadata?.integration as string || 'unknown';
      
      if (integration.includes('webhook') || errorMessage.includes('webhook')) {
        const webhookUrl = metadata?.webhookUrl as string || 'unknown';
        return new WebhookDeliveryError(webhookUrl, originalError);
      }
      
      if (this.isCICDError(errorMessage, metadata)) {
        const platform = metadata?.platform as string || 'unknown';
        return new CICDIntegrationError(platform, operation, originalError);
      }
      
      return new IntegrationError(errorMessage, integration, operation, originalError);
    }

    // Pattern analysis errors
    if (component.includes('pattern') || operation.includes('pattern')) {
      const patternType = metadata?.patternType as string || 'unknown';
      return new PatternAnalysisError(patternType, originalError);
    }

    // Default to data processing error
    const dataType = metadata?.dataType as string || 'unknown';
    return new DataProcessingError(errorMessage, operation, dataType, originalError);
  }

  /**
   * Check if error is file system related
   */
  private isFileSystemError(message: string): boolean {
    const fsErrorPatterns = [
      'ENOENT', 'EACCES', 'EEXIST', 'EMFILE', 'ENFILE', 'ENOSPC',
      'no such file', 'permission denied', 'already exists',
      'too many open files', 'no space left', 'read-only file system'
    ];
    
    return fsErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is memory related
   */
  private isMemoryError(message: string): boolean {
    const memoryErrorPatterns = [
      'out of memory', 'heap out of memory', 'maximum call stack',
      'allocation failed', 'cannot allocate memory'
    ];
    
    return memoryErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is network related
   */
  private isNetworkError(message: string): boolean {
    const networkErrorPatterns = [
      'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
      'network error', 'connection refused', 'connection reset',
      'timeout', 'dns lookup failed', 'fetch failed'
    ];
    
    return networkErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is timeout related
   */
  private isTimeoutError(message: string): boolean {
    const timeoutPatterns = [
      'timeout', 'timed out', 'operation timeout', 'request timeout'
    ];
    
    return timeoutPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is serialization related
   */
  private isSerializationError(message: string): boolean {
    const serializationPatterns = [
      'JSON.parse', 'JSON.stringify', 'unexpected token',
      'invalid json', 'serialization', 'circular reference'
    ];
    
    return serializationPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is validation related
   */
  private isValidationError(message: string): boolean {
    const validationPatterns = [
      'validation', 'invalid', 'required', 'expected',
      'schema', 'format', 'constraint'
    ];
    
    return validationPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is integration related
   */
  private isIntegrationError(message: string, metadata?: Record<string, unknown>): boolean {
    const integrationPatterns = [
      'webhook', 'api', 'integration', 'external service',
      'third party', 'remote', 'endpoint'
    ];
    
    const hasIntegrationMetadata = Boolean(metadata && (
      metadata.integration || metadata.webhook || metadata.platform
    ));
    
    return hasIntegrationMetadata || integrationPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is CI/CD related
   */
  private isCICDError(message: string, metadata?: Record<string, unknown>): boolean {
    const cicdPatterns = [
      'github actions', 'gitlab ci', 'jenkins', 'ci/cd',
      'build', 'deploy', 'pipeline'
    ];
    
    const hasCICDMetadata = Boolean(metadata && metadata.platform);
    
    return hasCICDMetadata || cicdPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Get recovery manager for advanced operations
   */
  public getRecoveryManager(): ErrorRecoveryManager {
    return this.recoveryManager;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Clear all recovery attempt counters
   */
  public clearRecoveryState(): void {
    this.recoveryManager.clearAttemptCounters();
  }
}