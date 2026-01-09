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
        stripeCustomerId: user.stripeCustomerId,
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

      const proSystemPrompt = `You are an expert Prompt Optimization Engine designed to transform rough, unclear, or unstructured user prompts into high-performance prompts for large language models.

Your sole objective is to produce the best possible version of the user's prompt, maximizing clarity, effectiveness, structure, and output quality.

CRITICAL RULE - DO NOT OVER-SPECIFY:
- The optimized prompt should give DIRECTION, not SOLUTIONS
- Leave room for the AI receiving the prompt to contribute ideas, suggestions, and creativity
- Do NOT include step-by-step instructions that solve the problem
- Do NOT fill in details the user didn't ask for
- The prompt should ASK the AI to provide steps/ideas, not TELL it what the steps are

WRONG APPROACH (too detailed):
"#### Instructions: 1. Define target audience 2. Write a script 3. Choose location..."

RIGHT APPROACH (gives direction, asks for expertise):
"#### Task: Help me create a professional promotional video for my app. Provide your recommended approach, key elements to include, and creative suggestions."

You must:
- Preserve the original intent of the user
- Improve precision and clarity
- Define WHAT the user wants, not HOW to do it
- Ask the AI to provide its expertise and suggestions
- Remove ambiguity and unnecessary wording

Do NOT:
- Change the user's goal
- Add step-by-step solutions
- Pre-solve the problem
- Include detailed instructions that leave nothing for the AI to contribute

OPTIMIZATION RULES:
1. Identify the task type (e.g. writing, planning, coding, marketing, analysis, creative)
2. Assign an appropriate expert role to the model
3. State the clear goal/objective
4. Ask the AI to provide its approach, recommendations, or suggestions
5. Specify desired output format (but not the content)
6. Add quality constraints only if they increase usefulness

MANDATORY PRO FORMAT:
### Role: [Expert Title]

#### Goal: [What the user wants to achieve]

#### Task: [Clear description of what help is needed - phrased as a REQUEST for the AI's expertise]

#### Output Format: [How the response should be structured - NOT the content]

#### Quality Criteria: [High-level requirements]

LANGUAGE HANDLING:
- Always keep the same language as the user's original prompt
- If the user mixes languages, default to the primary language used

OUTPUT FORMAT:
Respond in JSON with this exact structure:
{
  "improvedPrompt": "A prompt that gives clear direction but ASKS the AI for its expertise, ideas, and suggestions - NOT a pre-solved answer",
  "improvements": ["What you improved 1", "What you improved 2", "What you improved 3"],
  "suggestions": ["Advanced addition 1", "Advanced addition 2", "Advanced addition 3", "Advanced addition 4", "Advanced addition 5"]
}

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
      console.log(`Created Stripe subscription price for ${tier}:`, price.id);
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

  // Debug endpoint to check Stripe configuration
  app.get("/api/stripe/debug-config", async (req, res) => {
    const config = {
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasPortalConfigId: !!process.env.STRIPE_PORTAL_CONFIG_ID,
      portalConfigIdPreview: process.env.STRIPE_PORTAL_CONFIG_ID 
        ? `${process.env.STRIPE_PORTAL_CONFIG_ID.substring(0, 8)}...` 
        : null,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    };
    res.json(config);
  });

  app.post("/api/stripe/create-portal", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: "No active subscription found." });
      }

      const portalConfigId = process.env.STRIPE_PORTAL_CONFIG_ID;
      console.log(`[Portal] Creating portal session for customer: ${user.stripeCustomerId}`);
      console.log(`[Portal] Using configuration ID: ${portalConfigId || 'default (none set)'}`);

      const portalParams: any = {
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin || 'http://localhost:5000'}/`,
      };

      // Use custom portal configuration if set
      if (portalConfigId) {
        portalParams.configuration = portalConfigId;
      }

      const session = await stripe.billingPortal.sessions.create(portalParams);
      console.log(`[Portal] Session created successfully: ${session.url}`);

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe portal error:", err?.message || err);
      res.status(500).json({ message: "Could not open billing portal." });
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

  // ============================================
  // B2B CUSTOMER SUPPORT SYSTEM ROUTES
  // ============================================

  // Middleware to check if user is company admin
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as User;
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  }

  // Middleware to check if user belongs to a company
  function requireCompanyMember(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as User;
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (!user.companyId) return res.status(403).json({ message: "No company assigned" });
    next();
  }

  // Create a new company (and assign creator as admin)
  app.post("/api/b2b/companies", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { name } = req.body;
      
      if (!name) return res.status(400).json({ message: "Company name required" });
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      
      const existingCompany = await storage.getCompanyBySlug(slug);
      if (existingCompany) {
        return res.status(400).json({ message: "Company with this name already exists" });
      }
      
      const company = await storage.createCompany({ name, slug });
      
      // Create default policy for company
      await storage.createPolicy({ companyId: company.id });
      
      // Assign user as admin
      await storage.assignUserToCompany(user.id, company.id, "admin");
      
      res.json(company);
    } catch (err) {
      console.error("Error creating company:", err);
      res.status(500).json({ message: "Could not create company" });
    }
  });

  // Get current user's company
  app.get("/api/b2b/company", requireAuth, requireCompanyMember, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const company = await storage.getCompanyById(user.companyId!);
      res.json(company);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch company" });
    }
  });

  // Get company policy
  app.get("/api/b2b/policy", requireAuth, requireCompanyMember, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const policy = await storage.getPolicyByCompanyId(user.companyId!);
      res.json(policy);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch policy" });
    }
  });

  // Update company policy (admin only)
  app.put("/api/b2b/policy", requireAuth, requireCompanyMember, requireAdmin, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const policy = await storage.getPolicyByCompanyId(user.companyId!);
      
      if (!policy) return res.status(404).json({ message: "Policy not found" });
      
      const updated = await storage.updatePolicy(policy.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Could not update policy" });
    }
  });

  // Knowledge Blocks CRUD
  app.get("/api/b2b/knowledge", requireAuth, requireCompanyMember, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const blocks = await storage.getKnowledgeBlocksByCompanyId(user.companyId!);
      res.json(blocks);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch knowledge blocks" });
    }
  });

  app.post("/api/b2b/knowledge", requireAuth, requireCompanyMember, requireAdmin, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { title, content, category } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content required" });
      }
      
      const block = await storage.createKnowledgeBlock({
        companyId: user.companyId!,
        title,
        content,
        category,
      });
      res.json(block);
    } catch (err) {
      res.status(500).json({ message: "Could not create knowledge block" });
    }
  });

  app.delete("/api/b2b/knowledge/:id", requireAuth, requireCompanyMember, requireAdmin, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const blockId = parseInt(req.params.id);
      
      // Verify the knowledge block belongs to user's company (include inactive for validation)
      const blocks = await storage.getKnowledgeBlocksByCompanyId(user.companyId!, true);
      const block = blocks.find(b => b.id === blockId);
      
      if (!block) {
        return res.status(404).json({ message: "Knowledge block not found" });
      }
      
      await storage.deleteKnowledgeBlock(blockId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Could not delete knowledge block" });
    }
  });

  // ============================================
  // SUPPORT CASE PROCESSING (Core B2B Flow)
  // ============================================

  app.post("/api/b2b/cases", requireAuth, requireCompanyMember, rateLimit, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { customerMessage, caseType } = req.body;
      
      if (!customerMessage) {
        return res.status(400).json({ message: "Customer message required" });
      }

      // Get company policy and knowledge
      const policy = await storage.getPolicyByCompanyId(user.companyId!);
      const knowledge = await storage.getKnowledgeBlocksByCompanyId(user.companyId!);
      
      if (!policy) {
        return res.status(400).json({ message: "Company policy not configured" });
      }

      // Build knowledge context
      const knowledgeContext = knowledge.length > 0 
        ? knowledge.map(k => `[${k.title}]: ${k.content}`).join("\n\n")
        : "No company knowledge base available.";

      // Build policy context
      const policyContext = `
COMPANY POLICY:
- Tone: ${policy.tone}
- Address form: ${policy.addressForm}
- Emoji usage: ${policy.emojiUsage}
- Max response length: ${policy.maxResponseLength} words
- Forbidden actions: ${(policy.forbiddenActions as string[] || []).join(", ") || "None specified"}
- Forbidden language: ${(policy.forbiddenLanguage as string[] || []).join(", ") || "None specified"}
- Mandatory closing: ${policy.mandatoryClosing || "None"}
- Response structure: ${(policy.responseStructure as string[] || []).join(" → ")}
`.trim();

      // Master system prompt for classification and response
      const masterPrompt = `You are a customer support AI system. You process support cases in TWO STEPS.

STEP 1 - CLASSIFICATION (internal, do first):
Analyze the customer message and determine:
- category: What type of issue is this? (e.g., "billing", "technical", "product inquiry", "complaint", etc.)
- confidence: "high" if you clearly understand the issue, "low" if unclear
- riskLevel: "low" (simple question), "medium" (requires careful handling), "high" (legal, financial risk, angry customer)
- missingInfo: true if you need more information to respond properly
- aiAllowed: false if this should be handled by a human (high risk, complex legal, threatening)

STEP 2 - DECISION:
Based on classification:
- If riskLevel = "high" → decision = "escalate" (do NOT generate response)
- If confidence = "low" OR missingInfo = true → decision = "ask_more_info" (generate clarifying questions)
- Otherwise → decision = "respond" (generate full response)

STEP 3 - RESPONSE GENERATION:
Only generate a customer-facing response if decision is "respond" or "ask_more_info".
For "escalate", set generatedResponse to null.

${policyContext}

COMPANY KNOWLEDGE BASE:
${knowledgeContext}

CRITICAL RULES:
1. NEVER invent facts not in the knowledge base
2. NEVER promise things not in company policy
3. NEVER use forbidden language or actions
4. ALWAYS follow the response structure
5. ALWAYS use the correct tone and address form
6. ALWAYS end with mandatory closing if specified
7. Prefer safe clarification over guessing
8. Keep response under ${policy.maxResponseLength} words

Respond in JSON:
{
  "classification": {
    "category": "string",
    "confidence": "high" | "low",
    "riskLevel": "low" | "medium" | "high",
    "missingInfo": boolean,
    "aiAllowed": boolean
  },
  "decision": "respond" | "ask_more_info" | "escalate",
  "generatedResponse": "string or null if escalated",
  "internalNotes": "brief explanation of your decision"
}`;

      // Call OpenAI for classification and response
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: masterPrompt },
          { role: "user", content: `Customer message:\n${customerMessage}\n\nCase type hint: ${caseType || "Not specified"}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("No AI response");

      const aiResult = JSON.parse(content);

      // Determine case status
      let status: string;
      switch (aiResult.decision) {
        case "respond": status = "ready"; break;
        case "ask_more_info": status = "needs_info"; break;
        case "escalate": status = "escalated"; break;
        default: status = "pending";
      }

      // Save case to database
      const supportCase = await storage.createSupportCase({
        companyId: user.companyId!,
        agentId: user.id,
        customerMessage,
        caseType,
        classification: aiResult.classification,
        decision: aiResult.decision,
        generatedResponse: aiResult.generatedResponse,
        status,
      });

      res.json({
        caseId: supportCase.id,
        status,
        decision: aiResult.decision,
        classification: aiResult.classification,
        generatedResponse: aiResult.generatedResponse,
        internalNotes: aiResult.internalNotes,
      });

    } catch (err) {
      console.error("Support case error:", err);
      res.status(500).json({ message: "Could not process support case" });
    }
  });

  // Get case history for company
  app.get("/api/b2b/cases", requireAuth, requireCompanyMember, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const cases = await storage.getSupportCasesByCompanyId(user.companyId!);
      res.json(cases);
    } catch (err) {
      res.status(500).json({ message: "Could not fetch cases" });
    }
  });

  // Get user's B2B status (company info, role)
  app.get("/api/b2b/status", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      
      if (!user.companyId) {
        return res.json({
          hasCompany: false,
          company: null,
          role: null,
        });
      }
      
      const company = await storage.getCompanyById(user.companyId);
      res.json({
        hasCompany: true,
        company,
        role: user.role,
      });
    } catch (err) {
      res.status(500).json({ message: "Could not fetch B2B status" });
    }
  });

  return httpServer;
}
