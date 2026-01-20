/**
 * Error Types - Comprehensive error classification system
 * 
 * This module defines all error types and their classification for
 * proper error handling and recovery strategies.
 */

export enum ErrorCategory {
  FILE_SYSTEM = 'filesystem',
  DATA_PROCESSING = 'data_processing',
  PERFORMANCE = 'performance',
  INTEGRATION = 'integration',
  MEMORY = 'memory',
  NETWORK = 'network',
  VALIDATION = 'validation'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum RecoveryAction {
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  FALLBACK_TO_MINIMAL = 'fallback_to_minimal',
  SKIP_AND_CONTINUE = 'skip_and_continue',
  FAIL_WITH_CONTEXT = 'fail_with_context',
  GRACEFUL_DEGRADATION = 'graceful_degradation'
}

/**
 * Error context metadata attached to a {@link SignalerError} instance.
 */
export interface ErrorContext {
  readonly operation: string;
  readonly component: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
  readonly stackTrace?: string;
}

/**
 * Strategy describing how an error should be recovered or reported.
 */
export interface RecoveryStrategy {
  action: RecoveryAction;
  maxRetries?: number;
  fallbackOptions?: string[];
  userMessage?: string;
  suggestedSolutions?: string[];
}

/**
 * Base class for all typed errors thrown by Signaler.
 */
export abstract class SignalerError extends Error {
  public category: ErrorCategory;
  public severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly originalError?: Error;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext,
    recoveryStrategy: RecoveryStrategy,
    originalError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.recoveryStrategy = recoveryStrategy;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      recoveryStrategy: this.recoveryStrategy,
      originalError: this.originalError?.message,
      stack: this.stack
    };
  }
}

// File System Errors
/**
 * Error raised for filesystem operations (read/write/create/delete).
 */
export class FileSystemError extends SignalerError {
  constructor(
    message: string,
    operation: string,
    filePath: string,
    originalError?: Error,
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    const context: ErrorContext = {
      operation,
      component: 'filesystem',
      timestamp: new Date().toISOString(),
      metadata: { filePath },
      stackTrace: originalError?.stack
    };

    const recoveryStrategy: RecoveryStrategy = {
      action: RecoveryAction.RETRY_WITH_BACKOFF,
      maxRetries: 3,
      fallbackOptions: ['temporary_directory', 'minimal_output'],
      userMessage: `Failed to ${operation} file: ${filePath}`,
      suggestedSolutions: [
        'Check file permissions',
        'Ensure directory exists',
        'Verify disk space availability',
        'Close other applications using the file'
      ]
    };

    super(message, ErrorCategory.FILE_SYSTEM, severity, context, recoveryStrategy, originalError);
  }
}

/**
 * Error raised when the CLI cannot create a required directory.
 */
export class DirectoryCreationError extends FileSystemError {
  constructor(directoryPath: string, originalError?: Error) {
    super(
      `Failed to create directory: ${directoryPath}`,
      'create_directory',
      directoryPath,
      originalError,
      ErrorSeverity.HIGH
    );

    this.recoveryStrategy.fallbackOptions = ['temporary_directory', 'current_directory'];
    this.recoveryStrategy.suggestedSolutions = [
      'Check parent directory permissions',
      'Verify disk space availability',
      'Ensure path is valid',
      'Run with elevated permissions if necessary'
    ];
  }
}

/**
 * Error raised when writing a file fails.
 */
export class FileWriteError extends FileSystemError {
  constructor(filePath: string, originalError?: Error) {
    super(
      `Failed to write file: ${filePath}`,
      'write_file',
      filePath,
      originalError,
      ErrorSeverity.MEDIUM
    );

    this.recoveryStrategy.fallbackOptions = ['alternative_format', 'minimal_content'];
  }
}

/**
 * Error raised when reading a file fails.
 */
