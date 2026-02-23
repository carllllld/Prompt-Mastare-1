import { db } from "./db";
import { emailRateLimits } from "./schema";

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

export interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  timestamp: Date;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  variables: Record<string, string>;
}

export interface EmailPreferences {
  marketing: boolean;
  notifications: boolean;
  team_invites: boolean;
  security: boolean;
}

// Email queue implementation using in-memory storage (can be upgraded to Redis)
class EmailQueue {
  private jobs: Map<string, EmailJob> = new Map();
  private processing: Set<string> = new Set();
  private metrics: EmailMetrics = {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
    timestamp: new Date()
  };

  async addJob(job: Omit<EmailJob, 'id' | 'attempts' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullJob: EmailJob = {
      ...job,
      id,
      attempts: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.jobs.set(id, fullJob);
    
    // Process job asynchronously
    this.processJob(id).catch(console.error);
    
    return id;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') return;

    if (this.processing.has(jobId)) return;
    this.processing.add(jobId);

    try {
      job.status = 'processing';
      job.updatedAt = new Date();

      // Import dynamically to avoid circular dependencies
      const { sendEmailWithRetry } = await import('./email-service');
      
      const result = await sendEmailWithRetry(job.type, job.to, job.data);
      
      if (result.success) {
        job.status = 'sent';
        this.metrics.sent++;
        this.metrics.delivered++;
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.attempts++;
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        this.metrics.failed++;
      } else {
        // Schedule retry with exponential backoff
        const delay = Math.pow(2, job.attempts) * 1000; // 1s, 2s, 4s, 8s...
        job.nextRetry = new Date(Date.now() + delay);
        job.status = 'pending';
        job.updatedAt = new Date();
        
        // Retry later
        setTimeout(() => this.processJob(jobId), delay);
      }
    } finally {
      this.processing.delete(jobId);
    }
  }

  getJob(jobId: string): EmailJob | undefined {
    return this.jobs.get(jobId);
  }

  getMetrics(): EmailMetrics {
    return { ...this.metrics };
  }

  getJobsByStatus(status: EmailJob['status']): EmailJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  // Cleanup old jobs (older than 24 hours)
  cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [id, job] of this.jobs.entries()) {
      if (job.createdAt < cutoff && (job.status === 'sent' || job.status === 'failed')) {
        this.jobs.delete(id);
      }
    }
  }
}

export const emailQueue = new EmailQueue();

// Cleanup every hour
setInterval(() => emailQueue.cleanup(), 60 * 60 * 1000);
