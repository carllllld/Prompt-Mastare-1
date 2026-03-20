import { pool } from '../db';
import * as Sentry from '@sentry/node';

export interface MetricsSnapshot {
  variant: 'control' | 'treatment';
  successRate: number;
  avgGenerationTime: number;
  p95GenerationTime: number;
  fallbackRate: number;
  userSatisfaction: number;
  regenerationRate: number;
  minorEditRate: number;
  sampleSize: number;
  timestamp: Date;
}

export interface MetricsQuery {
  variant?: 'control' | 'treatment';
  startDate?: Date;
  endDate?: Date;
  minSampleSize?: number;
}

export class PerfectSwedishMonitoring {
  /**
   * Collect current metrics for a specific variant
   */
  async collectMetrics(variant: 'control' | 'treatment', timeWindowHours: number = 24): Promise<MetricsSnapshot> {
    try {
      const startTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

      // Get generation metrics
      const generationMetrics = await pool.query(
        `SELECT 
          COUNT(*) as total_generations,
          COUNT(*) FILTER (WHERE success = true) as successful_generations,
          COUNT(*) FILTER (WHERE fallback_used = true) as fallback_count,
          AVG(total_duration) as avg_duration,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration) as p95_duration
         FROM pipeline_generations
         WHERE variant = $1
           AND created_at >= $2`,
        [variant, startTime]
      );

      const genRow = generationMetrics.rows[0];
      const totalGenerations = parseInt(genRow.total_generations) || 0;
      const successfulGenerations = parseInt(genRow.successful_generations) || 0;
      const fallbackCount = parseInt(genRow.fallback_count) || 0;

      // Get user feedback metrics
      const feedbackMetrics = await pool.query(
        `SELECT 
          AVG(CASE WHEN satisfaction_score = 1 THEN 1.0 ELSE 0.0 END) as avg_satisfaction,
          COUNT(*) FILTER (WHERE regenerated = true) as regeneration_count,
          COUNT(*) FILTER (WHERE edit_type = 'minor') as minor_edit_count
         FROM user_feedback uf
         JOIN pipeline_generations pg ON uf.generation_id = pg.id
         WHERE pg.variant = $1
           AND pg.created_at >= $2`,
        [variant, startTime]
      );

      const feedbackRow = feedbackMetrics.rows[0];
      const regenerationCount = parseInt(feedbackRow.regeneration_count) || 0;
      const minorEditCount = parseInt(feedbackRow.minor_edit_count) || 0;

      return {
        variant,
        successRate: totalGenerations > 0 ? (successfulGenerations / totalGenerations) * 100 : 0,
        avgGenerationTime: parseFloat(genRow.avg_duration) || 0,
        p95GenerationTime: parseFloat(genRow.p95_duration) || 0,
        fallbackRate: totalGenerations > 0 ? (fallbackCount / totalGenerations) * 100 : 0,
        userSatisfaction: parseFloat(feedbackRow.avg_satisfaction) || 0,
        regenerationRate: totalGenerations > 0 ? (regenerationCount / totalGenerations) * 100 : 0,
        minorEditRate: totalGenerations > 0 ? (minorEditCount / totalGenerations) * 100 : 0,
        sampleSize: totalGenerations,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-monitoring', action: 'collect_metrics' },
        extra: { variant, timeWindowHours }
      });
      throw error;
    }
  }

  /**
   * Aggregate and store daily metrics
   */
  async aggregateDailyMetrics(date: Date = new Date()): Promise<void> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      for (const variant of ['control', 'treatment'] as const) {
        const metrics = await this.collectMetricsForDateRange(variant, startOfDay, endOfDay);

        // Upsert into pipeline_metrics_v2
        await pool.query(
          `INSERT INTO pipeline_metrics_v2 (
            variant, metric_date,
            total_generations, successful_generations, failed_generations, fallback_count,
            avg_total_duration, p50_total_duration, p95_total_duration, p99_total_duration,
            avg_user_satisfaction, regeneration_count, minor_edit_count,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (variant, metric_date)
          DO UPDATE SET
            total_generations = EXCLUDED.total_generations,
            successful_generations = EXCLUDED.successful_generations,
            failed_generations = EXCLUDED.failed_generations,
            fallback_count = EXCLUDED.fallback_count,
            avg_total_duration = EXCLUDED.avg_total_duration,
            p50_total_duration = EXCLUDED.p50_total_duration,
            p95_total_duration = EXCLUDED.p95_total_duration,
            p99_total_duration = EXCLUDED.p99_total_duration,
            avg_user_satisfaction = EXCLUDED.avg_user_satisfaction,
            regeneration_count = EXCLUDED.regeneration_count,
            minor_edit_count = EXCLUDED.minor_edit_count,
            updated_at = NOW()`,
          [
            variant,
            startOfDay,
            metrics.totalGenerations,
            metrics.successfulGenerations,
            metrics.failedGenerations,
            metrics.fallbackCount,
            metrics.avgDuration,
            metrics.p50Duration,
            metrics.p95Duration,
            metrics.p99Duration,
            metrics.avgSatisfaction,
            metrics.regenerationCount,
            metrics.minorEditCount
          ]
        );
      }

      console.log(`Aggregated daily metrics for ${startOfDay.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Failed to aggregate daily metrics:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-monitoring', action: 'aggregate_daily_metrics' },
        extra: { date: date.toISOString() }
      });
      throw error;
    }
  }

  /**
   * Get metrics for a specific date range
   */
  private async collectMetricsForDateRange(
    variant: 'control' | 'treatment',
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    fallbackCount: number;
    avgDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    avgSatisfaction: number;
    regenerationCount: number;
    minorEditCount: number;
  }> {
    const generationMetrics = await pool.query(
      `SELECT 
        COUNT(*) as total_generations,
        COUNT(*) FILTER (WHERE success = true) as successful_generations,
        COUNT(*) FILTER (WHERE success = false) as failed_generations,
        COUNT(*) FILTER (WHERE fallback_used = true) as fallback_count,
        AVG(total_duration) as avg_duration,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_duration) as p50_duration,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration) as p95_duration,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY total_duration) as p99_duration
       FROM pipeline_generations
       WHERE variant = $1
         AND created_at >= $2
         AND created_at <= $3`,
      [variant, startDate, endDate]
    );

    const feedbackMetrics = await pool.query(
      `SELECT 
        AVG(CASE WHEN satisfaction_score = 1 THEN 1.0 ELSE 0.0 END) as avg_satisfaction,
        COUNT(*) FILTER (WHERE regenerated = true) as regeneration_count,
        COUNT(*) FILTER (WHERE edit_type = 'minor') as minor_edit_count
       FROM user_feedback uf
       JOIN pipeline_generations pg ON uf.generation_id = pg.id
       WHERE pg.variant = $1
         AND pg.created_at >= $2
         AND pg.created_at <= $3`,
      [variant, startDate, endDate]
    );

    const genRow = generationMetrics.rows[0];
    const feedbackRow = feedbackMetrics.rows[0];

    return {
      totalGenerations: parseInt(genRow.total_generations) || 0,
      successfulGenerations: parseInt(genRow.successful_generations) || 0,
      failedGenerations: parseInt(genRow.failed_generations) || 0,
      fallbackCount: parseInt(genRow.fallback_count) || 0,
      avgDuration: parseFloat(genRow.avg_duration) || 0,
      p50Duration: parseFloat(genRow.p50_duration) || 0,
      p95Duration: parseFloat(genRow.p95_duration) || 0,
      p99Duration: parseFloat(genRow.p99_duration) || 0,
      avgSatisfaction: parseFloat(feedbackRow.avg_satisfaction) || 0,
      regenerationCount: parseInt(feedbackRow.regeneration_count) || 0,
      minorEditCount: parseInt(feedbackRow.minor_edit_count) || 0
    };
  }

  /**
   * Get historical metrics for comparison
   */
  async getHistoricalMetrics(query: MetricsQuery = {}): Promise<MetricsSnapshot[]> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (query.variant) {
        conditions.push(`variant = $${paramIndex++}`);
        params.push(query.variant);
      }

      if (query.startDate) {
        conditions.push(`metric_date >= $${paramIndex++}`);
        params.push(query.startDate);
      }

      if (query.endDate) {
        conditions.push(`metric_date <= $${paramIndex++}`);
        params.push(query.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await pool.query(
        `SELECT 
          variant,
          metric_date,
          total_generations,
          successful_generations,
          failed_generations,
          fallback_count,
          avg_total_duration,
          p95_total_duration,
          avg_user_satisfaction,
          regeneration_count,
          minor_edit_count
         FROM pipeline_metrics_v2
         ${whereClause}
         ORDER BY metric_date DESC, variant`,
        params
      );

      return result.rows.map(row => {
        const totalGenerations = parseInt(row.total_generations) || 0;
        const successfulGenerations = parseInt(row.successful_generations) || 0;
        const fallbackCount = parseInt(row.fallback_count) || 0;
        const regenerationCount = parseInt(row.regeneration_count) || 0;
        const minorEditCount = parseInt(row.minor_edit_count) || 0;

        return {
          variant: row.variant,
          successRate: totalGenerations > 0 ? (successfulGenerations / totalGenerations) * 100 : 0,
          avgGenerationTime: parseFloat(row.avg_total_duration) || 0,
          p95GenerationTime: parseFloat(row.p95_total_duration) || 0,
          fallbackRate: totalGenerations > 0 ? (fallbackCount / totalGenerations) * 100 : 0,
          userSatisfaction: parseFloat(row.avg_user_satisfaction) || 0,
          regenerationRate: totalGenerations > 0 ? (regenerationCount / totalGenerations) * 100 : 0,
          minorEditRate: totalGenerations > 0 ? (minorEditCount / totalGenerations) * 100 : 0,
          sampleSize: totalGenerations,
          timestamp: row.metric_date
        };
      }).filter((m: MetricsSnapshot) => !query.minSampleSize || m.sampleSize >= query.minSampleSize);
    } catch (error) {
      console.error('Failed to get historical metrics:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-monitoring', action: 'get_historical_metrics' },
        extra: { query }
      });
      throw error;
    }
  }

  /**
   * Generate daily summary report
   */
  async generateDailySummary(date: Date = new Date()): Promise<string> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const controlMetrics = await this.collectMetrics('control', 24);
      const treatmentMetrics = await this.collectMetrics('treatment', 24);

      const summary = `
