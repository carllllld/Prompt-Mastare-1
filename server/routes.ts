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

  // ============ TEAM COLLABORATION ROUTES ============

  // Get user's teams
  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teams = await storage.getUserTeams(user.id);
      res.json(teams);
    } catch (err) {
      console.error("Error getting teams:", err);
      res.status(500).json({ message: "Could not fetch teams" });
    }
  });

  // Create a new team
  app.post("/api/teams", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { name } = req.body;
      
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Team name is required" });
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existing = await storage.getTeamBySlug(slug);
      if (existing) {
        return res.status(400).json({ message: "A team with this name already exists" });
      }

      const team = await storage.createTeam({
        name: name.trim(),
        slug,
        ownerId: user.id,
      });

      await storage.addTeamMember({
        teamId: team.id,
        userId: user.id,
        role: "owner",
      });

      res.status(201).json(team);
    } catch (err) {
      console.error("Error creating team:", err);
      res.status(500).json({ message: "Could not create team" });
    }
  });

  // Get a specific team
  app.get("/api/teams/:teamId", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      const team = await storage.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json(team);
    } catch (err) {
      console.error("Error getting team:", err);
      res.status(500).json({ message: "Could not fetch team" });
    }
  });

  // Get team members
  app.get("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      const members = await storage.getTeamMembers(teamId);
      const safeMembers = members.map(m => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: {
          id: m.user.id,
          email: m.user.email,
          displayName: m.user.displayName,
          avatarColor: m.user.avatarColor,
        }
      }));

      res.json(safeMembers);
    } catch (err) {
      console.error("Error getting team members:", err);
      res.status(500).json({ message: "Could not fetch team members" });
    }
  });

  // Invite a member to team
  app.post("/api/teams/:teamId/invite", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.teamId);
      const { email } = req.body;

      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        return res.status(403).json({ message: "Only admins and owners can invite members" });
      }

      const invite = await storage.createTeamInvite(teamId, email.trim().toLowerCase(), user.id);
      res.status(201).json({ token: invite.token, expiresAt: invite.expiresAt });
    } catch (err) {
      console.error("Error creating invite:", err);
      res.status(500).json({ message: "Could not create invite" });
    }
  });

  // Accept team invite
  app.post("/api/teams/join/:token", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { token } = req.params;

      const invite = await storage.getInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found or expired" });
      }

      if (new Date() > invite.expiresAt) {
        await storage.deleteInvite(invite.id);
        return res.status(400).json({ message: "This invite has expired" });
      }

      const existing = await storage.getUserTeamMembership(user.id, invite.teamId);
      if (existing) {
        await storage.deleteInvite(invite.id);
        return res.status(400).json({ message: "You are already a member of this team" });
      }

      await storage.addTeamMember({
        teamId: invite.teamId,
        userId: user.id,
        role: "member",
      });

      await storage.deleteInvite(invite.id);

      const team = await storage.getTeamById(invite.teamId);
      res.json(team);
    } catch (err) {
      console.error("Error accepting invite:", err);
      res.status(500).json({ message: "Could not join team" });
    }
  });

  // ============ SHARED PROMPTS ROUTES ============

  // Get team's shared prompts
  app.get("/api/teams/:teamId/prompts", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      const prompts = await storage.getTeamSharedPrompts(teamId);
      res.json(prompts);
    } catch (err) {
      console.error("Error getting shared prompts:", err);
      res.status(500).json({ message: "Could not fetch prompts" });
    }
  });

  // Create a shared prompt
  app.post("/api/teams/:teamId/prompts", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.teamId);
      const { title, content, category } = req.body;

      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const prompt = await storage.createSharedPrompt({
        teamId,
        creatorId: user.id,
        title: title.trim(),
        content: content.trim(),
        category: category || "General",
        status: "draft",
      });

      res.status(201).json(prompt);
    } catch (err) {
      console.error("Error creating shared prompt:", err);
      res.status(500).json({ message: "Could not create prompt" });
    }
  });

  // Get a specific shared prompt
  app.get("/api/prompts/:promptId", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.promptId);
      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      res.json(prompt);
    } catch (err) {
      console.error("Error getting prompt:", err);
      res.status(500).json({ message: "Could not fetch prompt" });
    }
  });

  // Update a shared prompt
  app.patch("/api/prompts/:promptId", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.promptId);
      const { title, content, category, optimizedContent, status } = req.body;

      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      if (prompt.isLocked && prompt.lockedBy !== user.id) {
        return res.status(423).json({ message: "This prompt is being edited by someone else" });
      }

      const updated = await storage.updateSharedPrompt(promptId, {
        ...(title && { title }),
        ...(content && { content }),
        ...(category && { category }),
        ...(optimizedContent !== undefined && { optimizedContent }),
        ...(status && { status }),
      });

      res.json(updated);
    } catch (err) {
      console.error("Error updating prompt:", err);
      res.status(500).json({ message: "Could not update prompt" });
    }
  });

  // Lock a prompt for editing
  app.post("/api/prompts/:promptId/lock", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.promptId);

      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      if (prompt.isLocked && prompt.lockedBy !== user.id) {
        const lockAge = prompt.lockedAt ? Date.now() - new Date(prompt.lockedAt).getTime() : 0;
        if (lockAge < 5 * 60 * 1000) {
          return res.status(423).json({ message: "This prompt is being edited by someone else" });
        }
      }

      const locked = await storage.lockPrompt(promptId, user.id);
      res.json(locked);
    } catch (err) {
      console.error("Error locking prompt:", err);
      res.status(500).json({ message: "Could not lock prompt" });
    }
  });

  // Unlock a prompt
  app.post("/api/prompts/:promptId/unlock", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.promptId);

      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      if (prompt.lockedBy !== user.id) {
        const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
        if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
          return res.status(403).json({ message: "Only the lock holder or admins can unlock" });
        }
      }

      const unlocked = await storage.unlockPrompt(promptId);
      res.json(unlocked);
    } catch (err) {
      console.error("Error unlocking prompt:", err);
      res.status(500).json({ message: "Could not unlock prompt" });
    }
  });

  // Delete a shared prompt
  app.delete("/api/prompts/:promptId", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.promptId);

      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      if (prompt.creatorId !== user.id && membership.role !== "owner" && membership.role !== "admin") {
        return res.status(403).json({ message: "Only the creator or admins can delete" });
      }

      await storage.deleteSharedPrompt(promptId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting prompt:", err);
      res.status(500).json({ message: "Could not delete prompt" });
    }
  });

  // ============ COMMENTS ROUTES ============

  // Get comments for a prompt
  app.get("/api/prompts/:promptId/comments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.promptId);

      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      const comments = await storage.getPromptComments(promptId);
      const safeComments = comments.map(c => ({
        id: c.id,
        promptId: c.promptId,
        userId: c.userId,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user: {
          id: c.user.id,
          email: c.user.email,
          displayName: c.user.displayName,
          avatarColor: c.user.avatarColor,
        }
      }));

      res.json(safeComments);
    } catch (err) {
      console.error("Error getting comments:", err);
      res.status(500).json({ message: "Could not fetch comments" });
    }
  });

  // Add a comment
  app.post("/api/prompts/:promptId/comments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.promptId);
      const { content } = req.body;

      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      const comment = await storage.createComment({
        promptId,
        userId: user.id,
        content: content.trim(),
      });

      res.status(201).json(comment);
    } catch (err) {
      console.error("Error creating comment:", err);
      res.status(500).json({ message: "Could not create comment" });
    }
  });

  // Delete a comment
  app.delete("/api/comments/:commentId", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const commentId = parseInt(req.params.commentId);

      if (isNaN(commentId)) {
        return res.status(400).json({ message: "Invalid comment ID" });
      }

      await storage.deleteComment(commentId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting comment:", err);
      res.status(500).json({ message: "Could not delete comment" });
    }
  });

  // ============ PRESENCE ROUTES ============

  // Update presence
  app.post("/api/presence", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { teamId, promptId, cursorPosition } = req.body;

      await storage.updatePresence(
        user.id,
        teamId || null,
        promptId || null,
        cursorPosition
      );

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating presence:", err);
      res.status(500).json({ message: "Could not update presence" });
    }
  });

  // Get prompt presence
  app.get("/api/prompts/:promptId/presence", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.promptId);

      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }

      const presence = await storage.getPromptPresence(promptId);
      const safePresence = presence.map(p => ({
        userId: p.userId,
        lastSeen: p.lastSeen,
        cursorPosition: p.cursorPosition,
        user: {
          id: p.user.id,
          email: p.user.email,
          displayName: p.user.displayName,
          avatarColor: p.user.avatarColor,
        }
      }));

      res.json(safePresence);
    } catch (err) {
      console.error("Error getting presence:", err);
      res.status(500).json({ message: "Could not fetch presence" });
    }
  });

  // User profile update
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { displayName, avatarColor } = req.body;

      const updated = await storage.updateUserProfile(user.id, {
        ...(displayName !== undefined && { displayName }),
        ...(avatarColor !== undefined && { avatarColor }),
      });

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        avatarColor: updated.avatarColor,
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: "Could not update profile" });
    }
  });

  return httpServer;
}
