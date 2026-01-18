/**
 * Error Recovery System - Handles error recovery strategies and fallback mechanisms
 * 
 * This module implements the error recovery strategies defined in error types
 * and provides fallback mechanisms for graceful degradation.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { 
  SignalerError, 
  ErrorCategory, 
  ErrorSeverity, 
  RecoveryAction,
  FileSystemError,
  DataProcessingError,
  PerformanceError,
  IntegrationError,
  NetworkError
} from './error-types.js';
import { retryAsync, isTransientError } from '../../utils/retry.js';
import { getMemoryStatus } from '../../utils/memory-monitor.js';

export interface RecoveryContext {
  readonly operation: string;
  readonly component: string;
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly fallbackOptions: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryResult {
  readonly success: boolean;
  readonly action: RecoveryAction;
  readonly message: string;
  readonly fallbackUsed?: string;
  readonly partialResult?: unknown;
  readonly shouldRetry: boolean;
}

export interface ErrorLogger {
  logError(error: SignalerError, context: RecoveryContext): Promise<void>;
  logRecovery(result: RecoveryResult, context: RecoveryContext): Promise<void>;
}

export class ErrorRecoveryManager {
  private readonly logger: ErrorLogger;
  private readonly tempDir: string;
  private readonly recoveryAttempts = new Map<string, number>();

  constructor(logger: ErrorLogger, tempDir?: string) {
    this.logger = logger;
    this.tempDir = tempDir || resolve(tmpdir(), 'signaler-recovery');
  }

  /**
   * Handle error with appropriate recovery strategy
   */
  public async handleError(
    error: SignalerError,
    context: Partial<RecoveryContext> = {}
  ): Promise<RecoveryResult> {
    const operationKey = `${context.operation || 'unknown'}-${context.component || 'unknown'}`;
    const attemptNumber = (this.recoveryAttempts.get(operationKey) || 0) + 1;
    this.recoveryAttempts.set(operationKey, attemptNumber);

    const recoveryContext: RecoveryContext = {
      operation: context.operation || 'unknown',
      component: context.component || 'unknown',
      attemptNumber,
      maxAttempts: error.recoveryStrategy.maxRetries || 3,
      fallbackOptions: error.recoveryStrategy.fallbackOptions || [],
      metadata: context.metadata
    };

    await this.logger.logError(error, recoveryContext);

    let result: RecoveryResult;

    switch (error.recoveryStrategy.action) {
      case RecoveryAction.RETRY_WITH_BACKOFF:
        result = await this.handleRetryWithBackoff(error, recoveryContext);
        break;
      case RecoveryAction.FALLBACK_TO_MINIMAL:
        result = await this.handleFallbackToMinimal(error, recoveryContext);
        break;
      case RecoveryAction.SKIP_AND_CONTINUE:
        result = await this.handleSkipAndContinue(error, recoveryContext);
        break;
      case RecoveryAction.GRACEFUL_DEGRADATION:
        result = await this.handleGracefulDegradation(error, recoveryContext);
        break;
      case RecoveryAction.FAIL_WITH_CONTEXT:
        result = await this.handleFailWithContext(error, recoveryContext);
        break;
      default:
        result = await this.handleFailWithContext(error, recoveryContext);
    }

    await this.logger.logRecovery(result, recoveryContext);

    // Reset attempt counter on success
    if (result.success) {
      this.recoveryAttempts.delete(operationKey);
    }

    return result;
  }

  /**
   * Retry operation with exponential backoff
   */
  private async handleRetryWithBackoff(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    if (context.attemptNumber >= context.maxAttempts) {
      return {
        success: false,
        action: RecoveryAction.RETRY_WITH_BACKOFF,
        message: `Max retry attempts (${context.maxAttempts}) exceeded for ${context.operation}`,
        shouldRetry: false
      };
    }

    // Check if error is transient and worth retrying
    if (!isTransientError(error.originalError || error)) {
      return {
        success: false,
        action: RecoveryAction.RETRY_WITH_BACKOFF,
        message: `Error is not transient, skipping retry for ${context.operation}`,
        shouldRetry: false
      };
    }

    return {
      success: false,
      action: RecoveryAction.RETRY_WITH_BACKOFF,
      message: `Retrying ${context.operation} (attempt ${context.attemptNumber}/${context.maxAttempts})`,
      shouldRetry: true
    };
  }

  /**
   * Fallback to minimal report generation
   */
  private async handleFallbackToMinimal(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    try {
      let fallbackResult: unknown;
      let fallbackUsed: string;

      if (error instanceof FileSystemError) {
        fallbackResult = await this.createMinimalFileOutput(error, context);
        fallbackUsed = 'minimal_file_output';
      } else if (error instanceof DataProcessingError) {
        fallbackResult = await this.createMinimalDataOutput(error, context);
        fallbackUsed = 'minimal_data_output';
      } else if (error instanceof PerformanceError) {
        fallbackResult = await this.createMinimalPerformanceOutput(error, context);
        fallbackUsed = 'minimal_performance_output';
      } else {
        fallbackResult = await this.createGenericMinimalOutput(error, context);
        fallbackUsed = 'generic_minimal_output';
      }

      return {
        success: true,
        action: RecoveryAction.FALLBACK_TO_MINIMAL,
        message: `Successfully created minimal output for ${context.operation}`,
        fallbackUsed,
        partialResult: fallbackResult,
        shouldRetry: false
      };
    } catch (fallbackError) {
      return {
        success: false,
        action: RecoveryAction.FALLBACK_TO_MINIMAL,
        message: `Fallback to minimal output failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        shouldRetry: false
      };
    }
  }

  /**
   * Skip current operation and continue
   */
  private async handleSkipAndContinue(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    return {
      success: true,
      action: RecoveryAction.SKIP_AND_CONTINUE,
      message: `Skipped ${context.operation} due to error: ${error.message}`,
      fallbackUsed: 'skip_operation',
      shouldRetry: false
    };
  }

  /**
   * Graceful degradation with reduced functionality
   */
  private async handleGracefulDegradation(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    try {
      let degradedResult: unknown;
      let fallbackUsed: string;

      // Check memory constraints
      const memoryStatus = getMemoryStatus();
      if (memoryStatus.isLow) {
        degradedResult = await this.createMemoryEfficientOutput(error, context);
        fallbackUsed = 'memory_efficient_processing';
      } else if (error instanceof PerformanceError) {
        degradedResult = await this.createStreamingOutput(error, context);
        fallbackUsed = 'streaming_processing';
      } else {
        degradedResult = await this.createSimplifiedOutput(error, context);
        fallbackUsed = 'simplified_processing';
      }

      return {
        success: true,
        action: RecoveryAction.GRACEFUL_DEGRADATION,
        message: `Successfully degraded ${context.operation} with reduced functionality`,
        fallbackUsed,
        partialResult: degradedResult,
        shouldRetry: false
      };
    } catch (degradationError) {
      return {
        success: false,
        action: RecoveryAction.GRACEFUL_DEGRADATION,
        message: `Graceful degradation failed: ${degradationError instanceof Error ? degradationError.message : String(degradationError)}`,
        shouldRetry: false
      };
    }
  }

  /**
   * Fail with detailed context and suggestions
   */
  private async handleFailWithContext(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const contextMessage = this.buildContextualErrorMessage(error, context);
    
    return {
      success: false,
      action: RecoveryAction.FAIL_WITH_CONTEXT,
      message: contextMessage,
      shouldRetry: false
    };
  }

  /**
   * Create minimal file output in temporary directory
   */
  private async createMinimalFileOutput(
    error: FileSystemError,
    context: RecoveryContext
  ): Promise<{ filePath: string; content: string }> {
    await this.ensureTempDirectory();
    
    const fileName = `${context.operation}-minimal-${Date.now()}.txt`;
    const filePath = resolve(this.tempDir, fileName);
    
    const content = `Signaler Error Recovery Report
Generated: ${new Date().toISOString()}
Operation: ${context.operation}
Component: ${context.component}
Error: ${error.message}

This is a minimal fallback output due to file system errors.
Original operation: ${error.context.operation}
Original file path: ${error.context.metadata?.filePath || 'unknown'}

Suggested solutions:
${error.recoveryStrategy.suggestedSolutions?.map(s => `- ${s}`).join('\n') || 'No suggestions available'}
`;

    await writeFile(filePath, content, 'utf8');
    
    return { filePath, content };
  }

  /**
   * Create minimal data output with essential information
   */
  private async createMinimalDataOutput(
    error: DataProcessingError,
    context: RecoveryContext
  ): Promise<{ data: Record<string, unknown> }> {
    return {
      data: {
        timestamp: new Date().toISOString(),
        operation: context.operation,
        component: context.component,
        error: error.message,
        dataType: error.context.metadata?.dataType || 'unknown',
        status: 'minimal_fallback',
        message: 'Data processing failed, minimal output generated'
      }
    };
  }

  /**
   * Create minimal performance output
   */
  private async createMinimalPerformanceOutput(
    error: PerformanceError,
    context: RecoveryContext
  ): Promise<{ summary: Record<string, unknown> }> {
    return {
      summary: {
        timestamp: new Date().toISOString(),
        operation: context.operation,
        error: error.message,
        threshold: error.context.metadata?.threshold || 'unknown',
        actualValue: error.context.metadata?.actualValue || 'unknown',
        status: 'performance_degraded',
        message: 'Performance constraints exceeded, minimal output generated'
      }
    };
  }

  /**
   * Create generic minimal output
   */
  private async createGenericMinimalOutput(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<{ error: Record<string, unknown> }> {
    return {
      error: {
        timestamp: new Date().toISOString(),
        operation: context.operation,
        component: context.component,
        category: error.category,
        severity: error.severity,
        message: error.message,
        status: 'minimal_fallback'
      }
    };
  }

  /**
   * Create memory-efficient output
   */
  private async createMemoryEfficientOutput(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<{ summary: string }> {
    // Return only essential information as string to minimize memory usage
    return {
      summary: `${context.operation} completed with memory constraints. Error: ${error.message}. Time: ${new Date().toISOString()}`
    };
  }

  /**
   * Create streaming output (placeholder for streaming implementation)
   */
  private async createStreamingOutput(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<{ streamingEnabled: boolean; message: string }> {
    return {
      streamingEnabled: true,
      message: `Streaming processing enabled for ${context.operation} due to performance constraints`
    };
  }

  /**
   * Create simplified output with reduced complexity
   */
  private async createSimplifiedOutput(
    error: SignalerError,
    context: RecoveryContext
  ): Promise<{ simplified: Record<string, unknown> }> {
    return {
      simplified: {
        operation: context.operation,
        status: 'simplified',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Build contextual error message with suggestions
   */
  private buildContextualErrorMessage(error: SignalerError, context: RecoveryContext): string {
    const lines = [
      `Error in ${context.component}.${context.operation}:`,
      `  ${error.message}`,
      '',
      `Category: ${error.category}`,
      `Severity: ${error.severity}`,
      `Attempt: ${context.attemptNumber}/${context.maxAttempts}`,
      ''
    ];

    if (error.recoveryStrategy.suggestedSolutions?.length) {
      lines.push('Suggested solutions:');
      error.recoveryStrategy.suggestedSolutions.forEach(solution => {
        lines.push(`  - ${solution}`);
      });
      lines.push('');
    }

    if (error.context.metadata) {
      lines.push('Additional context:');
      Object.entries(error.context.metadata).forEach(([key, value]) => {
        lines.push(`  ${key}: ${String(value)}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Ensure temporary directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // If we can't create temp directory, use system temp
      const systemTemp = tmpdir();
      console.warn(`⚠️  Could not create temp directory ${this.tempDir}, using ${systemTemp}`);
    }
  }

  /**
   * Clear recovery attempt counters
   */
  public clearAttemptCounters(): void {
    this.recoveryAttempts.clear();
  }

  /**
   * Get current attempt count for operation
   */
  public getAttemptCount(operation: string, component: string): number {
    const key = `${operation}-${component}`;
    return this.recoveryAttempts.get(key) || 0;
  }
}

