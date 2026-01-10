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

  setupAuth(app);

  function getNextResetTime(timezoneOffset?: number): string {
    const now = new Date();
    if (timezoneOffset === undefined) {
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    }
    const localNow = new Date(now.getTime() - timezoneOffset * 60000);
    const localMidnight = new Date(localNow);
    localMidnight.setUTCHours(24, 0, 0, 0);
    const realMidnight = new Date(localMidnight.getTime() + timezoneOffset * 60000);
    return realMidnight.toISOString();
  }

  app.get("/api/user/status", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const sessionId = req.sessionID;
      const tzOffset = req.query.tz ? parseInt(req.query.tz as string, 10) : undefined;
      const resetTime = getNextResetTime(tzOffset);

      if (!userId) {
        const sessionData = await storage.getSessionUsage(sessionId);
        return res.json({
          plan: "free",
          promptsUsedToday: sessionData.promptsUsedToday,
          promptsRemaining: Math.max(0, PLAN_LIMITS.free - sessionData.promptsUsedToday),
          dailyLimit: PLAN_LIMITS.free,
          isLoggedIn: false,
          resetTime,
        });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        const sessionData = await storage.getSessionUsage(sessionId);
        return res.json({
          plan: "free",
          promptsUsedToday: sessionData.promptsUsedToday,
          promptsRemaining: Math.max(0, PLAN_LIMITS.free - sessionData.promptsUsedToday),
          dailyLimit: PLAN_LIMITS.free,
          isLoggedIn: false,
          resetTime,
        });
      }

      const plan = (user.plan || "free") as PlanType;
      const dailyLimit = PLAN_LIMITS[plan];

      res.json({
        plan,
        promptsUsedToday: user.promptsUsedToday || 0,
        promptsRemaining: Math.max(0, dailyLimit - (user.promptsUsedToday || 0)),
        dailyLimit,
        isLoggedIn: true,
        resetTime,
        stripeCustomerId: user.stripeCustomerId,
        username: user.username
      });
    } catch (err) {
      console.error("Mätar-fel i routes:", err);
      res.status(500).json({ message: "Could not fetch user status" });
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

      let promptsUsedToday = user ? (user.promptsUsedToday || 0) : (await storage.getSessionUsage(sessionId)).promptsUsedToday;

      if (promptsUsedToday >= dailyLimit) {
        return res.status(403).json({
          message: plan === "free" ? "Du har använt dina 2 gratis-beskrivningar för idag." : "Dagsgräns nådd.",
          limitReached: true,
          plan,
        });
      }

      const { prompt, type } = api.optimize.input.parse(req.body);

      const freeSystemPrompt = `Du är en expertmäklare. Skriv en säljande Hemnet-annons på svenska baserat på fakta. Svara i JSON med fälten: improvedPrompt (sträng), improvements (array), suggestions (array).`;
      const proSystemPrompt = `Du är Sveriges främsta mäklare. Skriv en exklusiv, emotionell Hemnet-annons med rubrik, ingress och interiörbeskrivning. Svara i JSON med fälten: improvedPrompt (sträng), improvements (array), suggestions (array).`;

      const systemPrompt = plan === "pro" ? proSystemPrompt : freeSystemPrompt;

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Kategori: ${type}\nFakta: ${prompt}` },
        ],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
      });

      // --- HÄR ÄR FIXEN ---
      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // Vi tvingar improvedPrompt att bli en textsträng oavsett vad AI:n skickar
      let finalText = "";
      if (typeof result.improvedPrompt === 'object' && result.improvedPrompt !== null) {
        // Om AI:n skickade ett objekt, slå ihop innehållet till en snygg text
        finalText = Object.values(result.improvedPrompt).join('\n\n');
      } else {
        // Annars använd det som en vanlig sträng
        finalText = String(result.improvedPrompt || "Kunde inte generera text.");
      }

      const responseData = {
        originalPrompt: prompt,
        improvedPrompt: finalText,
        improvements: Array.isArray(result.improvements) ? result.improvements : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      };

      if (userId && user) {
        await storage.incrementUserPrompts(userId);
        await storage.createOptimization({
          userId,
          originalPrompt: responseData.originalPrompt,
          improvedPrompt: responseData.improvedPrompt,
          category: type,
          improvements: responseData.improvements,
          suggestions: responseData.suggestions,
        });
      } else {
        await storage.incrementSessionPrompts(sessionId);
      }

      res.json(responseData);
      // --- SLUT PÅ FIX ---

    } catch (err) {
      console.error("Genereringsfel:", err);
      res.status(500).json({ message: "Kunde inte generera text." });
    }
  });

  // --- Övriga routes (Stripe & Teams) behålls men rensas på displayName ---
  app.get("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const members = await storage.getTeamMembers(teamId);
      res.json(members.map(m => ({
        id: m.id,
        role: m.role,
        user: { id: m.user.id, username: m.user.username } // Ändrat från displayName
      })));
    } catch (e) { res.status(500).send(); }
  });

  // ... (Behåll resten av din Stripe-logik här nedanför precis som den var)

  return httpServer;
}