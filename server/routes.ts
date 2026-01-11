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

      // --- KNOWLEDGE BASE: EXPERT-EXEMPEL & JURIDIK ---
      const knowledgeBase = {
        expertExamples: [
          { tag: "Sekelskifte", text: "Tidstypiska attribut såsom högresta fönsterpartier, djupa nischer och en generös takhöjd som skapar en magnifik rymd. Fiskbensparketten flyter tröskelfritt och binder samman de sociala rummen på ett smakfullt sätt." },
          { tag: "Modern/Minimalistisk", text: "Stilren estetik möter funktion i en symbios av betong, glas och ljust trä. Den öppna planlösningen och de sobra färgvalen skapar ett lugn, där varje kvadratmeter är optimerad för ett modernt liv." },
          { tag: "Vindsvåning", text: "Här bor ni högt ovan takåsarna med synliga takbalkar och murstockar som ger karaktär. Terrassen blir ett extra rum under sommarmånaderna, en privat oas mitt i citypulsen." },
          { tag: "Sjöutsikt/Natur", text: "Stora fönsterpartier suddar ut gränsen mellan ute och inne, där glittrande vatten och lummig grönska blir en levande tavla som förändras med årstiderna." },
          { tag: "Familjevilla", text: "En trygg hamn för familjelivet med välplanerade sociala ytor och en trädgård som bjuder in till lek och sena grillkvällar. Här är varje detalj genomtänkt för att underlätta vardagen." },
          { tag: "Kök/Bad", text: "Köket är en dröm för den matintresserade med maskinell utrustning i toppklass och bänkskivor i natursten. Badrummet är en privat spa-avdelning med hotellkänsla och påkostade materialval." }
        ],
        legalFramework: {
          general: "Enligt Fastighetsmäklarlagen (2021:516) ska beskrivningen vara korrekt och inte vilseledande. Boarea ska alltid anges med källa (ex. Fastighetsutdrag).",
          apartment: "Obligatoriskt för BRF: Årsavgift, andelstal, pantsättning samt indirekt nettoskuldsättning (viktigt för köparens ekonomi).",
          house: "Obligatoriskt för Villa: Energiprestanda, taxeringsvärde, fastighetsbeteckning och aktuella driftskostnader (el, VA, renhållning)."
        },
        forbiddenPhrases: [
          "unikt tillfälle", "magisk", "drömboende", "hjärtat i hemmet", "måste ses", 
          "fantastisk chans", "enastående", "varmt välkomna (som inledning)"
        ]
      };

      // --- DEN AVANCERADE MASTER-PROMPTEN ---
      const masterSystemPrompt = `Du är Sveriges främsta fastighetsmäklare och expert-copywriter. 
      Din specialitet är att skriva säljande, förtroendeingivande och språkligt eleganta texter för premiumobjekt.

      INSTRUKTIONER FÖR TEXTEN:
      1. ANALYS: Hitta 3 unika USP:er i datan. Fokusera på ljus, rymd och materialval.
      2. SPRÅK: Använd ett varierat, rikt språk. Undvik upprepningar. Starta aldrig tre meningar i rad med samma ord.
      3. NEGATIV PROMPT: Använd ALDRIG dessa klyschor: ${knowledgeBase.forbiddenPhrases.join(", ")}.
      4. STIL-INSPIRATION: Inspireras av dessa strukturer: ${knowledgeBase.expertExamples.map(e => e.text).join(" | ")}.

      JURIDISK KONTROLL (FMI-STANDARD):
      - Du får aldrig hitta på fakta. Om information saknas, utelämna det i texten men flagga för det i 'suggestions'.
      - Granska mot: ${type === 'apartment' ? knowledgeBase.legalFramework.apartment : knowledgeBase.legalFramework.house}
      - Var noga med källa för boarea.`;

      const proInstruction = `
      PRO-FUNKTIONALITET (EXTRA NOGGRANNHET):
      - Agenta som juridisk granskare: Kontrollera om Pantsättning, Indirekt nettoskuldsättning (för BRF) eller Driftskostnader (för Villa) saknas. Om de saknas, skriv 'VARNING: Saknar [info]' i suggestions.
      - Inkludera en kort 'Marketing Hook' i början av beskrivningen (max 10 ord) som sticker ut på Hemnet.
      - Ge 2 tips på målgruppsanpassning (t.ex. 'Passar den unga karriäristen' eller 'Perfekt för barnfamiljen').`;

      const finalSystemPrompt = `${masterSystemPrompt}
      ${plan === "pro" ? proInstruction : "I fältet 'suggestions', ge 3 korta stylingtips för att höja värdet inför fotografering."}

      Svara ENDAST i JSON-format:
      {
        "improvedPrompt": "DIN PROFESSIONELLA TEXT HÄR (inkl. rubrik, ingress, interiör)",
        "improvements": ["Lista på 3 språkliga val du gjort för att höja kvaliteten"],
        "suggestions": ["Juridiska varningar (PRO) eller Stylingtips (FREE)"]
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: `TYP: ${type}\nINDATA: ${prompt}` },
        ],
        model: plan === "pro" ? "gpt-4o" : "gpt-4o-mini", 
        response_format: { type: "json_object" },
        temperature: 0.65, // Balans mellan kreativitet och exakthet
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      const responseData = {
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt || "Kunde inte generera text.",
        improvements: Array.isArray(result.improvements) ? result.improvements : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      };

      // Spara till databas
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

    } catch (err) {
      console.error("Genereringsfel:", err);
      res.status(500).json({ message: "Kunde inte generera text. Kontrollera din API-nyckel." });
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