📊 Perfect Swedish Pipeline - Daily Summary
Date: ${startOfDay.toISOString().split('T')[0]}

🔵 Control (Old Pipeline)
  • Success Rate: ${controlMetrics.successRate.toFixed(1)}%
  • Avg Generation Time: ${(controlMetrics.avgGenerationTime / 1000).toFixed(1)}s
  • P95 Generation Time: ${(controlMetrics.p95GenerationTime / 1000).toFixed(1)}s
  • Fallback Rate: ${controlMetrics.fallbackRate.toFixed(1)}%
  • User Satisfaction: ${(controlMetrics.userSatisfaction * 100).toFixed(1)}%
  • Regeneration Rate: ${controlMetrics.regenerationRate.toFixed(1)}%
  • Sample Size: ${controlMetrics.sampleSize}

🟢 Treatment (New Pipeline)
  • Success Rate: ${treatmentMetrics.successRate.toFixed(1)}%
  • Avg Generation Time: ${(treatmentMetrics.avgGenerationTime / 1000).toFixed(1)}s
  • P95 Generation Time: ${(treatmentMetrics.p95GenerationTime / 1000).toFixed(1)}s
  • Fallback Rate: ${treatmentMetrics.fallbackRate.toFixed(1)}%
  • User Satisfaction: ${(treatmentMetrics.userSatisfaction * 100).toFixed(1)}%
  • Regeneration Rate: ${treatmentMetrics.regenerationRate.toFixed(1)}%
  • Sample Size: ${treatmentMetrics.sampleSize}

