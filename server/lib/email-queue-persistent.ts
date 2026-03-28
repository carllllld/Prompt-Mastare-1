/**
 * Persistent Email Queue
 * 
 * Database-backed email queue that survives server restarts.
 * Replaces in-memory queue with PostgreSQL storage.
 */

import { pool } from "../db";
import * as Sentry from "@sentry/node";

export interface EmailJob {
  id: string;
  type: 'verification' | 'team_invite' | 'password_reset' | 'welcome' | 'subscription_confirmed';
  to: string;
  data: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  nextRetry: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

/**
 * Create email queue table
 */
export async function createEmailQueueTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        recipient TEXT NOT NULL,
        data JSONB NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER NOT NULL,
        next_retry TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create index on status for fast filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_status 
      ON email_queue(status)
    `);
    
    // Create index on next_retry for processing
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry 
      ON email_queue(next_retry) WHERE status = 'pending'
    `);
    
    // Create index on recipient for lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_recipient 
      ON email_queue(recipient)
    `);
    
    console.log('[Email Queue] Table verified');
  } catch (error) {
    console.error('[Email Queue] Failed to create table:', error);
    Sentry.captureException(error, {
      tags: { component: "email-queue" }
    });
  }
}

/**
 * Add email job to queue
 */
export async function addEmailJob(job: {
  type: EmailJob['type'];
  to: string;
  data: Record<string, any>;
  maxAttempts: number;
}): Promise<string> {
  try {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await pool.query(
      `INSERT INTO email_queue 
       (id, type, recipient, data, max_attempts, next_retry, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'pending')`,
      [
        id,
        job.type,
        job.to,
        JSON.stringify(job.data),
        job.maxAttempts,
      ]
    );
    
    console.log(`[Email Queue] Job ${id} added for ${job.to}`);
    
    // Trigger processing (non-blocking)
    processNextJob().catch(err => {
      console.error('[Email Queue] Failed to process job:', err);
    });
    
    return id;
  } catch (error) {
    console.error('[Email Queue] Failed to add job:', error);
    Sentry.captureException(error, {
      tags: { component: "email-queue" },
      extra: { job }
    });
    throw error;
  }
}

/**
 * Get email job by ID
 */
export async function getEmailJob(jobId: string): Promise<EmailJob | null> {
  try {
    const result = await pool.query(
      `SELECT id, type, recipient as to, data, attempts, max_attempts, next_retry, status, error, created_at, updated_at
       FROM email_queue
       WHERE id = $1`,
      [jobId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      to: row.to,
      data: row.data,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      nextRetry: row.next_retry,
      status: row.status,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('[Email Queue] Failed to get job:', error);
    return null;
  }
}

/**
 * Get jobs by status
 */
export async function getEmailJobsByStatus(
  status: EmailJob['status'],
  limit = 100
): Promise<EmailJob[]> {
  try {
    const result = await pool.query(
      `SELECT id, type, recipient as to, data, attempts, max_attempts, next_retry, status, error, created_at, updated_at
       FROM email_queue
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [status, limit]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      to: row.to,
      data: row.data,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      nextRetry: row.next_retry,
      status: row.status,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('[Email Queue] Failed to get jobs by status:', error);
    return [];
  }
}

/**
 * Process next pending job
 */
