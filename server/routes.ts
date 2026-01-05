import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import Stripe from "stripe";
import { PLAN_LIMITS, CHARACTER_LIMITS, PLAN_PRICES, type User, type PlanType } from "@shared/schema";
import { setupAuth, requireAuth, requirePro } from "./auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 10;

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId || 'anonymous';
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ 
      message: "Too many requests. Please wait a minute and try again." 
    });
  }

  userLimit.count++;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Setup email/password authentication
  setupAuth(app);

  // Helper to calculate next midnight in user's local timezone
  function getNextResetTime(timezoneOffset?: number): string {
    const now = new Date();
    
    // If no offset provided, use UTC
    if (timezoneOffset === undefined) {
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    }
    
    // Calculate local time by applying offset (offset is in minutes, negative = ahead of UTC)
    const localNow = new Date(now.getTime() - timezoneOffset * 60000);
    const localMidnight = new Date(localNow);
    localMidnight.setUTCHours(24, 0, 0, 0); // Next midnight in "local" time
    
    // Convert back to real UTC
    const realMidnight = new Date(localMidnight.getTime() + timezoneOffset * 60000);
    return realMidnight.toISOString();
  }

  app.get("/api/user/status", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const sessionId = req.sessionID;
      const tzOffset = req.query.tz ? parseInt(req.query.tz as string, 10) : undefined;
      const resetTime = getNextResetTime(tzOffset);
      
      console.log(`[Status] sessionId: ${sessionId}, userId: ${userId}`);
      
      if (!userId) {
        // Anonymous user - use session-based tracking
        const sessionData = await storage.getSessionUsage(sessionId);
        const promptsUsedToday = sessionData.promptsUsedToday;
        console.log(`[Status] Anonymous user, promptsUsedToday: ${promptsUsedToday}`);
        
        return res.json({
          plan: "free",
          promptsUsedToday,
          promptsRemaining: Math.max(0, PLAN_LIMITS.free - promptsUsedToday),
          dailyLimit: PLAN_LIMITS.free,
          isLoggedIn: false,
          resetTime,
        });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        const sessionData = await storage.getSessionUsage(sessionId);
        const promptsUsedToday = sessionData.promptsUsedToday;
        
        return res.json({
          plan: "free",
          promptsUsedToday,
          promptsRemaining: Math.max(0, PLAN_LIMITS.free - promptsUsedToday),
          dailyLimit: PLAN_LIMITS.free,
          isLoggedIn: false,
          resetTime,
        });
      }
      
      const plan = user.plan as PlanType;
      const dailyLimit = PLAN_LIMITS[plan];
      
      res.json({
        plan,
        promptsUsedToday: user.promptsUsedToday,
        promptsRemaining: Math.max(0, dailyLimit - user.promptsUsedToday),
        dailyLimit,
        isLoggedIn: true,
        resetTime,
      });
    } catch (err) {
      console.error("Error getting user status:", err);
      res.status(500).json({ message: "Could not fetch user status" });
    }
  });

  // History routes - require Pro subscription
  app.get("/api/history", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const history = await storage.getOptimizationHistory(user.id, 20);
      res.json(history);
    } catch (err) {
      console.error("Error getting history:", err);
      res.status(500).json({ message: "Could not fetch history" });
    }
  });

  app.delete("/api/history/:id", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const optimizationId = parseInt(req.params.id);
      if (isNaN(optimizationId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      await storage.deleteOptimization(user.id, optimizationId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting optimization:", err);
      res.status(500).json({ message: "Could not delete prompt" });
    }
  });

  app.delete("/api/history", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      await storage.deleteAllOptimizations(user.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting all optimizations:", err);
      res.status(500).json({ message: "Could not delete history" });
    }
  });

  app.post(api.optimize.path, rateLimit, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const sessionId = req.sessionID;
      
      let user: User | null = null;
      if (userId) {
        user = await storage.getUserById(userId);
      }
      
      const plan = (user?.plan as PlanType) || "free";
      const dailyLimit = PLAN_LIMITS[plan];
      
      // Get prompts used today - from user or session
      let promptsUsedToday: number;
      if (user) {
        promptsUsedToday = user.promptsUsedToday;
      } else {
        const sessionData = await storage.getSessionUsage(sessionId);
        promptsUsedToday = sessionData.promptsUsedToday;
      }

      if (promptsUsedToday >= dailyLimit) {
        let message = "You've reached your daily limit.";
        if (plan === "free") {
          message = "You've used all 2 free optimizations today. Upgrade for more!";
        } else if (plan === "basic") {
          message = "You've used all 20 Basic optimizations today. Upgrade to Pro for 50/day!";
        } else {
          message = "You've reached your daily limit of 50 optimizations.";
        }
        return res.status(403).json({
          message,
          limitReached: true,
          plan,
        });
      }

      const { prompt, type } = api.optimize.input.parse(req.body);

      // Check character limit
      const charLimit = CHARACTER_LIMITS[plan];
      if (prompt.length > charLimit) {
        let upgradeMsg = "Please shorten your prompt.";
        if (plan === "free") {
          upgradeMsg = "Upgrade to Basic for 1000 chars or Pro for 2000!";
        } else if (plan === "basic") {
          upgradeMsg = "Upgrade to Pro for 2000 characters!";
        }
        return res.status(400).json({
          message: `Your prompt exceeds the ${charLimit} character limit for the ${plan} plan. ${upgradeMsg}`,
          limitReached: false,
        });
      }

      const freeSystemPrompt = `You are an expert prompt engineer. Your ONLY job is to ENHANCE and IMPROVE prompts.

ABSOLUTE RULE - READ CAREFULLY:
The user gives you a PROMPT they want to use with an AI. You must return an IMPROVED VERSION of that prompt.
DO NOT answer the prompt. DO NOT provide information. DO NOT solve the user's problem.
ONLY return a better-written prompt that the user will copy and paste to use with an AI.

CRITICAL VALIDATION:
- If the user asks "What is X?" - return a prompt like "Explain X in detail, covering [aspects]"
- If the user asks "How do I Y?" - return a prompt like "Provide step-by-step instructions for Y"
- Your output must be a QUESTION or INSTRUCTION for an AI, never a direct answer

LANGUAGE RULES:
- Detect the language of the user's prompt automatically
- Respond in the SAME language as the user wrote in
- Never translate unless explicitly asked

ENHANCEMENT FOCUS:
- Add clarity and specificity
- Improve structure
- Add relevant context
- Specify desired output format

Respond in JSON:
{
  "improvedPrompt": "The enhanced prompt (a clear instruction/question for an AI, NOT an answer)",
  "improvements": ["What you improved 1", "What you improved 2"],
  "suggestions": ["Optional addition 1", "Optional addition 2"]
}

suggestions should be short additions (5-15 words) the user can optionally add.`;

      const proSystemPrompt = `You are a world-class prompt engineer. Your ONLY job is to ENHANCE and TRANSFORM prompts into professional-grade instructions.

ABSOLUTE RULE - READ CAREFULLY:
The user gives you a PROMPT they want to use with an AI. You must return an IMPROVED VERSION of that prompt.
DO NOT answer the prompt. DO NOT provide information. DO NOT solve the user's problem.
ONLY return a better-written, structured prompt that the user will copy and paste to use with an AI.

CRITICAL VALIDATION:
- If the user asks "What is X?" - return a structured prompt asking for detailed explanation of X
- If the user asks "How do I Y?" - return a structured prompt requesting step-by-step instructions
- Your output must be an INSTRUCTION for an AI, never a direct answer to the question

LANGUAGE RULES:
- Detect the language of the user's prompt automatically
- Respond in the SAME language as the user wrote in
- Never translate unless explicitly asked

MANDATORY PRO FORMAT - The improvedPrompt MUST include:
1. **Role Definition**: Start with "### Role: [Expert Title]" - define what expert the AI should act as
2. **Goal Section**: "#### Goal: [Clear objective]" - state the main objective
3. **Structured Sections**: Use markdown headings (###, ####) to organize the prompt
4. **Numbered Steps or Bullet Points**: Break down the task into clear steps
5. **Output Format Specification**: Define exactly how the AI should structure its response
6. **Quality Criteria**: Include specific requirements for the output quality

EXAMPLE FORMAT:
### Role: [Expert type]

#### Goal: [Main objective]

#### Instructions:
1. [Step 1]
2. [Step 2]
3. [Step 3]

#### Output Format:
[Specify the expected format]

#### Quality Criteria:
- [Criterion 1]
- [Criterion 2]

Respond in JSON:
{
  "improvedPrompt": "The FULLY STRUCTURED prompt with Role, Goal, Instructions, Output Format, and Quality Criteria sections",
  "improvements": ["Analysis: [insight]", "Format: [chosen format]", "Structure: [improvements]", "Context: [additions]"],
  "suggestions": ["Advanced addition 1", "Advanced addition 2", "Advanced addition 3", "Advanced addition 4", "Advanced addition 5"]
}

IMPORTANT: The improvedPrompt MUST use markdown headings and the structured format shown above. This is a PRO feature.
suggestions should be 5 advanced, specific additions (10-20 words) to further enhance the prompt.`;

      const systemPrompt = plan === "pro" ? proSystemPrompt : freeSystemPrompt;

      try {
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Category: ${type}\n\nUser's prompt to enhance:\n${prompt}`
            },
          ],
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.4,
        });

        const content = completion.choices[0].message.content;
        if (!content) {
          throw new Error("No response from AI");
        }

        const result = JSON.parse(content);
        
        const responseData = {
          originalPrompt: prompt,
          improvedPrompt: result.improvedPrompt || "Could not generate prompt.",
          improvements: Array.isArray(result.improvements) ? result.improvements : [],
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        };

        // Increment usage count
        if (userId && user) {
          await storage.incrementUserPrompts(userId);

          storage.createOptimization({
            userId: userId,
            originalPrompt: prompt,
            improvedPrompt: responseData.improvedPrompt,
            category: type,
            improvements: responseData.improvements,
            suggestions: responseData.suggestions,
          }).catch(err => console.error("Failed to save history:", err));
        } else {
          // Anonymous user - increment session usage
          console.log(`[Usage] Incrementing session prompts for sessionId: ${sessionId}`);
          await storage.incrementSessionPrompts(sessionId);
          const updated = await storage.getSessionUsage(sessionId);
          console.log(`[Usage] After increment, usage: ${updated.promptsUsedToday}`);
        }

        res.json(responseData);
      } catch (openaiError: any) {
        console.error("OpenAI Error:", openaiError);
        res.status(500).json({ 
          message: "An error occurred during optimization. Please try again." 
        });
      }

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      console.error("Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  async function getOrCreatePrice(tier: "basic" | "pro"): Promise<string> {
    const existingPriceId = tier === "basic" ? STRIPE_BASIC_PRICE_ID : STRIPE_PRO_PRICE_ID;
    if (existingPriceId) {
      try {
        await stripe.prices.retrieve(existingPriceId);
        return existingPriceId;
      } catch {
      }
    }

    const productName = tier === "basic" ? "OptiPrompt Basic" : "OptiPrompt Pro";
    const productDesc = tier === "basic" ? "20 optimizations per day, 1000 characters" : "50 optimizations per day, 2000 characters";
    const priceAmount = PLAN_PRICES[tier].amount;

    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find(p => p.name === productName && p.active);

    if (!product) {
      product = await stripe.products.create({
        name: productName,
        description: productDesc,
      });
      console.log(`Created Stripe product ${tier}:`, product.id);
    }

    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    let price = prices.data.find(p => p.unit_amount === priceAmount && p.currency === "usd" && p.recurring?.interval === "month");

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceAmount,
        currency: "usd",
        recurring: { interval: "month" },
      });
      console.log(`Created Stripe price ${tier}:`, price.id);
    }

    return price.id;
  }

  app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const targetTier = (req.body?.tier || "pro") as "basic" | "pro";

      if (user.plan === "pro") {
        return res.status(400).json({ message: "You already have the Pro plan!" });
      }
      
      if (user.plan === "basic" && targetTier === "basic") {
        return res.status(400).json({ message: "You already have the Basic plan!" });
      }

      const priceId = await getOrCreatePrice(targetTier);

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
          userId: user.id,
          targetPlan: targetTier,
        },
      };

      if (user.stripeCustomerId) {
        sessionParams.customer = user.stripeCustomerId;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      res.json({ url: session.url });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      res.status(500).json({ message: "Could not start payment." });
    }
  });

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
        const targetPlan = (session.metadata?.targetPlan || "pro") as "basic" | "pro";
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const customerEmail = session.customer_details?.email || session.customer_email;

        console.log(`[Webhook] checkout.session.completed - userId: ${userId}, email: ${customerEmail}, plan: ${targetPlan}`);

        let upgraded = false;

        // Try to upgrade by userId first
        if (userId) {
          await storage.upgradeUser(userId, targetPlan, customerId, subscriptionId);
          console.log(`[Webhook] User ${userId} upgraded to ${targetPlan} via userId`);
          upgraded = true;
        }

        // Fallback: upgrade by email if userId didn't work
        if (!upgraded && customerEmail) {
          const userByEmail = await storage.getUserByEmail(customerEmail);
          if (userByEmail) {
            await storage.upgradeUser(userByEmail.id, targetPlan, customerId, subscriptionId);
            console.log(`[Webhook] User ${userByEmail.id} upgraded to ${targetPlan} via email: ${customerEmail}`);
            upgraded = true;
          } else {
            console.log(`[Webhook] No user found with email: ${customerEmail}`);
          }
        }

        if (!upgraded) {
          console.error(`[Webhook] FAILED to upgrade - no userId and no matching email. customerId: ${customerId}`);
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
        const invoice = event.data.object as any;
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
        if (subscriptionId) {
          await storage.downgradeUserToFree(subscriptionId);
          console.log(`Payment failed for subscription ${subscriptionId}, user downgraded`);
        }
        break;
      }
    }

    res.json({ received: true });
  });

  return httpServer;
}