export class FileReadError extends FileSystemError {
  constructor(filePath: string, originalError?: Error) {
    super(
      `Failed to read file: ${filePath}`,
      'read_file',
      filePath,
      originalError,
      ErrorSeverity.MEDIUM
    );

    this.recoveryStrategy.action = RecoveryAction.SKIP_AND_CONTINUE;
    this.recoveryStrategy.fallbackOptions = ['default_content', 'skip_file'];
  }
}

// Data Processing Errors
/**
 * Error raised when processing or transforming data fails.
 */
export class DataProcessingError extends SignalerError {
  constructor(
    message: string,
    operation: string,
    dataType: string,
    originalError?: Error,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    const context: ErrorContext = {
      operation,
      component: 'data_processing',
      timestamp: new Date().toISOString(),
      metadata: { dataType },
      stackTrace: originalError?.stack
    };

    const recoveryStrategy: RecoveryStrategy = {
      action: RecoveryAction.GRACEFUL_DEGRADATION,
      fallbackOptions: ['simplified_processing', 'skip_invalid_data'],
      userMessage: `Data processing failed for ${dataType}`,
      suggestedSolutions: [
        'Check input data format',
        'Verify data integrity',
        'Update data processing logic'
      ]
    };

    super(message, ErrorCategory.DATA_PROCESSING, severity, context, recoveryStrategy, originalError);
  }
}

/**
 * Error raised when JSON serialization fails.
 */
export class JSONSerializationError extends DataProcessingError {
  constructor(dataType: string, originalError?: Error) {
    super(
      `Failed to serialize ${dataType} to JSON`,
      'json_serialization',
      dataType,
      originalError,
      ErrorSeverity.MEDIUM
    );

    this.recoveryStrategy.fallbackOptions = ['minimal_output', 'text_format'];
  }
}

/**
 * Error raised when pattern analysis fails.
 */
export class PatternAnalysisError extends DataProcessingError {
  constructor(patternType: string, originalError?: Error) {
    super(
      `Pattern analysis failed for ${patternType}`,
      'pattern_analysis',
      patternType,
      originalError,
      ErrorSeverity.LOW
    );

    this.recoveryStrategy.action = RecoveryAction.SKIP_AND_CONTINUE;
  }
}

// Performance Errors
/**
 * Error raised for performance-related constraints (timeouts/memory).
 */
export class PerformanceError extends SignalerError {
  constructor(
    message: string,
    operation: string,
    threshold: string,
    actualValue: string,
    originalError?: Error
  ) {
    const context: ErrorContext = {
      operation,
      component: 'performance',
      timestamp: new Date().toISOString(),
      metadata: { threshold, actualValue },
      stackTrace: originalError?.stack
    };

    const recoveryStrategy: RecoveryStrategy = {
      action: RecoveryAction.GRACEFUL_DEGRADATION,
      fallbackOptions: ['streaming_processing', 'batch_processing', 'minimal_output'],
      userMessage: `Performance threshold exceeded: ${operation}`,
      suggestedSolutions: [
        'Reduce batch size',
        'Enable streaming processing',
        'Close other applications',
        'Increase system resources'
      ]
    };

    super(message, ErrorCategory.PERFORMANCE, ErrorSeverity.MEDIUM, context, recoveryStrategy, originalError);
  }
}

/**
 * Error raised when report generation exceeds the configured timeout.
 */
export class ReportGenerationTimeoutError extends PerformanceError {
  constructor(timeoutMs: number, actualMs: number) {
    super(
      `Report generation timed out after ${actualMs}ms (limit: ${timeoutMs}ms)`,
      'report_generation',
      `${timeoutMs}ms`,
      `${actualMs}ms`
    );

    this.recoveryStrategy.fallbackOptions = ['partial_report', 'summary_only'];
  }
}

/**
 * Error raised when the system detects insufficient available memory.
 */