export async function processNextJob(): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Lock and get next pending job
    const result = await client.query(
      `SELECT id, type, recipient, data, attempts, max_attempts
       FROM email_queue
       WHERE status = 'pending' AND next_retry <= NOW()
       ORDER BY next_retry ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );
    
    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return false;
    }
    
    const job = result.rows[0];
    
    // Mark as processing
    await client.query(
      `UPDATE email_queue 
       SET status = 'processing', updated_at = NOW()
       WHERE id = $1`,
      [job.id]
    );
    
    await client.query('COMMIT');
    
    // Process job outside transaction
    try {
      const { sendEmailWithRetry } = await import('./email-service');
      const result = await sendEmailWithRetry(
        job.type,
        job.recipient,
        job.data
      );
      
      if (result.success) {
        // Mark as sent
        await pool.query(
          `UPDATE email_queue 
           SET status = 'sent', updated_at = NOW()
           WHERE id = $1`,
          [job.id]
        );
        
        console.log(`[Email Queue] Job ${job.id} sent successfully`);
        return true;
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const newAttempts = job.attempts + 1;
      
      if (newAttempts >= job.max_attempts) {
        // Mark as failed
        await pool.query(
          `UPDATE email_queue 
           SET status = 'failed', attempts = $1, error = $2, updated_at = NOW()
           WHERE id = $3`,
          [newAttempts, errorMessage, job.id]
        );
        
        console.error(`[Email Queue] Job ${job.id} failed after ${newAttempts} attempts:`, errorMessage);
        
        Sentry.captureException(error, {
          tags: { component: "email-queue", jobId: job.id },
          extra: { job, attempts: newAttempts }
        });
      } else {
        // Schedule retry with exponential backoff
        const delay = Math.pow(2, newAttempts) * 1000; // 1s, 2s, 4s, 8s...
        const nextRetry = new Date(Date.now() + delay);
        
        await pool.query(
          `UPDATE email_queue 
           SET status = 'pending', attempts = $1, next_retry = $2, error = $3, updated_at = NOW()
           WHERE id = $4`,
          [newAttempts, nextRetry, errorMessage, job.id]
        );
        
        console.log(`[Email Queue] Job ${job.id} retry scheduled in ${delay}ms (attempt ${newAttempts}/${job.max_attempts})`);
      }
      
      return false;
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Email Queue] Failed to process job:', error);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Process all pending jobs
 */
export async function processAllPendingJobs(): Promise<number> {
  let processed = 0;
  let hasMore = true;
  
  while (hasMore) {
    hasMore = await processNextJob();
    if (hasMore) processed++;
    
    // Prevent infinite loop
    if (processed >= 100) break;
  }
  
  return processed;
}

/**
 * Get queue statistics
 */
export async function getEmailQueueStats(): Promise<{
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}> {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) as total
      FROM email_queue
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    
    const row = result.rows[0];
    return {
      pending: parseInt(row.pending || '0'),
      processing: parseInt(row.processing || '0'),
      sent: parseInt(row.sent || '0'),
      failed: parseInt(row.failed || '0'),
      total: parseInt(row.total || '0'),
    };
  } catch (error) {
    console.error('[Email Queue] Failed to get stats:', error);
    return {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      total: 0,
    };
  }
}

/**
 * Clean up old jobs (keep last 30 days)
 */
export async function cleanupOldEmailJobs(): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM email_queue
       WHERE created_at < NOW() - INTERVAL '30 days'
       AND status IN ('sent', 'failed')
       RETURNING id`
    );
    
    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      console.log(`[Email Queue] Cleaned up ${deletedCount} old jobs`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('[Email Queue] Failed to cleanup old jobs:', error);
    return 0;
  }
}

/**
 * Start queue processor (runs every 10 seconds)
 */
export function startEmailQueueProcessor(): NodeJS.Timeout {
  console.log('[Email Queue] Starting queue processor (every 10s)');
  
  // Process immediately
  processAllPendingJobs().catch(err => {
    console.error('[Email Queue] Initial processing failed:', err);
  });
  
  // Process every 10 seconds
  return setInterval(async () => {
    const processed = await processAllPendingJobs();
    if (processed > 0) {
      console.log(`[Email Queue] Processed ${processed} jobs`);
    }
  }, 10000);
}

/**
 * Retry failed job
 */
export async function retryFailedJob(jobId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE email_queue 
       SET status = 'pending', next_retry = NOW(), attempts = 0, error = NULL, updated_at = NOW()
       WHERE id = $1 AND status = 'failed'
       RETURNING id`,
      [jobId]
    );
    
    if (result.rowCount === 0) {
      return false;
    }
    
    console.log(`[Email Queue] Job ${jobId} reset for retry`);
    
    // Trigger processing
    processNextJob().catch(err => {
      console.error('[Email Queue] Failed to process retried job:', err);
    });
    
    return true;
  } catch (error) {
    console.error('[Email Queue] Failed to retry job:', error);
    return false;
  }
}
