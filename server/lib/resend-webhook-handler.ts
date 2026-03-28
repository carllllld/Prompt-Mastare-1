/**
 * Resend Webhook Handler
 * 
 * Handles delivery status updates from Resend email service.
 * Tracks email delivery, bounces, opens, and clicks.
 */

import { pool } from "../db";
import * as Sentry from "@sentry/node";
import crypto from "crypto";

export interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Bounce specific
    bounce_type?: 'hard' | 'soft';
    bounce_reason?: string;
    // Click specific
    link?: string;
  };
}

/**
 * Create email delivery log table
 */
export async function createEmailDeliveryLogTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_delivery_log (
        email_id TEXT PRIMARY KEY,
        recipient TEXT NOT NULL,
        subject TEXT,
        status TEXT NOT NULL,
        event_type TEXT NOT NULL,
        bounce_type TEXT,
        bounce_reason TEXT,
        clicked_link TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create index on recipient for fast lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_delivery_log_recipient 
      ON email_delivery_log(recipient)
    `);
    
    // Create index on status for filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_delivery_log_status 
      ON email_delivery_log(status)
    `);
    
    console.log('[Resend Webhook Handler] Table verified');
  } catch (error) {
    console.error('[Resend Webhook Handler] Failed to create table:', error);
    Sentry.captureException(error, {
      tags: { component: "resend-webhook-handler" }
    });
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch (error) {
    console.error('[Resend Webhook] Signature verification failed:', error);
    return false;
  }
}

/**
 * Log email delivery event
 */
export async function logEmailDeliveryEvent(event: ResendWebhookEvent): Promise<void> {
  try {
    const recipient = event.data.to[0]; // Primary recipient
    const emailId = event.data.email_id;
    
    // Map event type to status
    const status = (() => {
      switch (event.type) {
        case 'email.sent': return 'sent';
        case 'email.delivered': return 'delivered';
        case 'email.delivery_delayed': return 'delayed';
        case 'email.bounced': return 'bounced';
        case 'email.complained': return 'complained';
        case 'email.opened': return 'opened';
        case 'email.clicked': return 'clicked';
        default: return 'unknown';
      }
    })();
    
    await pool.query(
      `INSERT INTO email_delivery_log 
       (email_id, recipient, subject, status, event_type, bounce_type, bounce_reason, clicked_link, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (email_id) DO UPDATE SET
         status = EXCLUDED.status,
         event_type = EXCLUDED.event_type,
         bounce_type = EXCLUDED.bounce_type,
         bounce_reason = EXCLUDED.bounce_reason,
         clicked_link = EXCLUDED.clicked_link,
         updated_at = NOW()`,
      [
        emailId,
        recipient,
        event.data.subject,
        status,
        event.type,
        event.data.bounce_type || null,
        event.data.bounce_reason || null,
        event.data.link || null,
      ]
    );
    
    console.log(`[Resend Webhook] ${event.type} logged for ${recipient}`);
  } catch (error) {
    console.error('[Resend Webhook] Failed to log event:', error);
    Sentry.captureException(error, {
      tags: { component: "resend-webhook-handler" },
      extra: { event }
    });
  }
}

/**
 * Get email delivery status
 */
export async function getEmailDeliveryStatus(
  recipient: string
): Promise<Array<{
  emailId: string;
  subject: string;
  status: string;
  eventType: string;
  bounceType?: string;
  bounceReason?: string;
  createdAt: Date;
  updatedAt: Date;
}>> {
  try {
    const result = await pool.query(
      `SELECT email_id, subject, status, event_type, bounce_type, bounce_reason, created_at, updated_at
       FROM email_delivery_log
       WHERE recipient = $1
       ORDER BY updated_at DESC
       LIMIT 10`,
      [recipient]
    );
    
    return result.rows.map(row => ({
      emailId: row.email_id,
      subject: row.subject,
      status: row.status,
      eventType: row.event_type,
      bounceType: row.bounce_type,
      bounceReason: row.bounce_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('[Resend Webhook] Failed to get delivery status:', error);
    return [];
  }
}

/**
 * Check if email was delivered
 */
export async function wasEmailDelivered(emailId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT status FROM email_delivery_log WHERE email_id = $1`,
      [emailId]
    );
    
    if (result.rows.length === 0) return false;
    
    const status = result.rows[0].status;
    return status === 'delivered' || status === 'opened' || status === 'clicked';
  } catch (error) {
    console.error('[Resend Webhook] Failed to check delivery status:', error);
    return false;
  }
}

/**
 * Check if email bounced
 */
export async function didEmailBounce(recipient: string): Promise<{
  bounced: boolean;
  bounceType?: 'hard' | 'soft';
  bounceReason?: string;
}> {
  try {
    const result = await pool.query(
      `SELECT bounce_type, bounce_reason 
       FROM email_delivery_log 
       WHERE recipient = $1 AND status = 'bounced'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [recipient]
    );
    
    if (result.rows.length === 0) {
      return { bounced: false };
    }
    
    return {
      bounced: true,
      bounceType: result.rows[0].bounce_type,
      bounceReason: result.rows[0].bounce_reason,
    };
  } catch (error) {
    console.error('[Resend Webhook] Failed to check bounce status:', error);
    return { bounced: false };
  }
}

/**
 * Get email delivery statistics
 */
export async function getEmailDeliveryStats(): Promise<{
  totalSent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}> {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
        COUNT(*) FILTER (WHERE status = 'opened') as opened,
        COUNT(*) FILTER (WHERE status = 'clicked') as clicked
      FROM email_delivery_log
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    
    const row = result.rows[0];
    const totalSent = parseInt(row.sent || '0');
    const delivered = parseInt(row.delivered || '0');
    const bounced = parseInt(row.bounced || '0');
    const opened = parseInt(row.opened || '0');
    const clicked = parseInt(row.clicked || '0');
    
    return {
      totalSent,
      delivered,
      bounced,
      opened,
      clicked,
      deliveryRate: totalSent > 0 ? delivered / totalSent : 0,
      openRate: delivered > 0 ? opened / delivered : 0,
      clickRate: opened > 0 ? clicked / opened : 0,
    };
  } catch (error) {
    console.error('[Resend Webhook] Failed to get stats:', error);
    return {
      totalSent: 0,
      delivered: 0,
      bounced: 0,
      opened: 0,
      clicked: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
    };
  }
}

/**
 * Clean up old delivery logs (keep last 90 days)
 */
export async function cleanupOldDeliveryLogs(): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM email_delivery_log
       WHERE created_at < NOW() - INTERVAL '90 days'
       RETURNING email_id`
    );
    
    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      console.log(`[Resend Webhook] Cleaned up ${deletedCount} old delivery logs`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('[Resend Webhook] Failed to cleanup old logs:', error);
    return 0;
  }
}
