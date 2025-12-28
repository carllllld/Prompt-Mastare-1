import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import Stripe from "stripe";
import { PLAN_LIMITS, type User } from "@shared/schema";
import { randomUUID } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

declare module 'express-session' {
  interface SessionData {
    visitorId?: string;
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 5;

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.session?.visitorId || 'anonymous';
  const now = Date.now();
  const userLimit = rateLimitMap.get(sessionId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(sessionId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ 
      message: "För många förfrågningar. Vänta en minut och försök igen." 
    });
  }

  userLimit.count++;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/user/status", async (req, res) => {
    try {
      if (!req.session.visitorId) {
        req.session.visitorId = randomUUID();
      }
      
      const user = await storage.getOrCreateUser(req.session.visitorId);
      const plan = user.plan as "free" | "pro";
      const dailyLimit = PLAN_LIMITS[plan];
      
      res.json({
        plan,
        promptsUsedToday: user.promptsUsedToday,
        promptsRemaining: Math.max(0, dailyLimit - user.promptsUsedToday),
        dailyLimit,
      });
    } catch (err) {
      console.error("Error getting user status:", err);
      res.status(500).json({ message: "Kunde inte hämta användarstatus" });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      if (!req.session.visitorId) {
        return res.status(401).json({ message: "Ingen session hittades" });
      }
      
      const user = await storage.getUserBySessionId(req.session.visitorId);
      if (!user) {
        return res.status(401).json({ message: "Användare hittades inte" });
      }
      
      if (user.plan !== "pro") {
        return res.status(403).json({ 
          message: "Prompthistorik är endast tillgängligt för Pro-användare",
          requiresPro: true
        });
      }
      
      const history = await storage.getOptimizationHistory(user.id, 20);
      res.json(history);
    } catch (err) {
      console.error("Error getting history:", err);
      res.status(500).json({ message: "Kunde inte hämta historik" });
    }
  });

  app.delete("/api/history/:id", async (req, res) => {
    try {
      if (!req.session.visitorId) {
        return res.status(401).json({ message: "Ingen session hittades" });
      }
      
      const user = await storage.getUserBySessionId(req.session.visitorId);
      if (!user) {
        return res.status(401).json({ message: "Användare hittades inte" });
      }
      
      if (user.plan !== "pro") {
        return res.status(403).json({ message: "Endast Pro-användare kan radera historik" });
      }
      
      const optimizationId = parseInt(req.params.id);
      if (isNaN(optimizationId)) {
        return res.status(400).json({ message: "Ogiltigt ID" });
      }
      
      await storage.deleteOptimization(user.id, optimizationId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting optimization:", err);
      res.status(500).json({ message: "Kunde inte radera prompt" });
    }
  });

  app.delete("/api/history", async (req, res) => {
    try {
      if (!req.session.visitorId) {
        return res.status(401).json({ message: "Ingen session hittades" });
      }
      
      const user = await storage.getUserBySessionId(req.session.visitorId);
      if (!user) {
        return res.status(401).json({ message: "Användare hittades inte" });
      }
      
      if (user.plan !== "pro") {
        return res.status(403).json({ message: "Endast Pro-användare kan radera historik" });
      }
      
      await storage.deleteAllOptimizations(user.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting all optimizations:", err);
      res.status(500).json({ message: "Kunde inte radera historik" });
    }
  });

  app.post(api.optimize.path, rateLimit, async (req, res) => {
    try {
      if (!req.session.visitorId) {
        req.session.visitorId = randomUUID();
      }

      const user = await storage.getOrCreateUser(req.session.visitorId);
      const plan = user.plan as "free" | "pro";
      const dailyLimit = PLAN_LIMITS[plan];

      if (user.promptsUsedToday >= dailyLimit) {
        return res.status(403).json({
          message: plan === "free" 
            ? "Du har använt alla dina 3 gratis optimeringar idag. Uppgradera till Pro för fler!"
            : "Du har nått din dagliga gräns på 100 optimeringar.",
          limitReached: true,
          plan,
        });
      }

      const { prompt, type } = api.optimize.input.parse(req.body);

      const freeSystemPrompt = `Du är en expert på prompt engineering.
Förbättra användarens prompt så att den blir tydligare, mer specifik och lättare för en AI att förstå.

Fokusera på:
- Tydligare formulering
- Grundläggande struktur
- Korrekt språk

VIKTIGT: Den förbättrade prompten ska vara en INSTRUKTION till en AI, inte ett färdigt svar.

Svara i JSON:
{
  "improvedPrompt": "Den förbättrade prompten (tydligare och mer specifik)",
  "improvements": ["Förbättring 1", "Förbättring 2"],
  "suggestions": ["Kort tillägg 1", "Kort tillägg 2"]
}

suggestions ska vara korta tillägg (5-15 ord) som användaren kan lägga till.`;

      const proSystemPrompt = `Du är en världsklass prompt engineer med expertis inom avancerad AI-kommunikation.

STEG 1 - DJUPANALYS av användarens prompt:
- Identifiera användarens explicita och implicita mål
- Analysera brister i struktur, kontext och specificitet
- Bestäm optimalt format (lista, steg-för-steg, tabell, mall, hybrid etc.)
- Identifiera domänspecifika best practices

STEG 2 - SKAPA OPTIMERAD PROMPT:
- Implementera bästa format och struktur för användningsfallet
- Definiera tydlig roll med expertområde
- Specificera exakt output-format med exempel om relevant
- Inkludera kvalitetskriterier, begränsningar och edge cases
- Optimera för precision och reproducerbarhet
- Lämna utrymme för AI:n att ge egna förslag

VIKTIGT: Den förbättrade prompten ska vara en INSTRUKTION till en AI, inte ett färdigt svar.

Svara i JSON:
{
  "improvedPrompt": "Professionellt strukturerad prompt med rubriker, punktlistor och optimalt format",
  "improvements": ["Analys: [insikt om ursprunglig prompt]", "Format: [valt format och varför]", "Struktur: [strukturförbättringar]", "Kontext: [tillagd kontext]"],
  "suggestions": ["Avancerat tillägg 1", "Avancerat tillägg 2", "Avancerat tillägg 3", "Avancerat tillägg 4", "Avancerat tillägg 5"]
}

suggestions ska vara 5 avancerade, specifika tillägg (10-20 ord) som kan förbättra prompten ytterligare.`;

      const systemPrompt = plan === "pro" ? proSystemPrompt : freeSystemPrompt;

      try {
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Prompt-typ: ${type}\n\nAnvändarens prompt:\n${prompt}`
            },
          ],
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.4,
        });

        const content = completion.choices[0].message.content;
        if (!content) {
          throw new Error("Inget svar från AI");
        }

        const result = JSON.parse(content);
        
        const responseData = {
          originalPrompt: prompt,
          improvedPrompt: result.improvedPrompt || "Kunde inte generera prompt.",
          improvements: Array.isArray(result.improvements) ? result.improvements : [],
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        };

        await storage.incrementUserPrompts(user.id);

        storage.createOptimization({
          userId: user.id,
          originalPrompt: prompt,
          improvedPrompt: responseData.improvedPrompt,
          category: type,
          improvements: responseData.improvements,
          suggestions: responseData.suggestions,
        }).catch(err => console.error("Failed to save history:", err));

        res.json(responseData);
      } catch (openaiError: any) {
        console.error("OpenAI Error:", openaiError);
        res.status(500).json({ 
          message: "Ett fel uppstod vid optimering. Försök igen." 
        });
      }

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      console.error("Error:", err);
      res.status(500).json({ message: "Internt serverfel" });
    }
  });

  // Helper to get or create the PromptForge Pro price
  async function getOrCreatePrice(): Promise<string> {
    // First try to use existing price from env
    if (STRIPE_PRICE_ID) {
      try {
        await stripe.prices.retrieve(STRIPE_PRICE_ID);
        return STRIPE_PRICE_ID;
      } catch {
        // Price doesn't exist, create new one
      }
    }

    // Look for existing product
    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find(p => p.name === "PromptForge Pro" && p.active);

    if (!product) {
      product = await stripe.products.create({
        name: "PromptForge Pro",
        description: "100 optimeringar per dag",
      });
      console.log("Created Stripe product:", product.id);
    }

    // Look for existing price
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    let price = prices.data.find(p => p.unit_amount === 9900 && p.currency === "sek" && p.recurring?.interval === "month");

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 9900, // 99 SEK
        currency: "sek",
        recurring: { interval: "month" },
      });
      console.log("Created Stripe price:", price.id);
    }

    return price.id;
  }

  // Create Stripe Checkout session
  app.post("/api/stripe/create-checkout", async (req, res) => {
    try {
      if (!req.session.visitorId) {
        req.session.visitorId = randomUUID();
      }

      const user = await storage.getOrCreateUser(req.session.visitorId);

      if (user.plan === "pro") {
        return res.status(400).json({ message: "Du har redan Pro-planen!" });
      }

      const priceId = await getOrCreatePrice();

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${req.headers.origin || 'http://localhost:5000'}/?success=true`,
        cancel_url: `${req.headers.origin || 'http://localhost:5000'}/?canceled=true`,
        metadata: {
          userId: user.id.toString(),
          sessionId: req.session.visitorId,
        },
      };

      if (user.stripeCustomerId) {
        sessionParams.customer = user.stripeCustomerId;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      res.json({ url: session.url });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      res.status(500).json({ message: "Kunde inte starta betalning." });
    }
  });

  // Stripe webhook handler
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return res.status(500).send("Webhook secret not configured");
    }

    let event: Stripe.Event;

    try {
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(400).send("No raw body available");
      }
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId) {
          await storage.upgradeUserToPro(
            parseInt(userId),
            customerId,
            subscriptionId
          );
          console.log(`User ${userId} upgraded to Pro`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await storage.downgradeUserToFree(subscription.id);
        console.log(`Subscription ${subscription.id} canceled, user downgraded`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment failed for invoice: ${invoice.id}`);
        break;
      }
    }

    res.json({ received: true });
  });

  return httpServer;
}