export class MemoryExhaustionError extends PerformanceError {
  constructor(requiredMB: number, availableMB: number) {
    super(
      `Insufficient memory: ${requiredMB}MB required, ${availableMB}MB available`,
      'memory_allocation',
      `${requiredMB}MB`,
      `${availableMB}MB`
    );

    this.category = ErrorCategory.MEMORY;
    this.severity = ErrorSeverity.HIGH;
    this.recoveryStrategy.fallbackOptions = ['streaming_processing', 'reduced_data_set'];
  }
}

// Integration Errors
/**
 * Error raised for third-party or platform integration failures.
 */
export class IntegrationError extends SignalerError {
  constructor(
    message: string,
    integration: string,
    operation: string,
    originalError?: Error,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    const context: ErrorContext = {
      operation,
      component: 'integration',
      timestamp: new Date().toISOString(),
      metadata: { integration },
      stackTrace: originalError?.stack
    };

    const recoveryStrategy: RecoveryStrategy = {
      action: RecoveryAction.RETRY_WITH_BACKOFF,
      maxRetries: 3,
      fallbackOptions: ['local_storage', 'skip_integration'],
      userMessage: `Integration failed: ${integration}`,
      suggestedSolutions: [
        'Check network connectivity',
        'Verify integration configuration',
        'Check service availability'
      ]
    };

    super(message, ErrorCategory.INTEGRATION, severity, context, recoveryStrategy, originalError);
  }
}

/**
 * Error raised when a webhook delivery fails.
 */
export class WebhookDeliveryError extends IntegrationError {
  constructor(webhookUrl: string, originalError?: Error) {
    super(
      `Failed to deliver webhook to ${webhookUrl}`,
      'webhook',
      'delivery',
      originalError,
      ErrorSeverity.LOW
    );

    this.recoveryStrategy.maxRetries = 5;
    this.recoveryStrategy.fallbackOptions = ['local_storage', 'retry_later'];
  }
}

/**
 * Error raised for CI/CD provider integration failures.
 */
export class CICDIntegrationError extends IntegrationError {
  constructor(platform: string, operation: string, originalError?: Error) {
    super(
      `CI/CD integration failed for ${platform}: ${operation}`,
      platform,
      operation,
      originalError,
      ErrorSeverity.MEDIUM
    );

    this.recoveryStrategy.fallbackOptions = ['basic_analysis', 'skip_pattern_analysis'];
  }
}

// Network Errors
/**
 * Error raised for network-related operations (requests/connections).
 */
export class NetworkError extends SignalerError {
  constructor(
    message: string,
    operation: string,
    endpoint?: string,
    originalError?: Error
  ) {
    const context: ErrorContext = {
      operation,
      component: 'network',
      timestamp: new Date().toISOString(),
      metadata: { endpoint },
      stackTrace: originalError?.stack
    };

    const recoveryStrategy: RecoveryStrategy = {
      action: RecoveryAction.RETRY_WITH_BACKOFF,
      maxRetries: 3,
      fallbackOptions: ['offline_mode', 'cached_data'],
      userMessage: `Network operation failed: ${operation}`,
      suggestedSolutions: [
        'Check internet connectivity',
        'Verify firewall settings',
        'Try again later',
        'Use offline mode if available'
      ]
    };

    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context, recoveryStrategy, originalError);
  }
}

// Validation Errors
/**
 * Error raised when configuration or input validation fails.
 */
export class ValidationError extends SignalerError {
  constructor(
    message: string,
    field: string,
    value: unknown,
    expectedFormat?: string
  ) {
    const context: ErrorContext = {
      operation: 'validation',
      component: 'validator',
      timestamp: new Date().toISOString(),
      metadata: { field, value, expectedFormat }
    };

    const recoveryStrategy: RecoveryStrategy = {
      action: RecoveryAction.FAIL_WITH_CONTEXT,
      userMessage: `Validation failed for ${field}`,
      suggestedSolutions: [
        'Check input format',
        'Verify configuration values',
        'Consult documentation for expected format'
      ]
    };

    super(message, ErrorCategory.VALIDATION, ErrorSeverity.HIGH, context, recoveryStrategy);
  }
}