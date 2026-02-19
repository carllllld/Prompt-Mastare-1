import { Router } from 'express';
import { handleEmailWebhook, getEmailMetrics, getEmailQueueStatus } from '../lib/email-service';

const router = Router();

// Webhook endpoint for email status updates (Resend, SendGrid, etc.)
router.post('/webhooks/email', async (req, res) => {
  try {
    const signature = req.headers['resend-signature'] as string;
    
    // Verify webhook signature (optional but recommended)
    if (signature) {
      // TODO: Implement signature verification
      // const isValid = verifyWebhookSignature(req.body, signature);
      // if (!isValid) {
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }
    }

    // Handle webhook events
    await handleEmailWebhook(req.body);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Email Webhook] Error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Get email metrics
router.get('/metrics', async (req, res) => {
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

// Get email queue status
router.get('/queue/status', async (req, res) => {
  try {
    const status = getEmailQueueStatus();
    res.json(status);
  } catch (error) {
    console.error('[Email Queue] Error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

export default router;
