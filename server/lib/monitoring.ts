interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  errorRate: number;
  throughput: number;
}

interface BusinessMetrics {
  activeUsers: number;
  dailySignups: number;
  conversionRate: number;
  revenue: number;
  apiUsage: {
    totalRequests: number;
    hemnetRequests: number;
    booliRequests: number;
    optimizationRequests: number;
  };
  planDistribution: {
    free: number;
    pro: number;
    premium: number;
  };
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: boolean;
  emailService: boolean;
  aiService: boolean;
  cache: boolean;
  timestamp: Date;
  issues: string[];
}

export class MonitoringSystem {
  private metrics: {
    performance: PerformanceMetrics[];
    business: BusinessMetrics;
    health: HealthCheck;
  };

  private alerts: Map<string, { threshold: number; enabled: boolean }> = new Map();
  private lastHealthCheck: Date = new Date();

  constructor() {
    this.metrics = {
      performance: [],
      business: {
        activeUsers: 0,
        dailySignups: 0,
        conversionRate: 0,
        revenue: 0,
        apiUsage: {
          totalRequests: 0,
          hemnetRequests: 0,
          booliRequests: 0,
          optimizationRequests: 0
        },
        planDistribution: {
          free: 0,
          pro: 0,
          premium: 0
        }
      },
      health: {
        status: 'healthy',
        database: true,
        emailService: true,
        aiService: true,
        cache: true,
        timestamp: new Date(),
        issues: []
      }
    };

    this.setupAlerts();
    this.startMonitoring();
  }

