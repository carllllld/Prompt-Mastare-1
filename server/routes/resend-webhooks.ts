/**
 * Resend Webhook Routes
 * 
 * Handles webhook events from Resend email service.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import {
  verifyWebhookSignature,
  logEmailDeliveryEvent,
  type ResendWebhookEvent,
} from "../lib/resend-webhook-handler";

const router = Router();

/**
 * POST /api/resend/webhook
 * 
 * Receives webhook events from Resend
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["resend-signature"] as string;
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || process.env.EMAIL_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("[Resend Webhook] Webhook secret not configured");
      return res.status(500).json({ message: "Webhook not configured" });
    }
    
    // Verify signature
    const rawBody = (req as any).rawBody?.toString() || JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    
    if (!isValid) {
      console.error("[Resend Webhook] Invalid signature");
      return res.status(401).json({ message: "Invalid signature" });
    }
    
    const event: ResendWebhookEvent = req.body;
    
    // Log event
    await logEmailDeliveryEvent(event);
    
    console.log(`[Resend Webhook] ${event.type} processed for ${event.data.to[0]}`);
    
    res.json({ received: true });
  } catch (error) {
    console.error("[Resend Webhook] Error processing webhook:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

/**
 * GET /api/resend/delivery-status/:email
 * 
 * Get delivery status for an email address
 */
router.get("/delivery-status/:email", async (req: Request, res: Response) => {
  try {
    const { getEmailDeliveryStatus } = await import("../lib/resend-webhook-handler");
    const email = decodeURIComponent(req.params.email);
    
    const status = await getEmailDeliveryStatus(email);
    
    res.json({ email, deliveries: status });
  } catch (error) {
    console.error("[Resend Webhook] Error getting delivery status:", error);
    res.status(500).json({ message: "Failed to get delivery status" });
  }
});

/**
 * GET /api/resend/stats
 * 
 * Get email delivery statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { getEmailDeliveryStats } = await import("../lib/resend-webhook-handler");
    const stats = await getEmailDeliveryStats();
    
    res.json(stats);
  } catch (error) {
    console.error("[Resend Webhook] Error getting stats:", error);
    res.status(500).json({ message: "Failed to get stats" });
  }
});

export default router;
