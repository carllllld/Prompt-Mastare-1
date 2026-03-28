/**
 * Stripe Webhook Logger
 * 
 * Logs all Stripe webhook events to database for debugging and audit trail.
 * Helps track subscription lifecycle and payment issues.
 */

import { pool } from "../db";
import * as Sentry from "@sentry/node";

export interface StripeWebhookLog {
  eventId: string;
  eventType: string;
  data: any;
  processedAt: Date;
  processingTimeMs?: number;
  success: boolean;
  error?: string;
}

/**
 * Create webhook log table if it doesn't exist
 */
export async function createWebhookLogTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stripe_webhook_log (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        data JSONB NOT NULL,
        processed_at TIMESTAMP DEFAULT NOW(),
        processing_time_ms INTEGER,
        success BOOLEAN NOT NULL DEFAULT true,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create index on event_type for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_event_type 
      ON stripe_webhook_log(event_type)
    `);
    
    // Create index on processed_at for cleanup queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_processed_at 
      ON stripe_webhook_log(processed_at)
    `);
    
    console.log('[Stripe Webhook Logger] Table verified');
  } catch (error) {
    console.error('[Stripe Webhook Logger] Failed to create table:', error);
    Sentry.captureException(error, {
      tags: { component: "stripe-webhook-logger" }
    });
  }
}

/**
 * Log a webhook event
 */
export async function logWebhookEvent(log: StripeWebhookLog): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO stripe_webhook_log 
       (event_id, event_type, data, processed_at, processing_time_ms, success, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (event_id) DO UPDATE SET
         processed_at = EXCLUDED.processed_at,
         processing_time_ms = EXCLUDED.processing_time_ms,
         success = EXCLUDED.success,
         error = EXCLUDED.error`,
      [
        log.eventId,
        log.eventType,
        JSON.stringify(log.data),
        log.processedAt,
        log.processingTimeMs,
        log.success,
        log.error,
      ]
    );
  } catch (error) {
    console.error('[Stripe Webhook Logger] Failed to log event:', error);
    // Don't throw - logging failure shouldn't break webhook processing
  }
}

/**
 * Get recent webhook events
 */
export async function getRecentWebhookEvents(limit = 100): Promise<StripeWebhookLog[]> {
  try {
    const result = await pool.query(
      `SELECT event_id, event_type, data, processed_at, processing_time_ms, success, error
       FROM stripe_webhook_log
       ORDER BY processed_at DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows.map(row => ({
      eventId: row.event_id,
      eventType: row.event_type,
      data: row.data,
      processedAt: row.processed_at,
      processingTimeMs: row.processing_time_ms,
      success: row.success,
      error: row.error,
    }));
  } catch (error) {
    console.error('[Stripe Webhook Logger] Failed to get events:', error);
    return [];
  }
}

/**
 * Get webhook events by type
 */
export async function getWebhookEventsByType(
  eventType: string,
  limit = 50
): Promise<StripeWebhookLog[]> {
  try {
    const result = await pool.query(
      `SELECT event_id, event_type, data, processed_at, processing_time_ms, success, error
       FROM stripe_webhook_log
       WHERE event_type = $1
       ORDER BY processed_at DESC
       LIMIT $2`,
      [eventType, limit]
    );
    
    return result.rows.map(row => ({
      eventId: row.event_id,
      eventType: row.event_type,
      data: row.data,
      processedAt: row.processed_at,
      processingTimeMs: row.processing_time_ms,
      success: row.success,
      error: row.error,
    }));
  } catch (error) {
    console.error('[Stripe Webhook Logger] Failed to get events by type:', error);
    return [];
  }
}

/**
 * Clean up old webhook logs (keep last 90 days)
 */
export async function cleanupOldWebhookLogs(): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM stripe_webhook_log
       WHERE processed_at < NOW() - INTERVAL '90 days'
       RETURNING event_id`
    );
    
    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      console.log(`[Stripe Webhook Logger] Cleaned up ${deletedCount} old webhook logs`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('[Stripe Webhook Logger] Failed to cleanup old logs:', error);
    return 0;
  }
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(): Promise<{
  totalEvents: number;
  successRate: number;
  eventsByType: Record<string, number>;
  recentErrors: Array<{ eventId: string; eventType: string; error: string; processedAt: Date }>;
}> {
  try {
    // Get total events and success rate
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
      FROM stripe_webhook_log
      WHERE processed_at > NOW() - INTERVAL '30 days'
    `);
    
    // Get events by type
    const typeResult = await pool.query(`
      SELECT event_type, COUNT(*) as count
      FROM stripe_webhook_log
      WHERE processed_at > NOW() - INTERVAL '30 days'
      GROUP BY event_type
      ORDER BY count DESC
    `);
    
    // Get recent errors
    const errorResult = await pool.query(`
      SELECT event_id, event_type, error, processed_at
      FROM stripe_webhook_log
      WHERE success = false
      ORDER BY processed_at DESC
      LIMIT 10
    `);
    
    const eventsByType: Record<string, number> = {};
    for (const row of typeResult.rows) {
      eventsByType[row.event_type] = parseInt(row.count);
    }
    
    return {
      totalEvents: parseInt(statsResult.rows[0]?.total_events || '0'),
      successRate: parseFloat(statsResult.rows[0]?.success_rate || '1'),
      eventsByType,
      recentErrors: errorResult.rows.map(row => ({
        eventId: row.event_id,
        eventType: row.event_type,
        error: row.error,
        processedAt: row.processed_at,
      })),
    };
  } catch (error) {
    console.error('[Stripe Webhook Logger] Failed to get stats:', error);
    return {
      totalEvents: 0,
      successRate: 1,
      eventsByType: {},
      recentErrors: [],
    };
  }
}
