import * as Sentry from '@sentry/node';
import { PerfectSwedishMonitoring, MetricsSnapshot } from './perfect-swedish-monitoring';

export interface AlertThresholds {
  successRate: {
    min: number; // Alert if below this (e.g., 95)
    enabled: boolean;
  };
  generationTime: {
    max: number; // Alert if above this in ms (e.g., 25000)
    enabled: boolean;
  };
  fallbackRate: {
    max: number; // Alert if above this (e.g., 10)
    enabled: boolean;
  };
  userSatisfaction: {
    min: number; // Alert if below this (e.g., 0.7)
    enabled: boolean;
  };
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  message: string;
  currentValue: number;
  threshold: number;
  variant: 'control' | 'treatment';
  timestamp: Date;
}

export interface AlertNotification {
  alerts: Alert[];
  summary: string;
  timestamp: Date;
}

export class PerfectSwedishAlerts {
  private monitoring: PerfectSwedishMonitoring;
  private thresholds: AlertThresholds;

  constructor(thresholds?: Partial<AlertThresholds>) {
    this.monitoring = new PerfectSwedishMonitoring();
    this.thresholds = {
      successRate: {
        min: thresholds?.successRate?.min ?? 95,
        enabled: thresholds?.successRate?.enabled ?? true
      },
      generationTime: {
        max: thresholds?.generationTime?.max ?? 25000, // 25 seconds
        enabled: thresholds?.generationTime?.enabled ?? true
      },
      fallbackRate: {
        max: thresholds?.fallbackRate?.max ?? 10,
        enabled: thresholds?.fallbackRate?.enabled ?? true
      },
      userSatisfaction: {
        min: thresholds?.userSatisfaction?.min ?? 0.7,
        enabled: thresholds?.userSatisfaction?.enabled ?? true
      }
    };
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  async checkThresholds(variant: 'control' | 'treatment', timeWindowHours: number = 1): Promise<Alert[]> {
    try {
      const metrics = await this.monitoring.collectMetrics(variant, timeWindowHours);
      const alerts: Alert[] = [];

      // Only check if we have enough data
      if (metrics.sampleSize < 5) {
        console.log(`Skipping threshold check for ${variant}: insufficient sample size (${metrics.sampleSize})`);
        return alerts;
      }

      // Check success rate
      if (this.thresholds.successRate.enabled && metrics.successRate < this.thresholds.successRate.min) {
        alerts.push({
          id: `success-rate-${variant}-${Date.now()}`,
          severity: metrics.successRate < this.thresholds.successRate.min - 5 ? 'critical' : 'warning',
          metric: 'success_rate',
          message: `Success rate dropped to ${metrics.successRate.toFixed(1)}% (threshold: ${this.thresholds.successRate.min}%)`,
          currentValue: metrics.successRate,
          threshold: this.thresholds.successRate.min,
          variant,
          timestamp: new Date()
        });
      }

      // Check generation time
      if (this.thresholds.generationTime.enabled && metrics.avgGenerationTime > this.thresholds.generationTime.max) {
        alerts.push({
          id: `generation-time-${variant}-${Date.now()}`,
          severity: metrics.avgGenerationTime > this.thresholds.generationTime.max * 1.2 ? 'critical' : 'warning',
          metric: 'generation_time',
          message: `Average generation time increased to ${(metrics.avgGenerationTime / 1000).toFixed(1)}s (threshold: ${(this.thresholds.generationTime.max / 1000).toFixed(1)}s)`,
          currentValue: metrics.avgGenerationTime,
          threshold: this.thresholds.generationTime.max,
          variant,
          timestamp: new Date()
        });
      }

      // Check fallback rate
      if (this.thresholds.fallbackRate.enabled && metrics.fallbackRate > this.thresholds.fallbackRate.max) {
        alerts.push({
          id: `fallback-rate-${variant}-${Date.now()}`,
          severity: metrics.fallbackRate > this.thresholds.fallbackRate.max * 2 ? 'critical' : 'warning',
          metric: 'fallback_rate',
          message: `Fallback rate increased to ${metrics.fallbackRate.toFixed(1)}% (threshold: ${this.thresholds.fallbackRate.max}%)`,
          currentValue: metrics.fallbackRate,
          threshold: this.thresholds.fallbackRate.max,
          variant,
          timestamp: new Date()
        });
      }

      // Check user satisfaction
      if (this.thresholds.userSatisfaction.enabled && metrics.userSatisfaction < this.thresholds.userSatisfaction.min) {
        alerts.push({
          id: `user-satisfaction-${variant}-${Date.now()}`,
          severity: metrics.userSatisfaction < this.thresholds.userSatisfaction.min - 0.1 ? 'critical' : 'warning',
          metric: 'user_satisfaction',
          message: `User satisfaction dropped to ${(metrics.userSatisfaction * 100).toFixed(1)}% (threshold: ${(this.thresholds.userSatisfaction.min * 100).toFixed(1)}%)`,
          currentValue: metrics.userSatisfaction * 100,
          threshold: this.thresholds.userSatisfaction.min * 100,
          variant,
          timestamp: new Date()
        });
      }

      // Log alerts to Sentry
      if (alerts.length > 0) {
        alerts.forEach(alert => {
          const sentryLevel = alert.severity === 'critical' ? 'error' : 'warning';
          Sentry.captureMessage(alert.message, {
            level: sentryLevel,
            tags: {
              component: 'perfect-swedish-alerts',
              variant: alert.variant,
              metric: alert.metric,
              severity: alert.severity
            },
            extra: {
              currentValue: alert.currentValue,
              threshold: alert.threshold,
              sampleSize: metrics.sampleSize
            }
          });
        });
      }

      return alerts;
    } catch (error) {
      console.error('Failed to check thresholds:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-alerts', action: 'check_thresholds' },
        extra: { variant, timeWindowHours }
      });
      throw error;
    }
  }

  /**
   * Check both variants and generate notification
   */
  async checkAllVariants(timeWindowHours: number = 1): Promise<AlertNotification> {
    try {
      const controlAlerts = await this.checkThresholds('control', timeWindowHours);
      const treatmentAlerts = await this.checkThresholds('treatment', timeWindowHours);
      
      const allAlerts = [...controlAlerts, ...treatmentAlerts];

      const summary = this.generateAlertSummary(allAlerts);

      return {
        alerts: allAlerts,
        summary,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to check all variants:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-alerts', action: 'check_all_variants' },
        extra: { timeWindowHours }
      });
      throw error;
    }
  }

  /**
   * Generate human-readable alert summary
   */
  private generateAlertSummary(alerts: Alert[]): string {
    if (alerts.length === 0) {
      return '✅ All metrics within thresholds';
    }

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;

    let summary = `🚨 ${alerts.length} alert(s) detected`;
    if (criticalCount > 0) {
      summary += ` (${criticalCount} critical`;
      if (warningCount > 0) {
        summary += `, ${warningCount} warning)`;
      } else {
        summary += ')';
      }
    } else {
      summary += ` (${warningCount} warning)`;
    }

    summary += '\n\n';

    // Group by variant
    const controlAlerts = alerts.filter(a => a.variant === 'control');
    const treatmentAlerts = alerts.filter(a => a.variant === 'treatment');

    if (controlAlerts.length > 0) {
      summary += '🔵 Control (Old Pipeline):\n';
      controlAlerts.forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : '⚠️';
        summary += `  ${icon} ${alert.message}\n`;
      });
      summary += '\n';
    }

    if (treatmentAlerts.length > 0) {
      summary += '🟢 Treatment (New Pipeline):\n';
      treatmentAlerts.forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : '⚠️';
        summary += `  ${icon} ${alert.message}\n`;
      });
    }

    return summary.trim();
  }

  /**
   * Send alert notification (placeholder for email/Slack integration)
   */
  async sendNotification(notification: AlertNotification, channels: string[] = ['console']): Promise<void> {
    try {
      // Console logging
      if (channels.includes('console')) {
        console.log('\n' + '='.repeat(80));
        console.log('PERFECT SWEDISH PIPELINE ALERT');
        console.log('='.repeat(80));
        console.log(notification.summary);
        console.log('='.repeat(80) + '\n');
      }

      // Sentry notification for critical alerts
      const criticalAlerts = notification.alerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0 && channels.includes('sentry')) {
        Sentry.captureMessage('Critical alerts detected in Perfect Swedish Pipeline', {
          level: 'error',
          tags: {
            component: 'perfect-swedish-alerts',
            alert_count: criticalAlerts.length.toString()
          },
          extra: {
            alerts: criticalAlerts,
            summary: notification.summary
          }
        });
      }

      // TODO: Add email notification via Resend
      // TODO: Add Slack notification via webhook
      
    } catch (error) {
      console.error('Failed to send notification:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-alerts', action: 'send_notification' },
        extra: { channels, alertCount: notification.alerts.length }
      });
    }
  }

  /**
   * Run periodic health check
   */
  async runHealthCheck(): Promise<AlertNotification> {
    console.log('[Alerts] Running health check...');
    
    const notification = await this.checkAllVariants(1); // Check last hour
    
    if (notification.alerts.length > 0) {
      await this.sendNotification(notification, ['console', 'sentry']);
    } else {
      console.log('[Alerts] ✅ All metrics healthy');
    }

    return notification;
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds: Partial<AlertThresholds>): void {
    this.thresholds = {
      successRate: { ...this.thresholds.successRate, ...newThresholds.successRate },
      generationTime: { ...this.thresholds.generationTime, ...newThresholds.generationTime },
      fallbackRate: { ...this.thresholds.fallbackRate, ...newThresholds.fallbackRate },
      userSatisfaction: { ...this.thresholds.userSatisfaction, ...newThresholds.userSatisfaction }
    };

    console.log('[Alerts] Updated thresholds:', this.thresholds);
  }

  /**
   * Get current thresholds
   */
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }
}
