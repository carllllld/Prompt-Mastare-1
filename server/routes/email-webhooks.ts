import { Router } from 'express';
import crypto from 'crypto';
import { handleEmailWebhook, getEmailMetrics, getEmailQueueStatus } from '../lib/email-service';

const router = Router();

function safeCompare(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function extractSvixSignatureCandidates(signatureHeader: string): string[] {
  return signatureHeader
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('v1,')) return part.slice(3);
      if (part.startsWith('v1=')) return part.slice(3);
      return part;
    })
    .filter(Boolean);
}

function verifyEmailWebhookSignature(req: any): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET || process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) return false;

  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
  const svixId = req.headers['svix-id'] as string | undefined;
  const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
  const svixSignature = req.headers['svix-signature'] as string | undefined;
  const resendSignature = req.headers['resend-signature'] as string | undefined;

  if (svixId && svixTimestamp && svixSignature) {
    const tsNum = Number(svixTimestamp);
    if (!Number.isFinite(tsNum)) return false;
    const age = Math.abs(Date.now() - tsNum * 1000);
    if (age > 5 * 60 * 1000) return false;

    const normalizedSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
    const key = Buffer.from(normalizedSecret, 'base64');
    const signedPayload = `${svixId}.${svixTimestamp}.${rawBody.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', key).update(signedPayload).digest('base64');
    const candidates = extractSvixSignatureCandidates(svixSignature);
    return candidates.some((candidate) => safeCompare(expected, candidate));
  }

  if (!resendSignature) return false;
  const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  return safeCompare(expectedHex, resendSignature) || safeCompare(expectedBase64, resendSignature);
}

// Webhook endpoint for email status updates (Resend, SendGrid, etc.)
router.post('/webhooks/email', async (req, res) => {
  try {
    const isValidSignature = verifyEmailWebhookSignature(req);
    if (!isValidSignature) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    await handleEmailWebhook(req.body);

    res.json({ success: true });
  } catch (error) {
    console.error('[Email Webhook] Error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Admin auth check for internal endpoints
function requireAdminKey(req: any, res: any, next: any) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Get email metrics (admin only)
router.get('/metrics', requireAdminKey, async (req, res) => {
  try {
    const metrics = getEmailMetrics();
    const queueStatus = getEmailQueueStatus();

    res.json({
      metrics,
      queueStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Email Metrics] Error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Get email queue status (admin only)
router.get('/queue/status', requireAdminKey, async (req, res) => {
  try {
    const status = getEmailQueueStatus();
    res.json(status);
  } catch (error) {
    console.error('[Email Queue] Error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

export default router;
