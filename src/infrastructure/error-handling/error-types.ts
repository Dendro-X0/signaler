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

export interface ErrorContext {
  readonly operation: string;
  readonly component: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
  readonly stackTrace?: string;
}

export interface RecoveryStrategy {
  action: RecoveryAction;
  maxRetries?: number;
  fallbackOptions?: string[];
  userMessage?: string;
  suggestedSolutions?: string[];
}

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

export class JSONSerializationError extends DataProcessingError {
  constructor(dataType: string, originalError?: Error) {
    super(
      `Failed to serialize ${dataType} to JSON`,
      'json_serialization',
      dataType,
      originalError,
      ErrorSeverity.MEDIUM
    );

    this.recoveryStrategy.fallbackOptions = ['simplified_structure', 'string_fallback'];
  }
}

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
    this.recoveryStrategy.fallbackOptions = ['local_log', 'skip_webhook'];
  }
}

export class CICDIntegrationError extends IntegrationError {
  constructor(platform: string, operation: string, originalError?: Error) {
    super(
      `CI/CD integration failed for ${platform}: ${operation}`,
      platform,
      operation,
      originalError,
      ErrorSeverity.MEDIUM
    );

    this.recoveryStrategy.fallbackOptions = ['generic_format', 'local_output'];
  }
}

// Network Errors
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