/**
 * Retry utilities for handling transient failures
 */

export interface RetryOptions {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
  readonly jitterMs: number;
  readonly shouldRetry?: (error: unknown) => boolean;
  readonly onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 200,
  maxDelayMs: 3000,
  backoffMultiplier: 2,
  jitterMs: 200,
};

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, Math.min(attempt, 4));
  const jitter = Math.floor(Math.random() * options.jitterMs);
  return Math.min(options.maxDelayMs, exponentialDelay + jitter);
}

/**
 * Delay for specified milliseconds
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (opts.shouldRetry && !opts.shouldRetry(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === opts.maxAttempts - 1) {
        throw error;
      }
      
      // Call retry callback
      if (opts.onRetry) {
        opts.onRetry(attempt + 1, error);
      }
      
      // Wait before retrying
      const delayMs = calculateRetryDelay(attempt, opts);
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Check if an error is transient and should be retried
 */
export function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  
  // Network errors
  if (
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('econnreset') ||
    lowerMessage.includes('etimedout') ||
    lowerMessage.includes('socket hang up') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('network')
  ) {
    return true;
  }
  
  // Chrome/CDP errors
  if (
    lowerMessage.includes('target closed') ||
    lowerMessage.includes('targetcloseerror') ||
    lowerMessage.includes('websocket') ||
    lowerMessage.includes('cdp') ||
    lowerMessage.includes('disconnected') ||
    lowerMessage.includes('setautoattach')
  ) {
    return true;
  }
  
  // Lighthouse errors
  if (
    lowerMessage.includes('lanternerror') ||
    lowerMessage.includes('performance mark has not been set') ||
    lowerMessage.includes('top level events')
  ) {
    return true;
  }
  
  // Timeout errors (may be transient)
  if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Retry with specific handling for Chrome/Lighthouse errors
 */
export async function retryLighthouseOperation<T>(
  operation: () => Promise<T>,
  context: string,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  return retryAsync(operation, {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    shouldRetry: isTransientError,
    onRetry: (attempt, error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️  ${context} failed (attempt ${attempt}/3): ${message}`);
      console.warn(`   Retrying in ${calculateRetryDelay(attempt - 1, DEFAULT_RETRY_OPTIONS)}ms...`);
      if (onRetry) {
        onRetry(attempt, error);
      }
    },
  });
}
