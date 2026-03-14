import os from "os";
import { pool } from "../db";

interface PerformanceMetrics {
  timestamp: number;
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
  private alertState: Map<string, { consecutiveBreaches: number; lastSentAt: number }> = new Map();
  private lastHealthCheck: Date = new Date();
  private processStartedAt: number = Date.now();
  private activeConnections = 0;
  private recentRequests: Array<{ timestamp: number; statusCode: number; durationMs: number; path: string }> = [];

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

  private setupAlerts(): void {
    this.alerts.set('response_time', { threshold: 3000, enabled: true });
    this.alerts.set('error_rate', { threshold: 0.05, enabled: true });
    this.alerts.set('memory_usage', { threshold: 0.92, enabled: true });
    this.alerts.set('cpu_usage', { threshold: 0.90, enabled: true });
    this.alerts.set('active_connections', { threshold: 1000, enabled: true });
  }

  private shouldEmitAlert(metric: string, breached: boolean): boolean {
    const now = Date.now();
    const current = this.alertState.get(metric) || { consecutiveBreaches: 0, lastSentAt: 0 };
    const requiredConsecutive = metric === "response_time" ? 2 : 3;
    const cooldownMs = metric === "response_time" ? 90_000 : 180_000;
    if (!breached) {
      this.alertState.set(metric, { consecutiveBreaches: 0, lastSentAt: current.lastSentAt });
      return false;
    }
    const nextConsecutive = current.consecutiveBreaches + 1;
    const cooledDown = now - current.lastSentAt >= cooldownMs;
    const shouldEmit = nextConsecutive >= requiredConsecutive && cooledDown;
    this.alertState.set(metric, {
      consecutiveBreaches: shouldEmit ? 0 : nextConsecutive,
      lastSentAt: shouldEmit ? now : current.lastSentAt,
    });
    return shouldEmit;
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.collectPerformanceMetrics();
      this.checkAlerts();
    }, 30 * 1000);
    setInterval(() => {
      this.updateBusinessMetrics();
    }, 5 * 60 * 1000);
    setInterval(() => {
      this.performHealthCheck();
    }, 60 * 1000);
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);
  }

  private collectPerformanceMetrics(): void {
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
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
    this.cleanupRequestWindow();
  }

  private getAverageResponseTime(): number {
    const recent = this.recentRequests.slice(-50);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, item) => sum + item.durationMs, 0) / recent.length;
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    const total = usage.heapTotal + usage.external;
    const used = usage.heapUsed + usage.external;
    return used / total;
  }

  private getCPUUsage(): number {
    const cpuCount = Math.max(os.cpus().length, 1);
    const load = os.loadavg()[0] / cpuCount;
    return Math.max(0, Math.min(1, load));
  }

  private getActiveConnections(): number {
    return this.activeConnections;
  }

  private getErrorRate(): number {
    const recent = this.recentRequests.slice(-200);
    if (recent.length === 0) return 0;
    const errors = recent.filter((item) => item.statusCode >= 500).length;
    return errors / recent.length;
  }

  private getThroughput(): number {
    const now = Date.now();
    const cutoff = now - 60_000;
    const lastMinute = this.recentRequests.filter((item) => item.timestamp >= cutoff).length;
    return Math.round((lastMinute / 60) * 100) / 100;
  }

  private async updateBusinessMetrics(): Promise<void> {
    this.cleanupRequestWindow();
    const windowStart = Date.now() - 24 * 60 * 60 * 1000;
    const requests24h = this.recentRequests.filter((item) => item.timestamp >= windowStart);
    const totalRequests = requests24h.length;
    const hemnetRequests = requests24h.filter((item) => /hemnet/i.test(item.path)).length;
    const booliRequests = requests24h.filter((item) => /booli/i.test(item.path)).length;
    const optimizationRequests = requests24h.filter((item) => /optimize|rewrite/i.test(item.path)).length;

    this.metrics.business = {
      activeUsers: this.activeConnections,
      dailySignups: this.metrics.business.dailySignups,
      conversionRate: this.metrics.business.conversionRate,
      revenue: this.metrics.business.revenue,
      apiUsage: {
        totalRequests,
        hemnetRequests,
        booliRequests,
        optimizationRequests
      },
      planDistribution: this.metrics.business.planDistribution
    };
  }

  private async performHealthCheck(): Promise<void> {
    const issues: string[] = [];
    const databaseHealthy = await this.checkDatabase();
    if (!databaseHealthy) {
      issues.push('Database connection failed');
    }
    const emailHealthy = await this.checkEmailService();
    if (!emailHealthy) {
      issues.push('Email service unavailable');
    }
    const aiHealthy = await this.checkAIService();
    if (!aiHealthy) {
      issues.push('AI service unavailable');
    }
    const cacheHealthy = await this.checkCache();
    if (!cacheHealthy) {
      issues.push('Cache service unavailable');
    }
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

  private async checkDatabase(): Promise<boolean> {
    try {
      await pool.query("SELECT 1");
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  private async checkEmailService(): Promise<boolean> {
    try {
      return Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);
    } catch (error) {
      console.error('Email service health check failed:', error);
      return false;
    }
  }

  private async checkAIService(): Promise<boolean> {
    try {
      return Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
    } catch (error) {
      console.error('AI service health check failed:', error);
      return false;
    }
  }

  private async checkCache(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

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

      if (this.shouldEmitAlert(metric, value > config.threshold)) {
        this.sendAlert(metric, value, config.threshold);
      }
    }
  }

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
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringSystem(alert);
    }
  }

  private sendToMonitoringSystem(alert: any): void {
    void alert;
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics.performance = this.metrics.performance.filter(
      m => m.timestamp >= cutoff
    );
  }

  private cleanupRequestWindow(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.recentRequests = this.recentRequests.filter((item) => item.timestamp >= cutoff);
  }

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

  getPerformanceTrends(hours: number = 24): {
    responseTime: { current: number; trend: 'up' | 'down' | 'stable' };
    errorRate: { current: number; trend: 'up' | 'down' | 'stable' };
    throughput: { current: number; trend: 'up' | 'down' | 'stable' };
  } {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recent = this.metrics.performance.filter(m => m.timestamp >= cutoff);

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
      if (firstAvg === 0) return 'stable';
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

  private calculateUptime(): number {
    const uptimeMs = Date.now() - this.processStartedAt;
    const uptimeHours = uptimeMs / (1000 * 60 * 60);
    if (uptimeHours <= 0) return 100;
    const errorRate = this.getErrorRate();
    const score = 100 - Math.min(10, errorRate * 100);
    return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
  }

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

  exportMetrics() {
    return {
      metrics: this.metrics,
      alerts: Array.from(this.alerts.entries()),
      exportedAt: new Date().toISOString()
    };
  }

  importMetrics(data: any): void {
    this.metrics = data.metrics;
    this.alerts = new Map(data.alerts);
  }

  recordRequest(params: { path: string; statusCode: number; durationMs: number }): void {
    this.recentRequests.push({
      path: params.path,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      timestamp: Date.now(),
    });
    if (this.recentRequests.length > 10_000) {
      this.recentRequests = this.recentRequests.slice(-10_000);
    }
  }

  setActiveConnections(count: number): void {
    this.activeConnections = Math.max(0, count);
  }
}

export const monitoringSystem = new MonitoringSystem();