  /**
   * Setup alert thresholds
   */
  private setupAlerts(): void {
    this.alerts.set('response_time', { threshold: 2000, enabled: true }); // 2 seconds
    this.alerts.set('error_rate', { threshold: 0.05, enabled: true }); // 5%
    this.alerts.set('memory_usage', { threshold: 0.85, enabled: true }); // 85%
    this.alerts.set('cpu_usage', { threshold: 0.80, enabled: true }); // 80%
    this.alerts.set('active_connections', { threshold: 1000, enabled: true });
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectPerformanceMetrics();
      this.checkAlerts();
    }, 30 * 1000);

    // Update business metrics every 5 minutes
    setInterval(() => {
      this.updateBusinessMetrics();
    }, 5 * 60 * 1000);

    // Health check every minute
    setInterval(() => {
      this.performHealthCheck();
    }, 60 * 1000);

    // Cleanup old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): void {
    const metrics: PerformanceMetrics = {
      responseTime: this.getAverageResponseTime(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      activeConnections: this.getActiveConnections(),
      errorRate: this.getErrorRate(),
      throughput: this.getThroughput()
    };

    this.metrics.performance.push(metrics);

    // Keep only last 1000 entries
    if (this.metrics.performance.length > 1000) {
      this.metrics.performance.shift();
    }
  }

  /**
   * Get average response time
   */
  private getAverageResponseTime(): number {
    const recent = this.metrics.performance.slice(-10);
    if (recent.length === 0) return 0;
    
    return recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length;
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    const total = usage.heapTotal + usage.external;
    const used = usage.heapUsed + usage.external;
    
    return used / total;
  }

  /**
   * Get CPU usage (simplified)
   */
  private getCPUUsage(): number {
    // In production, implement actual CPU monitoring
    // For now, return estimated value
    return Math.random() * 0.3; // Simulated 0-30% CPU usage
  }

  /**
   * Get active connections
   */
  private getActiveConnections(): number {
    // This would be tracked by your server
    return Math.floor(Math.random() * 100); // Simulated
  }

  /**
   * Get error rate
   */
  private getErrorRate(): number {
    const recent = this.metrics.performance.slice(-100);
    if (recent.length === 0) return 0;
    
    const totalRequests = recent.reduce((sum, m) => sum + m.throughput, 0);
    const errors = Math.floor(totalRequests * 0.02); // Simulated 2% error rate
    
    return errors / Math.max(totalRequests, 1);
  }

  /**
   * Get throughput
   */
  private getThroughput(): number {
    // Requests per second
    return Math.floor(Math.random() * 50) + 10; // Simulated 10-60 RPS
  }

  /**
   * Update business metrics
   */
  private async updateBusinessMetrics(): Promise<void> {
    // In production, these would come from your database
    this.metrics.business = {
      activeUsers: Math.floor(Math.random() * 1000) + 500,
      dailySignups: Math.floor(Math.random() * 50) + 10,
      conversionRate: 0.15 + Math.random() * 0.1, // 15-25%
      revenue: (Math.floor(Math.random() * 100) + 50) * 299, // Pro users * 299 SEK
      apiUsage: {
        totalRequests: Math.floor(Math.random() * 10000) + 5000,
        hemnetRequests: Math.floor(Math.random() * 6000) + 3000,
        booliRequests: Math.floor(Math.random() * 4000) + 2000,
        optimizationRequests: Math.floor(Math.random() * 1000) + 500
      },
      planDistribution: {
        free: Math.floor(Math.random() * 800) + 200,
        pro: Math.floor(Math.random() * 150) + 50,
        premium: Math.floor(Math.random() * 50) + 10
      }
    };
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const issues: string[] = [];
    
    // Database check
    const databaseHealthy = await this.checkDatabase();
    if (!databaseHealthy) {
      issues.push('Database connection failed');
    }

    // Email service check
    const emailHealthy = await this.checkEmailService();
    if (!emailHealthy) {
      issues.push('Email service unavailable');
    }

    // AI service check
    const aiHealthy = await this.checkAIService();
    if (!aiHealthy) {
      issues.push('AI service unavailable');
    }

    // Cache check
    const cacheHealthy = await this.checkCache();
    if (!cacheHealthy) {
      issues.push('Cache service unavailable');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length >= 3) {
      status = 'unhealthy';
    } else if (issues.length >= 1) {
      status = 'degraded';
    }

    this.metrics.health = {
      status,
      database: databaseHealthy,
      emailService: emailHealthy,
      aiService: aiHealthy,
      cache: cacheHealthy,
      timestamp: new Date(),
      issues
    };

    this.lastHealthCheck = new Date();
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // Implement actual database health check
      // For now, simulate with random success
      return Math.random() > 0.05; // 95% success rate
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Check email service health
   */
  private async checkEmailService(): Promise<boolean> {
    try {
      // Implement actual email service health check
      return Math.random() > 0.02; // 98% success rate
    } catch (error) {
      console.error('Email service health check failed:', error);
      return false;
    }
  }

  /**
   * Check AI service health
   */
  private async checkAIService(): Promise<boolean> {
    try {
      // Implement actual AI service health check
      return Math.random() > 0.01; // 99% success rate
    } catch (error) {
      console.error('AI service health check failed:', error);
      return false;
    }
  }

  /**
   * Check cache health
   */
  private async checkCache(): Promise<boolean> {
    try {
      // Implement actual cache health check
      return Math.random() > 0.01; // 99% success rate
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Check alerts
   */
  private checkAlerts(): void {
    const latest = this.metrics.performance[this.metrics.performance.length - 1];
    if (!latest) return;

    for (const [metric, config] of this.alerts.entries()) {
      if (!config.enabled) continue;

      let value: number;
      switch (metric) {
        case 'response_time':
          value = latest.responseTime;
          break;
        case 'error_rate':
          value = latest.errorRate;
          break;
        case 'memory_usage':
          value = latest.memoryUsage;
          break;
        case 'cpu_usage':
          value = latest.cpuUsage;
          break;
        case 'active_connections':
          value = latest.activeConnections;
          break;
        default:
          continue;
      }

      if (value > config.threshold) {
        this.sendAlert(metric, value, config.threshold);
      }
    }
  }

  /**
   * Send alert
   */
  private sendAlert(metric: string, value: number, threshold: number): void {
    const alert = {
      type: 'PERFORMANCE_ALERT',
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString(),
      severity: value > threshold * 2 ? 'critical' : 'warning'
    };

    console.error('[MONITORING ALERT]', JSON.stringify(alert, null, 2));

    // In production, send to monitoring system
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringSystem(alert);
    }
  }

  /**
   * Send to monitoring system
   */
  private sendToMonitoringSystem(alert: any): void {
    // Implement integration with your monitoring system
    // Ex: Sentry.captureMessage('Performance Alert', { extra: alert });
  }

  /**
   * Cleanup old metrics
   */
  private cleanupOldMetrics(): void {
    // Keep only last 24 hours of performance metrics
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics.performance = this.metrics.performance.filter(
      m => m.responseTime > 0 && m.responseTime < cutoff
    );
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      performance: this.metrics.performance[this.metrics.performance.length - 1] || null,
      business: this.metrics.business,
      health: this.metrics.health,
      alerts: Array.from(this.alerts.entries()).map(([key, config]) => ({
        metric: key,
        threshold: config.threshold,
        enabled: config.enabled
      }))
    };
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(hours: number = 24): {
    responseTime: { current: number; trend: 'up' | 'down' | 'stable' };
    errorRate: { current: number; trend: 'up' | 'down' | 'stable' };
    throughput: { current: number; trend: 'up' | 'down' | 'stable' };
  } {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recent = this.metrics.performance.filter(m => m.responseTime > cutoff);

    if (recent.length < 2) {
      return {
        responseTime: { current: 0, trend: 'stable' },
        errorRate: { current: 0, trend: 'stable' },
        throughput: { current: 0, trend: 'stable' }
      };
    }

    const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
      const first = values.slice(0, Math.floor(values.length / 2));
      const second = values.slice(Math.floor(values.length / 2));
      const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
      const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;
      
      const diff = (secondAvg - firstAvg) / firstAvg;
      if (Math.abs(diff) < 0.05) return 'stable';
      return diff > 0 ? 'up' : 'down';
    };

    return {
      responseTime: {
        current: recent[recent.length - 1].responseTime,
        trend: calculateTrend(recent.map(m => m.responseTime))
      },
      errorRate: {
        current: recent[recent.length - 1].errorRate,
        trend: calculateTrend(recent.map(m => m.errorRate))
      },
      throughput: {
        current: recent[recent.length - 1].throughput,
        trend: calculateTrend(recent.map(m => m.throughput))
      }
    };
  }

  /**
   * Generate monitoring dashboard data
   */
  getDashboardData() {
    const trends = this.getPerformanceTrends();
    const uptime = this.calculateUptime();
    const score = this.calculateHealthScore();

    return {
      overview: {
        status: this.metrics.health.status,
        uptime,
        score,
        lastCheck: this.metrics.health.timestamp
      },
      performance: {
        current: this.metrics.performance[this.metrics.performance.length - 1] || null,
        trends
      },
      business: this.metrics.business,
      health: this.metrics.health,
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Calculate uptime
   */
  private calculateUptime(): number {
    // In production, calculate actual uptime
    // For now, return simulated value
    return 99.9; // 99.9% uptime
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(): number {
    let score = 100;
    
    if (!this.metrics.health.database) score -= 30;
    if (!this.metrics.health.emailService) score -= 20;
    if (!this.metrics.health.aiService) score -= 30;
    if (!this.metrics.health.cache) score -= 10;
    
    if (this.metrics.health.issues.length > 0) {
      score -= this.metrics.health.issues.length * 5;
    }

    return Math.max(0, score);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Array<{
    type: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: Date;
  }> {
    const latest = this.metrics.performance[this.metrics.performance.length - 1];
    if (!latest) return [];

    const alerts = [];
    for (const [metric, config] of this.alerts.entries()) {
      if (!config.enabled) continue;

      let value: number;
      switch (metric) {
        case 'response_time':
          value = latest.responseTime;
          break;
        case 'error_rate':
          value = latest.errorRate;
          break;
        case 'memory_usage':
          value = latest.memoryUsage;
          break;
        case 'cpu_usage':
          value = latest.cpuUsage;
          break;
        case 'active_connections':
          value = latest.activeConnections;
          break;
        default:
          continue;
      }

      if (value > config.threshold) {
        alerts.push({
          type: value > config.threshold * 2 ? 'critical' : 'warning',
          metric,
          value,
          threshold: config.threshold,
          timestamp: new Date()
        });
      }
    }

    return alerts;
  }

  /**
   * Export metrics for backup
   */
  exportMetrics() {
    return {
      metrics: this.metrics,
      alerts: Array.from(this.alerts.entries()),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import metrics from backup
   */
  importMetrics(data: any): void {
    this.metrics = data.metrics;
    this.alerts = new Map(data.alerts);
  }
}

// Global monitoring instance
export const monitoringSystem = new MonitoringSystem();