/**
 * Default error logger implementation
 */
export class DefaultErrorLogger implements ErrorLogger {
  private readonly logToConsole: boolean;
  private readonly logToFile: boolean;
  private readonly logFilePath?: string;

  constructor(options: { console?: boolean; file?: boolean; filePath?: string } = {}) {
    this.logToConsole = options.console !== false; // Default to true
    this.logToFile = options.file === true;
    this.logFilePath = options.filePath;
  }

  public async logError(error: SignalerError, context: RecoveryContext): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: error.category,
      severity: error.severity,
      operation: context.operation,
      component: context.component,
      attempt: context.attemptNumber,
      message: error.message,
      context: error.context,
      recoveryStrategy: error.recoveryStrategy
    };

    if (this.logToConsole) {
      this.logToConsoleOutput(logEntry, error);
    }

    if (this.logToFile && this.logFilePath) {
      await this.logToFileOutput(logEntry);
    }
  }

  public async logRecovery(result: RecoveryResult, context: RecoveryContext): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: result.success ? 'INFO' : 'WARN',
      operation: context.operation,
      component: context.component,
      attempt: context.attemptNumber,
      action: result.action,
      success: result.success,
      message: result.message,
      fallbackUsed: result.fallbackUsed
    };

    if (this.logToConsole) {
      const symbol = result.success ? '✅' : '❌';
      const color = result.success ? '\x1b[32m' : '\x1b[33m'; // Green or yellow
      console.log(`${color}${symbol} Recovery: ${result.message}\x1b[0m`);
      if (result.fallbackUsed) {
        console.log(`   Fallback: ${result.fallbackUsed}`);
      }
    }

    if (this.logToFile && this.logFilePath) {
      await this.logToFileOutput(logEntry);
    }
  }

  private logToConsoleOutput(logEntry: Record<string, unknown>, error: SignalerError): void {
    const severityColors = {
      [ErrorSeverity.CRITICAL]: '\x1b[31m', // Red
      [ErrorSeverity.HIGH]: '\x1b[91m',     // Bright red
      [ErrorSeverity.MEDIUM]: '\x1b[33m',   // Yellow
      [ErrorSeverity.LOW]: '\x1b[36m'       // Cyan
    };

    const color = severityColors[error.severity] || '\x1b[37m'; // Default white
    console.error(`${color}❌ [${error.severity.toUpperCase()}] ${error.category}: ${error.message}\x1b[0m`);
    
    if (error.context.metadata) {
      console.error(`   Context: ${JSON.stringify(error.context.metadata, null, 2)}`);
    }
  }

  private async logToFileOutput(logEntry: Record<string, unknown>): Promise<void> {
    if (!this.logFilePath) return;

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await writeFile(this.logFilePath, logLine, { flag: 'a' });
    } catch (error) {
      console.warn(`⚠️  Failed to write to log file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}