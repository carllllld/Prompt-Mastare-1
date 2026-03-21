/**
 * Circuit Breaker for OpenAI API calls
 * Enterprise-grade resilience pattern for external service calls
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  resetTimeoutMs: number;        // Time before attempting reset
  halfOpenMaxCalls: number;      // Max calls in half-open state
  successThreshold: number;      // Successes needed to close
  monitorIntervalMs: number;     // Health check interval
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
  rejectedCalls: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  failureRate: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000, // 30 seconds
  halfOpenMaxCalls: 3,
  successThreshold: 2,
  monitorIntervalMs: 5000,
};

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalCalls = 0;
  private rejectedCalls = 0;
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;
  private monitorInterval: NodeJS.Timeout | null = null;
  private onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(
    private name: string,
    config?: Partial<CircuitBreakerConfig>,
    onStateChange?: (from: CircuitState, to: CircuitState) => void
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onStateChange = onStateChange;
    this.startMonitoring();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
        this.halfOpenCalls = 0;
      } else {
        this.rejectedCalls++;
        if (fallback) {
          return fallback();
        }
        throw new CircuitBreakerOpenError(
          `Circuit breaker '${this.name}' is open. Service temporarily unavailable.`,
          this.getMetrics()
        );
      }
    }

    if (this.state === 'half-open' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      this.rejectedCalls++;
      if (fallback) {
        return fallback();
      }
      throw new CircuitBreakerOpenError(
        `Circuit breaker '${this.name}' half-open quota exceeded.`,
        this.getMetrics()
      );
    }

    if (this.state === 'half-open') {
      this.halfOpenCalls++;
    }

    this.totalCalls++;

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    if (this.state === 'half-open') {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('closed');
        this.failures = 0;
        this.consecutiveSuccesses = 0;
      }
    } else if (this.state === 'closed') {
      // Gradually reduce failure count on success (forgiveness)
      if (this.failures > 0) {
        this.failures = Math.max(0, this.failures - 1);
      }
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.failures++;

    if (this.state === 'half-open') {
      // Any failure in half-open goes back to open
      this.transitionTo('open');
    } else if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  /**
   * Check if we should attempt to reset (transition to half-open)
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (this.onStateChange) {
      this.onStateChange(oldState, newState);
    }

    // Structured logging for state changes
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: `Circuit breaker state change`,
      service: 'circuit-breaker',
      name: this.name,
      from: oldState,
      to: newState,
      metrics: this.getMetrics(),
    }));
  }

  /**
   * Start health monitoring
   */
  private startMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      this.healthCheck();
    }, this.config.monitorIntervalMs);
    
    // Unref to prevent blocking process exit
    if (this.monitorInterval) {
      this.monitorInterval.unref();
    }
  }

  /**
   * Periodic health check
   */
  private healthCheck(): void {
    const metrics = this.getMetrics();

    // Alert on concerning patterns
    if (this.state === 'open') {
      const timeOpen = this.lastFailureTime
        ? Date.now() - this.lastFailureTime
        : 0;

      if (timeOpen > this.config.resetTimeoutMs * 3) {
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Circuit breaker stuck open for extended period`,
          service: 'circuit-breaker',
          name: this.name,
          timeOpenMs: timeOpen,
          metrics,
        }));
      }
    }

    if (metrics.failureRate > 0.5 && this.totalCalls > 10) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `High failure rate detected`,
        service: 'circuit-breaker',
        name: this.name,
        failureRate: metrics.failureRate,
        metrics,
      }));
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      rejectedCalls: this.rejectedCalls,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      failureRate: this.getFailureRate(),
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure rate
   */
  getFailureRate(): number {
    if (this.totalCalls === 0) return 0;
    return this.failures / this.totalCalls;
  }

  /**
   * Force open the circuit (for maintenance/emergency)
   */
  forceOpen(): void {
    this.transitionTo('open');
    this.lastFailureTime = Date.now();
  }

  /**
   * Force close the circuit (after issue resolved)
   */
  forceClose(): void {
    this.transitionTo('closed');
    this.failures = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  public readonly metrics: CircuitBreakerMetrics;

  constructor(message: string, metrics: CircuitBreakerMetrics) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.metrics = metrics;
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get metrics for all breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of Array.from(this.breakers.entries())) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Health check for all breakers
   */
  healthCheck(): {
    healthy: string[];
    degraded: string[];
    unhealthy: string[];
  } {
    const healthy: string[] = [];
    const degraded: string[] = [];
    const unhealthy: string[] = [];

    for (const [name, breaker] of Array.from(this.breakers.entries())) {
      const state = breaker.getState();
      if (state === 'closed') {
        healthy.push(name);
      } else if (state === 'half-open') {
        degraded.push(name);
      } else {
        unhealthy.push(name);
      }
    }

    return { healthy, degraded, unhealthy };
  }

  /**
   * Stop all circuit breakers
   */
  stopAll(): void {
    for (const breaker of Array.from(this.breakers.values())) {
      breaker.stop();
    }
  }
}

// Global registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Pre-configured circuit breakers for different operations
export const openAICircuitBreaker = circuitBreakerRegistry.get('openai', {
  failureThreshold: 3,        // More sensitive for critical path
  resetTimeoutMs: 15000,      // 15 seconds
  halfOpenMaxCalls: 2,
  successThreshold: 2,
});

export const extractionCircuitBreaker = circuitBreakerRegistry.get('extraction', {
  failureThreshold: 2,
  resetTimeoutMs: 10000,
  halfOpenMaxCalls: 1,
  successThreshold: 1,
});

export const generationCircuitBreaker = circuitBreakerRegistry.get('generation', {
  failureThreshold: 3,
  resetTimeoutMs: 20000,
  halfOpenMaxCalls: 2,
  successThreshold: 2,
});
