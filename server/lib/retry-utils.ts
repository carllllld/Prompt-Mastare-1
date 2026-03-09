/**
 * Enterprise-grade retry utilities with exponential backoff
 * For resilient external service calls
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  nonRetryableStatusCodes: number[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  onFailure?: (attempts: number, finalError: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDurationMs: number;
  retried: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'timeout',
    'rate limit',
    'RateLimitError',
    'insufficient_quota',
    'overloaded',
    'temporarily_unavailable',
    'service_unavailable',
    'internal_error',
  ],
  nonRetryableStatusCodes: [400, 401, 403, 404, 422, 429], // 429 moved here - handled specially
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * (multiplier ^ attempt)
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);

  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, config: RetryConfig): boolean {
  if (!error) return false;

  // Check status code for HTTP errors
  if (error.statusCode || error.status) {
    const status = error.statusCode || error.status;
    if (config.nonRetryableStatusCodes.includes(status)) {
      return false;
    }
    // Retry on 5xx and certain 4xx
    if (status >= 500 || status === 429) {
      return true;
    }
  }

  // Check error code
  if (error.code) {
    if (config.retryableErrors.includes(error.code)) {
      return true;
    }
  }

  // Check error message
  const message = error.message || String(error);
  for (const retryablePattern of config.retryableErrors) {
    if (message.toLowerCase().includes(retryablePattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await fn();

      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalDurationMs: Date.now() - startTime,
        retried: attempt > 0,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, finalConfig)) {
        if (finalConfig.onFailure) {
          finalConfig.onFailure(attempt + 1, lastError);
        }
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          totalDurationMs: Date.now() - startTime,
          retried: false,
        };
      }

      // Special handling for 429 (rate limit) - use retry-after if available
      const anyError = error as any;
      if (anyError.statusCode === 429 || anyError.status === 429) {
        const retryAfter = anyError.retryAfter || anyError.headers?.['retry-after'];
        if (retryAfter) {
          // Parse retry-after (can be seconds or HTTP date)
          const delayMs = isNaN(Number(retryAfter))
            ? new Date(retryAfter).getTime() - Date.now()
            : parseInt(retryAfter) * 1000;

          if (delayMs > 0 && delayMs < 60000) { // Max 60s wait
            if (finalConfig.onRetry) {
              finalConfig.onRetry(attempt + 1, lastError, delayMs);
            }
            await sleep(delayMs);
            continue;
          }
        }
      }

      // Calculate delay and wait
      const delayMs = calculateDelay(attempt, finalConfig);

      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt + 1, lastError, delayMs);
      }

      await sleep(delayMs);
    }
  }

  // All retries exhausted
  if (finalConfig.onFailure && lastError) {
    finalConfig.onFailure(finalConfig.maxRetries + 1, lastError);
  }

  return {
    success: false,
    error: lastError,
    attempts: finalConfig.maxRetries + 1,
    totalDurationMs: Date.now() - startTime,
    retried: true,
  };
}

/**
 * Retry with circuit breaker integration
 */
export async function withRetryAndCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: {
    execute: <U>(fn: () => Promise<U>, fallback?: () => U) => Promise<U>;
  },
  config?: Partial<RetryConfig>
): Promise<RetryResult<T>> {
  const startTime = Date.now();

  try {
    const result = await circuitBreaker.execute(async () => {
      const retryResult = await withRetry(fn, config);
      if (!retryResult.success) {
        throw retryResult.error || new Error('Retry failed');
      }
      return retryResult.result!;
    });

    return {
      success: true,
      result,
      attempts: 1,
      totalDurationMs: Date.now() - startTime,
      retried: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts: 1,
      totalDurationMs: Date.now() - startTime,
      retried: false,
    };
  }
}

/**
 * Pre-configured retry configs for different operations
 */
export const RetryConfigs = {
  // For critical path operations - more aggressive retry
  critical: {
    maxRetries: 5,
    baseDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 1.5,
  },

  // For standard operations
  standard: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },

  // For background operations - less aggressive
  background: {
    maxRetries: 2,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2.5,
  },

  // For OpenAI API calls
  openai: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 20000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'timeout',
      'rate limit',
      'RateLimitError',
      'insufficient_quota',
      'overloaded',
      'temporarily unavailable',
    ],
  },
} as const;

/**
 * Timeout wrapper for async functions
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(
          `Operation${operationName ? ` '${operationName}'` : ''} timed out after ${timeoutMs}ms`
        ));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Wrapper that combines timeout, retry, and circuit breaker
 */
export async function resilientAPICall<T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    retryConfig?: Partial<RetryConfig>;
    circuitBreaker?: {
      execute: <U>(fn: () => Promise<U>, fallback?: () => U) => Promise<U>;
    };
    operationName?: string;
    fallback?: () => T;
  } = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();

  let wrappedFn = async () => {
    if (options.timeoutMs) {
      return await withTimeout(fn(), options.timeoutMs, options.operationName);
    }
    return await fn();
  };

  // Add retry logic
  const retryWrapper = async () => {
    const result = await withRetry(wrappedFn, options.retryConfig);
    if (!result.success) {
      throw result.error || new Error('API call failed');
    }
    return result.result!;
  };

  try {
    let result: T;

    if (options.circuitBreaker) {
      result = await options.circuitBreaker.execute(retryWrapper, options.fallback);
    } else {
      result = await retryWrapper();
    }

    return {
      success: true,
      result,
      attempts: 1, // Simplified - actual attempts tracked in withRetry
      totalDurationMs: Date.now() - startTime,
      retried: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts: 1,
      totalDurationMs: Date.now() - startTime,
      retried: false,
    };
  }
}
