import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import Stripe from "stripe";
import { PLAN_LIMITS, CHARACTER_LIMITS, PLAN_PRICES, type User, type PlanType, optimizeRequestSchema } from "@shared/schema";
import { setupAuth, requireAuth, requirePro } from "./auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
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
    return res.status(429).json({ message: "För många anrop. Vänta en minut." });
  }
  userLimit.count++;
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
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
        return res.json({ plan: "free", promptsUsedToday: sessionData.promptsUsedToday, promptsRemaining: Math.max(0, PLAN_LIMITS.free - sessionData.promptsUsedToday), dailyLimit: PLAN_LIMITS.free, isLoggedIn: false, resetTime });
      }
      const user = await storage.getUserById(userId);
      if (!user) {
        const sessionData = await storage.getSessionUsage(sessionId);
        return res.json({ plan: "free", promptsUsedToday: sessionData.promptsUsedToday, promptsRemaining: Math.max(0, PLAN_LIMITS.free - sessionData.promptsUsedToday), dailyLimit: PLAN_LIMITS.free, isLoggedIn: false, resetTime });
      }
      const plan = (user.plan || "free") as PlanType;
      res.json({ plan, promptsUsedToday: user.promptsUsedToday || 0, promptsRemaining: Math.max(0, PLAN_LIMITS[plan] - (user.promptsUsedToday || 0)), dailyLimit: PLAN_LIMITS[plan], isLoggedIn: true, resetTime, stripeCustomerId: user.stripeCustomerId, username: user.username });
    } catch (err) { res.status(500).json({ message: "Fel vid hämtning av status" }); }
  });

  app.post(api.optimize.path, rateLimit, async (req, res) => {
    try {
      const userId = req.session?.userId;
      const sessionId = req.sessionID;
      let user: User | null = null;
      if (userId) user = await storage.getUserById(userId);

      const plan = (user?.plan as PlanType) || "free";
      const dailyLimit = PLAN_LIMITS[plan];
      let promptsUsedToday = user ? (user.promptsUsedToday || 0) : (await storage.getSessionUsage(sessionId)).promptsUsedToday;

      if (promptsUsedToday >= dailyLimit) {
        return res.status(403).json({ message: plan === "free" ? "Dina 2 gratis-beskrivningar är slut för idag." : "Dagsgräns nådd.", limitReached: true, plan });
      }

      // HÄMTA DATA INKL PLATFORM
      const { prompt, type, platform } = optimizeRequestSchema.parse(req.body);

      const knowledgeBase = {
        expertExamples: [
          { tag: "Sekelskifte", text: "Tidstypiska attribut såsom högresta fönsterpartier, djupa nischer och en generös takhöjd som skapar en magnifik rymd. Fiskbensparketten flyter tröskelfritt och binder samman de sociala rummen på ett smakfullt sätt." },
          { tag: "Modern/Minimalistisk", text: "Stilren estetik möter funktion i en symbios av betong, glas och ljust trä. Den öppna planlösningen och de sobra färgvalen skapar ett lugn, där varje kvadratmeter är optimerad för ett modernt liv." },
          { tag: "Familjevilla", text: "En trygg hamn för familjelivet med välplanerade sociala ytor och en trädgård som bjuder in till lek och sena grillkvällar. Här är varje detalj genomtänkt för att underlätta vardagen." }
        ],
        forbiddenPhrases: ["unikt tillfälle", "magisk", "drömboende", "hjärtat i hemmet", "måste ses"]
      };

      // PLATFORMSSPECIFIK INSTRUKTION
      const platformInstruction = platform === "hemnet" 
        ? "ANPASSNING FÖR HEMNET: Upprepa INTE fakta som boarea, antal rum eller våning i brödtexten. Denna info finns redan i faktarutan. Fokusera 100% på känsla och material." 
        : "ANPASSNING FÖR EGEN SIDA: Väv in fakta om boarea, antal rum och våning naturligt i texten för en komplett fristående presentation.";

      const masterSystemPrompt = `Du är Sveriges främsta fastighetsmäklare. Skriv säljande och elegant.
      ${platformInstruction}
      STIL: Undvik klyschor som ${knowledgeBase.forbiddenPhrases.join(", ")}. Inspireras av: ${knowledgeBase.expertExamples.map(e => e.text).join(" ")}`;

      const proInstruction = `PRO: Kontrollera om juridisk info (Pantsättning, Driftskostnad) saknas och flagga i 'suggestions'. Inkludera en kort 'Marketing Hook' först.`;

      const finalSystemPrompt = `${masterSystemPrompt} ${plan === "pro" ? proInstruction : "Ge 3 stylingtips i 'suggestions'."} Svara strikt JSON.`;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: finalSystemPrompt }, { role: "user", content: `Typ: ${type}\nData: ${prompt}` }],
        model: plan === "pro" ? "gpt-4o" : "gpt-4o-mini",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      const responseData = { originalPrompt: prompt, improvedPrompt: result.improvedPrompt, improvements: result.improvements || [], suggestions: result.suggestions || [] };

      if (userId && user) {
        await storage.incrementUserPrompts(userId);
        await storage.createOptimization({ userId, originalPrompt: prompt, improvedPrompt: responseData.improvedPrompt, category: type, improvements: responseData.improvements, suggestions: responseData.suggestions });
      } else { await storage.incrementSessionPrompts(sessionId); }

      res.json(responseData);
    } catch (err) { res.status(500).json({ message: "Genereringsfel" }); }
  });

  return httpServer;
}