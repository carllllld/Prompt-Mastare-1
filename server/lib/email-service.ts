import { Resend } from 'resend';
import { emailTemplateEngine, TemplateVariables } from '../templates/email-templates';
import { emailQueue, EmailJob } from './email-queue';
import { checkEmailRateLimit } from './email-rate-limiter';

export interface EmailResult {
  success: boolean;
  error?: string;
  jobId?: string;
}

export interface EmailPreferences {
  marketing: boolean;
  notifications: boolean;
  team_invites: boolean;
  security: boolean;
}

// Retry strategies for different error types
const RETRY_STRATEGIES = {
  'temporary_failure': { delay: 5000, maxAttempts: 3 }, // 5s, 10s, 20s
  'rate_limit': { delay: 3600000, maxAttempts: 2 }, // 1h, 2h
  'permanent_failure': { delay: 0, maxAttempts: 0 }, // No retry
  'unknown': { delay: 10000, maxAttempts: 2 } // 10s, 20s
};

// Initialize Resend
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('[Email] Resend initialized');
} else {
  console.log('[Email] RESEND_API_KEY not configured — emails will be skipped');
}

// Smart email sending with retry logic
export async function sendEmailWithRetry(
  type: 'verification' | 'team_invite' | 'password_reset' | 'welcome' | 'subscription_confirmed',
  to: string,
  data: TemplateVariables,
  ip?: string
): Promise<EmailResult> {
  try {
    // Check rate limits first
    const rateLimit = await checkEmailRateLimit(to, type, ip);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again later. Remaining: ${rateLimit.remaining}`
      };
    }

    // Check user preferences (if user exists)
    const userPrefs = await getUserEmailPreferences(to);
    if (!canSendEmail(type, userPrefs)) {
      return {
        success: false,
        error: 'User has opted out of this type of email'
      };
    }

    // Render template
    const template = emailTemplateEngine.render(type, data);

    // Send email
    const result = await sendEmail(to, template.subject, template.html, template.text);

    if (result.success) {
      // Track metrics
      await trackEmailMetrics(type, 'sent', to);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Email Service] Failed to send ${type} email:`, errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}

// Queue-based email sending
export async function queueEmail(
  type: 'verification' | 'team_invite' | 'password_reset' | 'welcome' | 'subscription_confirmed',
  to: string,
  data: TemplateVariables,
  ip?: string
): Promise<EmailResult> {
  try {
    // Check rate limits first
    const rateLimit = await checkEmailRateLimit(to, type, ip);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again later. Remaining: ${rateLimit.remaining}`
      };
    }

    // Add to queue
    const jobId = await emailQueue.addJob({
      type,
      to,
      data,
      maxAttempts: getMaxAttempts(type),
      nextRetry: new Date()
    });

    return {
      success: true,
      jobId
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Email Queue] Failed to queue ${type} email:`, errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}

// Core email sending function
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<EmailResult> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email to:', to);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@optiprompt.se',
      to: [to],
      subject,
      html,
      text
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('[Email] Email sent successfully to:', to);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Failed to send email:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Get user email preferences (mock implementation)
async function getUserEmailPreferences(email: string): Promise<EmailPreferences | null> {
  // TODO: Implement actual user preferences lookup
  // For now, return default preferences
  return {
    marketing: false,
    notifications: true,
    team_invites: true,
    security: true
  };
}

// Check if user allows this type of email
function canSendEmail(
  type: 'verification' | 'team_invite' | 'password_reset' | 'welcome' | 'subscription_confirmed',
  preferences: EmailPreferences | null
): boolean {
  if (!preferences) return true; // No preferences set, allow by default

  switch (type) {
    case 'verification':
    case 'password_reset':
    case 'welcome':
      return preferences.security; // Security emails
    case 'team_invite':
      return preferences.team_invites; // Team emails
    default:
      return true;
  }
}

// Get max attempts based on email type
function getMaxAttempts(type: string): number {
  switch (type) {
    case 'verification':
    case 'password_reset':
      return 3; // Security emails are important
    case 'team_invite':
      return 2; // Team invites are less critical
    case 'welcome':
      return 1; // Welcome email is fire-and-forget
    default:
      return 2;
  }
}

// Track email metrics (mock implementation)
async function trackEmailMetrics(
  type: string,
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed',
  email: string
): Promise<void> {
  // TODO: Implement actual metrics tracking
  console.log(`[Email Metrics] ${type} ${status} for ${email}`);
}

// Webhook handler for email status updates
export async function handleEmailWebhook(data: any): Promise<void> {
  try {
    const { type, email, status, timestamp } = data;

    // Update job status in queue
    if (type === 'delivery' && status === 'delivered') {
      await trackEmailMetrics('unknown', 'delivered', email);
    } else if (type === 'bounce') {
      await trackEmailMetrics('unknown', 'bounced', email);
    } else if (type === 'open') {
      await trackEmailMetrics('unknown', 'opened', email);
    } else if (type === 'click') {
      await trackEmailMetrics('unknown', 'clicked', email);
    }

    console.log(`[Email Webhook] ${type} ${status} for ${email}`);
  } catch (error) {
    console.error('[Email Webhook] Failed to handle webhook:', error);
  }
}

// Get email queue metrics
export function getEmailMetrics() {
  return emailQueue.getMetrics();
}

// Get email queue status
export function getEmailQueueStatus() {
  return {
    pending: emailQueue.getJobsByStatus('pending').length,
    processing: emailQueue.getJobsByStatus('processing').length,
    sent: emailQueue.getJobsByStatus('sent').length,
    failed: emailQueue.getJobsByStatus('failed').length
  };
}
