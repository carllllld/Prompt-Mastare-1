import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import OpenAI from "openai";
import { optimizeRequestSchema, PLAN_LIMITS, type PlanType, type User } from "@shared/schema";
import { requireAuth } from "./auth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  
  // User status endpoint
  app.get("/api/user/status", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const tzOffset = parseInt(req.query.tz as string) || 0;
      
      // Calculate reset time at midnight in user's timezone
      const now = new Date();
      const userNow = new Date(now.getTime() - tzOffset * 60000);
      const tomorrow = new Date(userNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const resetTime = new Date(tomorrow.getTime() + tzOffset * 60000);
      
      if (userId) {
        const user = await storage.getUserById(userId);
        if (user) {
          const plan = (user.plan as PlanType) || "free";
          const dailyLimit = PLAN_LIMITS[plan];
          const promptsUsedToday = user.promptsUsedToday || 0;
          
          return res.json({
            plan,
            promptsUsedToday,
            promptsRemaining: Math.max(0, dailyLimit - promptsUsedToday),
            dailyLimit,
            isLoggedIn: true,
            resetTime: resetTime.toISOString(),
            stripeCustomerId: user.stripeCustomerId || null,
          });
        }
      }
      
      // Anonymous user - use session-based tracking
      const sessionId = req.sessionID;
      const usage = await storage.getSessionUsage(sessionId);
      const dailyLimit = PLAN_LIMITS.free;
      
      res.json({
        plan: "free",
        promptsUsedToday: usage.promptsUsedToday,
        promptsRemaining: Math.max(0, dailyLimit - usage.promptsUsedToday),
        dailyLimit,
        isLoggedIn: false,
        resetTime: resetTime.toISOString(),
      });
    } catch (err) {
      console.error("User status error:", err);
      res.status(500).json({ message: "Failed to get user status" });
    }
  });

  // Optimize endpoint
  app.post("/api/optimize", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const sessionId = req.sessionID;
      
      // Check usage limits
      let plan: PlanType = "free";
      let promptsUsedToday = 0;
      
      if (userId) {
        const user = await storage.getUserById(userId);
        if (user) {
          plan = (user.plan as PlanType) || "free";
          promptsUsedToday = user.promptsUsedToday || 0;
        }
      } else {
        const usage = await storage.getSessionUsage(sessionId);
        promptsUsedToday = usage.promptsUsedToday;
      }
      
      const dailyLimit = PLAN_LIMITS[plan];
      if (promptsUsedToday >= dailyLimit) {
        return res.status(429).json({
          message: `You've reached your daily limit of ${dailyLimit} optimizations. Upgrade for more!`,
          limitReached: true,
        });
      }
      
    const { prompt, type, platform } = req.body;
    
    const systemPrompt = `Du är en expert på att skriva säljande objektbeskrivningar för svenska fastighetsmäklare.
Ditt mål är att omvandla teknisk information och korta anteckningar till en professionell, lockande och korrekt beskrivning.

Analysera informationen och:
1. Skriv en säljande rubrik som fångar intresset.
2. Skapa en målande beskrivning av bostadens främsta egenskaper och fördelar.
3. Anpassa tonläget efter målgrupp och plattform: ${platform === 'hemnet' ? 'Hemnet (professionellt och informativt)' : 'Sociala medier (engagerande och personligt)'}.
4. Se till att språket är felfritt och följer god mäklarsed.
5. Inkludera de viktigaste detaljerna om arkitektur, läge och mervärden.

Returnera ett JSON-svar med följande struktur:
{
  "improvedPrompt": "Den färdiga objektbeskrivningen",
  "analysis": {
    "tone_choice": "Kort motivering till tonval",
    "target_group": "Målgruppsanalys",
    "area_advantage": "Områdesfördelar"
  },
  "critical_gaps": ["Viktiga saker som saknas i informationen"],
  "pro_tips": ["Specifika tips för annonsen"],
  "socialCopy": "En kortare, engagerande text anpassad för Instagram/Facebook"
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      model: plan === "pro" ? "gpt-4o" : "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      
      // Increment usage
      if (userId) {
        await storage.incrementUserPrompts(userId);
        await storage.createOptimization({
          userId,
          originalPrompt: prompt,
          improvedPrompt: result.improvedPrompt || prompt,
          category: type,
          improvements: result.improvements || [],
          suggestions: result.suggestions || [],
        });
      } else {
        await storage.incrementSessionPrompts(sessionId);
      }

      res.json({
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt || prompt,
        improvements: result.improvements || [],
        suggestions: result.suggestions || [],
      });
    } catch (err: any) {
      console.error("Optimize error:", err);
      res.status(500).json({ message: err.message || "Optimization failed" });
    }
  });

  // Stripe checkout
  app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { tier } = req.body as { tier: "basic" | "pro" };
      
      const priceId = tier === "basic" ? STRIPE_BASIC_PRICE_ID : STRIPE_PRO_PRICE_ID;
      if (!priceId) {
        return res.status(500).json({ message: "Stripe price not configured" });
      }
      
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
      }
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}?success=true`,
        cancel_url: `${baseUrl}?canceled=true`,
        metadata: { userId: user.id, targetPlan: tier },
      });
      
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      res.status(500).json({ message: err.message || "Payment failed" });
    }
  });

  // Stripe customer portal
  app.post("/api/stripe/create-portal", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      
      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;
      
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: baseUrl,
      });
      
      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("Portal error:", err);
      res.status(500).json({ message: err.message || "Could not open portal" });
    }
  });

  // Stripe webhook
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("Stripe webhook secret not configured");
      return res.status(500).json({ message: "Webhook not configured" });
    }
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }
    
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const targetPlan = session.metadata?.targetPlan as "basic" | "pro";
          
          if (userId && targetPlan && session.subscription && session.customer) {
            await storage.upgradeUser(
              userId,
              targetPlan,
              session.customer as string,
              session.subscription as string
            );
            console.log(`User ${userId} upgraded to ${targetPlan}`);
          }
          break;
        }
        
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await storage.downgradeUserToFree(subscription.id);
          console.log(`Subscription ${subscription.id} cancelled`);
          break;
        }
        
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription;
          if (subscriptionId) {
            await storage.downgradeUserToFree(subscriptionId as string);
            console.log(`Payment failed for subscription ${subscriptionId}`);
          }
          break;
        }
      }
      
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // History endpoints
  app.get("/api/history", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const history = await storage.getOptimizationHistory(user.id);
      res.json(history);
    } catch (err) {
      console.error("History error:", err);
      res.status(500).json({ message: "Failed to get history" });
    }
  });

  app.delete("/api/history/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const id = parseInt(req.params.id);
      await storage.deleteOptimization(user.id, id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete history error:", err);
      res.status(500).json({ message: "Failed to delete" });
    }
  });

  app.delete("/api/history", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      await storage.deleteAllOptimizations(user.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Clear history error:", err);
      res.status(500).json({ message: "Failed to clear history" });
    }
  });

  return httpServer;
}
