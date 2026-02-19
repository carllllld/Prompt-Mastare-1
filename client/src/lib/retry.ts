interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain error types
      if (error instanceof Error && (
        error.message.includes('401') || // Unauthorized
        error.message.includes('403') || // Forbidden
        error.message.includes('404') || // Not found
        error.message.includes('validation') ||
        error.message.includes('invalid')
      )) {
        throw error;
      }
      
      // Last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
      const delay = exponentialDelay + jitter;
      
      // Notify about retry
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Specific retry functions for different use cases
export async function retryApiCall<T>(
  url: string,
  options: RequestInit,
  retryOptions?: RetryOptions
): Promise<T> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }, retryOptions);
}

export async function retryOpenAICall<T>(
  fn: () => Promise<T>,
  retryOptions?: RetryOptions
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 2, // OpenAI has its own retry logic
    baseDelay: 2000,
    maxDelay: 8000,
    ...retryOptions
  });
}
