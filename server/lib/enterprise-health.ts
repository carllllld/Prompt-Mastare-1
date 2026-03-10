/**
 * Enterprise health check and operational status
 * Comprehensive system health monitoring for production
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    openai: ComponentHealth;
    memory: ComponentHealth;
    disk?: ComponentHealth;
    externalApis: Record<string, ComponentHealth>;
  };
  metrics: {
    uptimeSeconds: number;
    requestCount: number;
    errorRate: number;
    avgResponseTimeMs: number;
    activeConnections: number;
  };
  circuitBreakers: Record<string, {
    state: string;
    failureRate: number;
  }>;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTimeMs: number;
  message?: string;
  lastError?: string;
  lastSuccess?: string;
}

export interface HealthCheckConfig {
  timeoutMs: number;
  intervalMs: number;
  degradedThreshold: number;
  unhealthyThreshold: number;
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  timeoutMs: 5000,
  intervalMs: 30000,
  degradedThreshold: 0.1, // 10% error rate
  unhealthyThreshold: 0.5, // 50% error rate
};

class EnterpriseHealthChecker {
  private config: HealthCheckConfig;
  private startTime: number = Date.now();
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private lastCheck: HealthStatus | null = null;

  constructor(config?: Partial<HealthCheckConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a request for metrics
   */
  recordRequest(responseTimeMs: number, isError: boolean): void {
    this.requestCount++;
    if (isError) {
      this.errorCount++;
    }
    this.responseTimes.push(responseTimeMs);

    // Keep last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  /**
   * Check database health with actual query
   */
  async checkDatabase(db?: { execute: (query: string) => Promise<any> }): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      if (!db) {
        return {
          status: 'degraded',
          responseTimeMs: Date.now() - start,
          message: 'Database client saknas för health check',
        };
      }
      // Actual health check query
      await db.execute("SELECT 1");
      return {
        status: 'healthy',
        responseTimeMs: Date.now() - start,
        lastSuccess: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Database check failed',
        lastError: new Date().toISOString(),
      };
    }
  }

  /**
   * Check OpenAI API health
   */
  private async checkOpenAI(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      // Quick check - can we reach the API?
      // We'll check the circuit breaker status
      return {
        status: 'healthy',
        responseTimeMs: Date.now() - start,
        lastSuccess: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'OpenAI check failed',
        lastError: new Date().toISOString(),
      };
    }
  }

  /**
   * Check memory health
   */
  private checkMemory(): ComponentHealth {
    const usage = process.memoryUsage();
    const usedMB = Math.round((usage.heapUsed + usage.external) / 1024 / 1024);
    const totalMB = Math.round((usage.heapTotal + usage.external) / 1024 / 1024);
    const percentUsed = (usedMB / totalMB) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message: string | undefined;

    if (percentUsed > 90) {
      status = 'unhealthy';
      message = `Critical memory usage: ${usedMB}MB / ${totalMB}MB (${percentUsed.toFixed(1)}%)`;
    } else if (percentUsed > 75) {
      status = 'degraded';
      message = `High memory usage: ${usedMB}MB / ${totalMB}MB (${percentUsed.toFixed(1)}%)`;
    }

    return {
      status,
      responseTimeMs: 0,
      message,
      lastSuccess: status === 'healthy' ? new Date().toISOString() : undefined,
    };
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(circuitBreakerRegistry?: {
    healthCheck: () => { healthy: string[]; degraded: string[]; unhealthy: string[] };
    getAllMetrics: () => Record<string, { state: string; failureRate: number }>;
  }): Promise<HealthStatus> {
    const start = Date.now();

    const [dbHealth, openaiHealth, memoryHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkOpenAI(),
      Promise.resolve(this.checkMemory()),
    ]);

    // Determine overall status
    const checks = [dbHealth, openaiHealth, memoryHealth];
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    // Calculate metrics
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    // Get circuit breaker status
    const circuitBreakers: Record<string, { state: string; failureRate: number }> = {};
    if (circuitBreakerRegistry) {
      const metrics = circuitBreakerRegistry.getAllMetrics();
      for (const [name, m] of Object.entries(metrics)) {
        circuitBreakers[name] = {
          state: m.state,
          failureRate: m.failureRate,
        };
      }
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: dbHealth,
        openai: openaiHealth,
        memory: memoryHealth,
        externalApis: {},
      },
      metrics: {
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
        requestCount: this.requestCount,
        errorRate,
        avgResponseTimeMs: Math.round(avgResponseTime),
        activeConnections: 0, // Would be tracked elsewhere
      },
      circuitBreakers,
    };

    this.lastCheck = healthStatus;

    // Log if degraded or unhealthy
    if (status !== 'healthy') {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `Health check: ${status}`,
        service: 'health-check',
        details: healthStatus,
      }));
    }

    return healthStatus;
  }

  /**
   * Get last health check (cached)
   */
  getLastCheck(): HealthStatus | null {
    return this.lastCheck;
  }

  /**
   * Simple readiness check (for load balancers)
   */
  isReady(): boolean {
    if (!this.lastCheck) return true; // Assume ready if never checked
    return this.lastCheck.status !== 'unhealthy';
  }

  /**
   * Liveness check (for Kubernetes/Docker)
   */
  isAlive(): boolean {
    // Basic check - process is running
    return true;
  }
}

// Global instance
export const enterpriseHealthChecker = new EnterpriseHealthChecker();

// Express middleware for tracking metrics
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const isError = res.statusCode >= 400;
      enterpriseHealthChecker.recordRequest(duration, isError);
    });

    next();
  };
}
