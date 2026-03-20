import { PerfectSwedishMonitoring } from './perfect-swedish-monitoring';
import { PerfectSwedishAlerts } from './perfect-swedish-alerts';
import * as Sentry from '@sentry/node';

export class PerfectSwedishScheduler {
  private monitoring: PerfectSwedishMonitoring;
  private alerts: PerfectSwedishAlerts;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private dailyAggregationInterval?: ReturnType<typeof setInterval>;

  constructor() {
    this.monitoring = new PerfectSwedishMonitoring();
    this.alerts = new PerfectSwedishAlerts();
  }

  /**
   * Start periodic health checks (every hour)
   */
  startHealthChecks(intervalMinutes: number = 60): void {
    if (this.healthCheckInterval) {
      console.log('[Scheduler] Health checks already running');
      return;
    }

    console.log(`[Scheduler] Starting health checks (every ${intervalMinutes} minutes)`);

    // Run immediately on start
    this.runHealthCheck();

    // Then run periodically
    this.healthCheckInterval = setInterval(
      () => this.runHealthCheck(),
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      console.log('[Scheduler] Health checks stopped');
    }
  }

  /**
   * Start daily metrics aggregation (runs at midnight)
   */
  startDailyAggregation(): void {
    if (this.dailyAggregationInterval) {
      console.log('[Scheduler] Daily aggregation already running');
      return;
    }

    console.log('[Scheduler] Starting daily metrics aggregation');

    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Run at midnight
    setTimeout(() => {
      this.runDailyAggregation();

      // Then run every 24 hours
      this.dailyAggregationInterval = setInterval(
        () => this.runDailyAggregation(),
        24 * 60 * 60 * 1000
      );
    }, msUntilMidnight);
  }

  /**
   * Stop daily metrics aggregation
   */
  stopDailyAggregation(): void {
    if (this.dailyAggregationInterval) {
      clearInterval(this.dailyAggregationInterval);
      this.dailyAggregationInterval = undefined;
      console.log('[Scheduler] Daily aggregation stopped');
    }
  }

  /**
   * Run health check and send alerts if needed
   */
  private async runHealthCheck(): Promise<void> {
    try {
      console.log('[Scheduler] Running health check...');
      
      const notification = await this.alerts.runHealthCheck();
      
      if (notification.alerts.length > 0) {
        console.log(`[Scheduler] ${notification.alerts.length} alert(s) detected`);
        await this.alerts.sendNotification(notification, ['console', 'sentry']);
      } else {
        console.log('[Scheduler] ✅ All metrics healthy');
      }
    } catch (error) {
      console.error('[Scheduler] Health check failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-scheduler', action: 'health_check' }
      });
    }
  }

  /**
   * Aggregate metrics for yesterday and generate summary
   */
  private async runDailyAggregation(): Promise<void> {
    try {
      console.log('[Scheduler] Running daily metrics aggregation...');
      
      // Aggregate yesterday's metrics
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await this.monitoring.aggregateDailyMetrics(yesterday);
      
      // Generate and log summary
      const summary = await this.monitoring.generateDailySummary(yesterday);
      console.log('\n' + summary + '\n');
      
      console.log('[Scheduler] ✅ Daily aggregation complete');
    } catch (error) {
      console.error('[Scheduler] Daily aggregation failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-scheduler', action: 'daily_aggregation' }
      });
    }
  }

  /**
   * Start all scheduled tasks
   */
  startAll(healthCheckIntervalMinutes: number = 60): void {
    this.startHealthChecks(healthCheckIntervalMinutes);
    this.startDailyAggregation();
    console.log('[Scheduler] All scheduled tasks started');
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    this.stopHealthChecks();
    this.stopDailyAggregation();
    console.log('[Scheduler] All scheduled tasks stopped');
  }
}

// Singleton instance
let schedulerInstance: PerfectSwedishScheduler | null = null;

/**
 * Get or create scheduler instance
 */
export function getScheduler(): PerfectSwedishScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new PerfectSwedishScheduler();
  }
  return schedulerInstance;
}

/**
 * Initialize scheduler with default settings
 */
export function initializeScheduler(healthCheckIntervalMinutes: number = 60): PerfectSwedishScheduler {
  const scheduler = getScheduler();
  scheduler.startAll(healthCheckIntervalMinutes);
  return scheduler;
}