📈 Improvement
  • Success Rate: ${(treatmentMetrics.successRate - controlMetrics.successRate).toFixed(1)}pp
  • Generation Time: ${((treatmentMetrics.avgGenerationTime - controlMetrics.avgGenerationTime) / 1000).toFixed(1)}s
  • User Satisfaction: ${((treatmentMetrics.userSatisfaction - controlMetrics.userSatisfaction) * 100).toFixed(1)}pp
      `.trim();

      return summary;
    } catch (error) {
      console.error('Failed to generate daily summary:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-monitoring', action: 'generate_daily_summary' },
        extra: { date: date.toISOString() }
      });
      throw error;
    }
  }

  /**
   * Export metrics for external monitoring dashboard
   */
  async exportMetrics(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const metrics = await this.getHistoricalMetrics({ startDate: last7Days });

      if (format === 'json') {
        return JSON.stringify(metrics, null, 2);
      } else {
        // CSV format
        const headers = [
          'date', 'variant', 'success_rate', 'avg_generation_time_ms', 'p95_generation_time_ms',
          'fallback_rate', 'user_satisfaction', 'regeneration_rate', 'minor_edit_rate', 'sample_size'
        ];
        
        const rows = metrics.map((m: MetricsSnapshot) => [
          m.timestamp.toISOString().split('T')[0],
          m.variant,
          m.successRate.toFixed(2),
          m.avgGenerationTime.toFixed(0),
          m.p95GenerationTime.toFixed(0),
          m.fallbackRate.toFixed(2),
          (m.userSatisfaction * 100).toFixed(2),
          m.regenerationRate.toFixed(2),
          m.minorEditRate.toFixed(2),
          m.sampleSize.toString()
        ]);

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      }
    } catch (error) {
      console.error('Failed to export metrics:', error);
      Sentry.captureException(error, {
        tags: { component: 'perfect-swedish-monitoring', action: 'export_metrics' },
        extra: { format }
      });
      throw error;
    }
  }
}
